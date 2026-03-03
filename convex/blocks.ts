import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Toggle block/unblock a user.
 * Feature: Blocking
 */
export const toggleBlockUser = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!me) throw new Error("User not found");

        // Can't block yourself
        if (me._id === userId) return;

        const existingBlock = await ctx.db
            .query("blocks")
            .withIndex("by_blockerId_blockedId", (q) =>
                q.eq("blockerId", me._id).eq("blockedId", userId)
            )
            .unique();

        if (existingBlock) {
            await ctx.db.delete(existingBlock._id);
            return { blocked: false };
        } else {
            // Check if there is already a block (e.g. they blocked me, but I'm also blocking them)
            await ctx.db.insert("blocks", { blockerId: me._id, blockedId: userId });
            return { blocked: true };
        }
    },
});

/**
 * Get users blocked by the current user.
 * Feature: Blocking
 */
export const getBlockedUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!me) return [];

        const blocks = await ctx.db
            .query("blocks")
            .withIndex("by_blockerId", (q) => q.eq("blockerId", me._id))
            .collect();

        const blockedUsers = [];
        for (const block of blocks) {
            const user = await ctx.db.get(block.blockedId);
            if (user) blockedUsers.push(user);
        }

        return blockedUsers;
    },
});

/**
 * Check if a relationship is blocked (either side).
 * Feature: Blocking
 */
export const getBlockStatusByConversationId = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { blockedByMe: false, blockedByThem: false };

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!me) return { blockedByMe: false, blockedByThem: false };

        const conv = await ctx.db.get(conversationId);
        if (!conv || conv.isGroup) return { blockedByMe: false, blockedByThem: false };

        const otherUserId = conv.participantIds.find(id => id !== me._id);
        if (!otherUserId) return { blockedByMe: false, blockedByThem: false };

        const blockedByMe = await ctx.db
            .query("blocks")
            .withIndex("by_blockerId_blockedId", (q) =>
                q.eq("blockerId", me._id).eq("blockedId", otherUserId)
            )
            .unique();

        const blockedByThem = await ctx.db
            .query("blocks")
            .withIndex("by_blockerId_blockedId", (q) =>
                q.eq("blockerId", otherUserId).eq("blockedId", me._id)
            )
            .unique();

        return {
            blockedByMe: !!blockedByMe,
            blockedByThem: !!blockedByThem,
            otherUserId
        }
    },
});

/**
 * Check if a specific user is blocked by me.
 */
export const isUserBlockedByMe = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;

        const me = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!me) return false;

        const blocked = await ctx.db
            .query("blocks")
            .withIndex("by_blockerId_blockedId", (q) =>
                q.eq("blockerId", me._id).eq("blockedId", userId)
            )
            .unique();

        return !!blocked;
    },
});
