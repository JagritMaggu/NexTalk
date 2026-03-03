import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send a message in a conversation
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        fileStorageId: v.optional(v.id("_storage")),
        fileType: v.optional(v.string()),
        parentMessageId: v.optional(v.id("messages")),
    },
    handler: async (ctx, { conversationId, content, fileStorageId, fileType, parentMessageId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        // Verify the user is a participant in this conversation
        const conversation = await ctx.db.get(conversationId);
        if (!conversation) throw new Error("Conversation not found");
        if (!conversation.participantIds.includes(currentUser._id)) {
            throw new Error("Not a participant in this conversation");
        }

        if (conversation.isDeleted) {
            throw new Error("This group no longer exists");
        }

        // Feature: Blocking - Prevent messaging in blocked DMs
        if (!conversation.isGroup) {
            const otherUserId = conversation.participantIds.find(id => id !== currentUser._id);
            if (otherUserId) {
                // Check if I blocked them
                const iBlockedThem = await ctx.db
                    .query("blocks")
                    .withIndex("by_blockerId_blockedId", (q) =>
                        q.eq("blockerId", currentUser._id).eq("blockedId", otherUserId)
                    )
                    .unique();
                if (iBlockedThem) throw new Error("You have blocked this contact. Unblock to send messages.");

                // Check if they blocked me
                const theyBlockedMe = await ctx.db
                    .query("blocks")
                    .withIndex("by_blockerId_blockedId", (q) =>
                        q.eq("blockerId", otherUserId).eq("blockedId", currentUser._id)
                    )
                    .unique();
                if (theyBlockedMe) throw new Error("This contact has blocked you.");
            }
        }

        // Insert the message
        const messageId = await ctx.db.insert("messages", {
            conversationId,
            senderId: currentUser._id,
            content: content.trim(),
            isDeleted: false,
            fileStorageId,
            fileType,
            deliveredAt: Date.now(),
            parentMessageId,
        });

        // Update conversation's lastMessageId for sidebar preview
        await ctx.db.patch(conversationId, { lastMessageId: messageId });

        // Clear the typing indicator for this user
        const typingRecord = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q
                    .eq("conversationId", conversationId)
                    .eq("userId", currentUser._id)
            )
            .unique();
        if (typingRecord) {
            await ctx.db.delete(typingRecord._id);
        }

        return messageId;
    },
});

// Get all messages in a conversation (real-time with Convex subscriptions)
export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return [];

        // Verify participant
        const conversation = await ctx.db.get(conversationId);
        if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
            return [];
        }

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", conversationId)
            )
            .order("asc")
            .collect();

        // Fetch all members to get their progress
        const members = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
            .collect();

        // Pre-fetch the creation times of the last seen messages for all other members
        const memberReadProgress = await Promise.all(
            members
                .filter(m => m.userId !== currentUser._id)
                .map(async (m) => {
                    if (!m.lastSeenMessageId) return 0;
                    const lastMsg = await ctx.db.get(m.lastSeenMessageId);
                    return lastMsg?._creationTime || 0;
                })
        );

        // A message is "readByAll" if its creationTime is <= the creationTime 
        // of EVERY other member's last seen message.
        const minReadTime = memberReadProgress.length > 0 ? Math.min(...memberReadProgress) : 0;

        // Enrich messages
        const enrichedMessages = await Promise.all(
            messages.map(async (message) => {
                const sender = await ctx.db.get(message.senderId);
                const reactions = await ctx.db
                    .query("reactions")
                    .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
                    .collect();

                const counts: Record<string, number> = {};
                reactions.forEach((r) => {
                    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
                });
                const reactionCounts = Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
                const myReactions = reactions.filter((r) => r.userId === currentUser._id).map((r) => r.emoji);

                let fileUrl = null;
                if (message.fileStorageId) {
                    fileUrl = await ctx.storage.getUrl(message.fileStorageId);
                }

                // Fetch parent message details if it exists (Quoted Replies)
                let parentMessage = null;
                if (message.parentMessageId) {
                    const parent = await ctx.db.get(message.parentMessageId);
                    if (parent) {
                        const parentSender = await ctx.db.get(parent.senderId);
                        parentMessage = {
                            content: parent.isDeleted ? "Message deleted" : parent.content,
                            senderName: parentSender?.name || "Unknown",
                            id: parent._id,
                        };
                    }
                }

                return {
                    ...message,
                    sender,
                    reactionCounts,
                    myReactions,
                    fileUrl,
                    isMe: message.senderId === currentUser._id,
                    // True if participants have seen past this message's creation time
                    readByAll: memberReadProgress.length > 0 && message._creationTime <= minReadTime,
                    parentMessage,
                };
            })
        );

        return enrichedMessages;
    },
});

// Soft delete a message (Feature 11)
export const deleteMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, { messageId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");

        // Only the sender can delete their own message
        if (message.senderId !== currentUser._id) {
            throw new Error("Cannot delete another user's message");
        }

        // Soft delete — keep the record, just mark it
        await ctx.db.patch(messageId, { isDeleted: true });

        // Delete all reactions linked to this message when it is deleted
        const reactions = await ctx.db
            .query("reactions")
            .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
            .collect();

        for (const reaction of reactions) {
            await ctx.db.delete(reaction._id);
        }
    },
});

// Edit a message (Feature: Controlled Window)
export const editMessage = mutation({
    args: {
        messageId: v.id("messages"),
        newContent: v.string(),
    },
    handler: async (ctx, { messageId, newContent }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");

        // Safety checks
        if (message.senderId !== currentUser._id) {
            throw new Error("Cannot edit another user's message");
        }
        if (message.isDeleted) {
            throw new Error("Cannot edit a deleted message");
        }

        // Window check: Only within 5 minutes (300,000 ms)
        const fiveMinutes = 5 * 60 * 1000;
        const now = Date.now();
        if (now - message._creationTime > fiveMinutes) {
            throw new Error("Editing window (5 mins) has expired");
        }

        await ctx.db.patch(messageId, {
            content: newContent.trim(),
            isEdited: true,
            editedAt: now,
        });
    },
});

// Mark a conversation as read (clears unread count - Feature 9)
export const markConversationAsRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return;

        // Get the latest message in the conversation
        const latestMessage = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", conversationId)
            )
            .order("desc")
            .first();

        if (!latestMessage) return;

        // Update lastSeenMessageId for this user in this conversation
        const memberRecord = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q
                    .eq("conversationId", conversationId)
                    .eq("userId", currentUser._id)
            )
            .unique();

        if (memberRecord) {
            await ctx.db.patch(memberRecord._id, {
                lastSeenMessageId: latestMessage._id,
            });
        }
    },
});

export const getMediaCount = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.neq(q.field("fileStorageId"), undefined))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .collect();

        return messages.length;
    },
});

export const getSharedMedia = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.neq(q.field("fileStorageId"), undefined))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .order("desc")
            .collect();

        return await Promise.all(
            messages.map(async (msg) => {
                const url = msg.fileStorageId ? await ctx.storage.getUrl(msg.fileStorageId) : null;
                return {
                    _id: msg._id,
                    _creationTime: msg._creationTime,
                    url,
                    fileType: msg.fileType,
                    content: msg.content,
                };
            })
        );
    },
});

export const togglePinMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, { messageId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const message = await ctx.db.get(messageId);
        if (!message) throw new Error("Message not found");

        const conversation = await ctx.db.get(message.conversationId);
        if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
            throw new Error("Not a participant in this conversation");
        }

        const isPinned = !message.isPinned;
        await ctx.db.patch(messageId, {
            isPinned,
            pinnedAt: isPinned ? Date.now() : undefined,
        });

        return { isPinned };
    },
});

export const getPinnedMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.eq(q.field("isPinned"), true))
            .collect();

        return messages.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
    },
});
