import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or get an existing 1-on-1 conversation between two users
export const createOrGetConversation = mutation({
    args: {
        otherUserId: v.id("users"),
    },
    handler: async (ctx, { otherUserId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Get the current user's Convex doc
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        // Look for an existing 1-on-1 conversation between both users
        // We check: not a group, and both users are participants
        const allConversations = await ctx.db.query("conversations").collect();
        const existing = allConversations.find(
            (c) =>
                !c.isGroup &&
                c.participantIds.length === 2 &&
                c.participantIds.includes(currentUser._id) &&
                c.participantIds.includes(otherUserId)
        );

        if (existing) return existing._id;

        // Create a new DM conversation
        const conversationId = await ctx.db.insert("conversations", {
            participantIds: [currentUser._id, otherUserId],
            isGroup: false,
        });

        // Create conversationMembers entries for both users
        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: currentUser._id,
        });
        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: otherUserId,
        });

        return conversationId;
    },
});

// Get all conversations for the current user with the latest message preview
export const getMyConversations = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return [];

        // Find all conversationMembers records for this user
        const memberRecords = await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        const conversationsWithDetails = await Promise.all(
            memberRecords.map(async (member) => {
                const conversation = await ctx.db.get(member.conversationId);
                if (!conversation) return null;

                // Fetch the other participants' user details
                const otherParticipantIds = conversation.participantIds.filter(
                    (id) => id !== currentUser._id
                );
                const otherParticipants = await Promise.all(
                    otherParticipantIds.map((id) => ctx.db.get(id))
                );

                // Fetch the last message preview
                let lastMessage = null;
                if (conversation.lastMessageId) {
                    lastMessage = await ctx.db.get(conversation.lastMessageId);
                }

                // Compute unread count: messages after lastSeenMessageId
                let unreadCount = 0;
                if (lastMessage) {
                    const allMessages = await ctx.db
                        .query("messages")
                        .withIndex("by_conversationId", (q) =>
                            q.eq("conversationId", conversation._id)
                        )
                        .collect();

                    if (member.lastSeenMessageId) {
                        const seenMsg = await ctx.db.get(member.lastSeenMessageId);
                        if (seenMsg) {
                            unreadCount = allMessages.filter(
                                (m) =>
                                    m._creationTime > seenMsg._creationTime &&
                                    m.senderId !== currentUser._id
                            ).length;
                        }
                    } else {
                        // Never seen any message — all messages from others are unread
                        unreadCount = allMessages.filter(
                            (m) => m.senderId !== currentUser._id
                        ).length;
                    }
                }

                return {
                    ...conversation,
                    otherParticipants: otherParticipants.filter(Boolean),
                    lastMessage,
                    unreadCount,
                };
            })
        );

        // Filter out nulls and sort by last message time (newest first)
        return conversationsWithDetails
            .filter(Boolean)
            .sort((a, b) => {
                const aTime = a!.lastMessage?._creationTime ?? a!._creationTime;
                const bTime = b!.lastMessage?._creationTime ?? b!._creationTime;
                return bTime - aTime;
            });
    },
});

// Get a single conversation by ID (validates the user is a participant)
export const getConversationById = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return null;

        const conversation = await ctx.db.get(conversationId);
        if (!conversation) return null;

        // Security: ensure this user is actually in the conversation
        if (!conversation.participantIds.includes(currentUser._id)) return null;

        const otherParticipantIds = conversation.participantIds.filter(
            (id) => id !== currentUser._id
        );
        const otherParticipants = await Promise.all(
            otherParticipantIds.map((id) => ctx.db.get(id))
        );

        return {
            ...conversation,
            otherParticipants: otherParticipants.filter(Boolean),
        };
    },
});

// Create a group conversation (Feature 14)
export const createGroupConversation = mutation({
    args: {
        memberIds: v.array(v.id("users")),
        groupName: v.string(),
        groupImage: v.optional(v.string()),
    },
    handler: async (ctx, { memberIds, groupName, groupImage }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const allParticipantIds = [currentUser._id, ...memberIds];

        const conversationId = await ctx.db.insert("conversations", {
            participantIds: allParticipantIds,
            isGroup: true,
            groupName,
            groupImage,
        });

        // Create conversationMembers for all participants
        await Promise.all(
            allParticipantIds.map((userId) =>
                ctx.db.insert("conversationMembers", { conversationId, userId })
            )
        );

        return conversationId;
    },
});
