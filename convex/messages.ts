import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send a message in a conversation
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        fileStorageId: v.optional(v.id("_storage")),
        fileType: v.optional(v.string()),
    },
    handler: async (ctx, { conversationId, content, fileStorageId, fileType }) => {
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

        // Insert the message
        const messageId = await ctx.db.insert("messages", {
            conversationId,
            senderId: currentUser._id,
            content: content.trim(),
            isDeleted: false,
            fileStorageId,
            fileType,
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

        // Enrich messages with sender details and reactions
        const enrichedMessages = await Promise.all(
            messages.map(async (message) => {
                const sender = await ctx.db.get(message.senderId);

                // Fetch reactions for this message
                const reactions = await ctx.db
                    .query("reactions")
                    .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
                    .collect();

                // Group reactions by emoji with counts
                const reactionCounts = reactions.reduce(
                    (acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                    },
                    {} as Record<string, number>
                );

                // Check if current user reacted to this message
                const myReactions = reactions
                    .filter((r) => r.userId === currentUser._id)
                    .map((r) => r.emoji);

                // Get file URL if there's an attachment
                let fileUrl = null;
                if (message.fileStorageId) {
                    fileUrl = await ctx.storage.getUrl(message.fileStorageId);
                }

                return {
                    ...message,
                    sender,
                    reactionCounts,
                    myReactions,
                    fileUrl,
                    isMe: message.senderId === currentUser._id,
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
