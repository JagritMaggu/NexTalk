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

                // Resolve group image if it's a storage ID
                let resolvedGroupImage = conversation.groupImage;
                if (conversation.groupImageStorageId) {
                    resolvedGroupImage = (await ctx.storage.getUrl(conversation.groupImageStorageId)) || undefined;
                }

                return {
                    ...conversation,
                    groupImage: resolvedGroupImage,
                    otherParticipants: otherParticipants.filter(Boolean),
                    lastMessage,
                    unreadCount,
                    userRole: member.role || "member",
                    ownerId: conversation.ownerId,
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

        // Resolve group image if it's a storage ID
        let resolvedGroupImage = conversation.groupImage;
        if (conversation.groupImageStorageId) {
            resolvedGroupImage = (await ctx.storage.getUrl(conversation.groupImageStorageId)) || undefined;
        }

        return {
            ...conversation,
            groupImage: resolvedGroupImage,
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
        groupImageStorageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, { memberIds, groupName, groupImage, groupImageStorageId }) => {
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
            groupImageStorageId,
            ownerId: currentUser._id,
        });

        // Create conversationMembers for all participants
        await Promise.all(
            allParticipantIds.map((userId) =>
                ctx.db.insert("conversationMembers", {
                    conversationId,
                    userId,
                    role: userId === currentUser._id ? "owner" : "member"
                })
            )
        );

        return conversationId;
    },
});

export const updateGroupDetails = mutation({
    args: {
        conversationId: v.id("conversations"),
        groupName: v.optional(v.string()),
        groupImage: v.optional(v.string()),
        groupImageStorageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, { conversationId, groupName, groupImage, groupImageStorageId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        const member = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!member || (member.role !== "owner" && member.role !== "admin")) {
            throw new Error("Only admins can update group details");
        }

        await ctx.db.patch(conversationId, {
            groupName: groupName ?? conversation.groupName,
            groupImage: groupImage ?? conversation.groupImage,
            groupImageStorageId: groupImageStorageId ?? conversation.groupImageStorageId,
        });
    },
});

export const manageGroupMember = mutation({
    args: {
        conversationId: v.id("conversations"),
        targetUserId: v.id("users"),
        action: v.union(v.literal("remove"), v.literal("promote"), v.literal("demote")),
    },
    handler: async (ctx, { conversationId, targetUserId, action }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        const member = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!member || (member.role !== "owner" && member.role !== "admin")) {
            throw new Error("Only admins or owners can manage group members");
        }

        const targetMember = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", targetUserId)
            )
            .unique();

        if (!targetMember) throw new Error("Target user is not a member of this group");

        // Admins can't remove owners or other admins (except themselves if they could, but this tool is for targeting others)
        if (member.role === "admin" && (targetMember.role === "owner" || targetMember.role === "admin")) {
            throw new Error("Admins cannot remove other admins or the owner");
        }

        if (targetMember.role === "owner") throw new Error("Cannot modify owner");

        if (action === "remove") {
            await ctx.db.delete(targetMember._id);
            // Also update participantIds in conversation
            const newParticipantIds = conversation.participantIds.filter(id => id !== targetUserId);
            await ctx.db.patch(conversationId, { participantIds: newParticipantIds });
        } else if (action === "promote") {
            await ctx.db.patch(targetMember._id, { role: "admin" });
        } else if (action === "demote") {
            await ctx.db.patch(targetMember._id, { role: "member" });
        }
    },
});

export const getGroupMembers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const members = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
            .collect();

        const membersWithInfo = await Promise.all(
            members.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return user ? { ...user, role: m.role || "member" } : null;
            })
        );

        return membersWithInfo.filter((m): m is NonNullable<typeof m> => m !== null);
    },
});

export const leaveGroup = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        const member = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!member) throw new Error("Not a member of this group");

        // Remove the user from the group
        await ctx.db.delete(member._id);

        const newParticipantIds = conversation.participantIds.filter(id => id !== currentUser._id);

        if (newParticipantIds.length === 0) {
            // Delete the whole conversation if no one is left
            await ctx.db.delete(conversationId);
        } else {
            // Update the conversation participant list
            let newOwnerId = conversation.ownerId;

            // If the owner is leaving, transfer ownership
            if (conversation.ownerId === currentUser._id) {
                // Find next admin
                const nextAdmin = await ctx.db
                    .query("conversationMembers")
                    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
                    .filter((q) => q.eq(q.field("role"), "admin"))
                    .first();

                if (nextAdmin) {
                    newOwnerId = nextAdmin.userId;
                    await ctx.db.patch(nextAdmin._id, { role: "owner" });
                } else {
                    // No admins left, pick any member
                    const nextMember = await ctx.db
                        .query("conversationMembers")
                        .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
                        .first();

                    if (nextMember) {
                        newOwnerId = nextMember.userId;
                        await ctx.db.patch(nextMember._id, { role: "owner" });
                    }
                }
            }

            await ctx.db.patch(conversationId, {
                participantIds: newParticipantIds,
                ownerId: newOwnerId
            });
        }
    },
});

export const deleteGroupConversation = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        const member = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!member || member.role !== "owner") {
            throw new Error("Only the group owner can delete the group");
        }

        // Mark the conversation as deleted
        await ctx.db.patch(conversationId, { isDeleted: true });
    },
});

export const addGroupMembers = mutation({
    args: {
        conversationId: v.id("conversations"),
        newUserIds: v.array(v.id("users")),
    },
    handler: async (ctx, { conversationId, newUserIds }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        const member = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!member || (member.role !== "owner" && member.role !== "admin")) {
            throw new Error("Only admins or owners can add members");
        }

        const currentParticipantIds = conversation.participantIds;
        const finalParticipantIds = [...currentParticipantIds];

        for (const userId of newUserIds) {
            if (!finalParticipantIds.includes(userId)) {
                finalParticipantIds.push(userId);

                // Create conversationMember entry
                await ctx.db.insert("conversationMembers", {
                    conversationId,
                    userId,
                    role: "member"
                });
            }
        }

        await ctx.db.patch(conversationId, {
            participantIds: finalParticipantIds
        });
    },
});
