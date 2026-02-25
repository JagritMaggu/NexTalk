import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Called when a user is actively typing (Feature 8)
export const setTyping = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (existing) {
            // Update the timestamp
            await ctx.db.patch(existing._id, { lastTypedAt: Date.now() });
        } else {
            await ctx.db.insert("typingIndicators", {
                conversationId,
                userId: currentUser._id,
                lastTypedAt: Date.now(),
            });
        }
    },
});

// Called when user stops typing or sends a message (Feature 8)
export const clearTyping = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

// Get who is currently typing in a conversation (excluding self)
export const getTypingUsers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) return [];

        const twoSecondsAgo = Date.now() - 2000;

        const typingRecords = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", conversationId)
            )
            .collect();

        // Filter out self and stale records (> 2s ago)
        const activeTypers = typingRecords.filter(
            (r) => r.userId !== currentUser._id && r.lastTypedAt > twoSecondsAgo
        );

        // Fetch user details for each typer
        const typerDetails = await Promise.all(
            activeTypers.map((r) => ctx.db.get(r.userId))
        );

        return typerDetails.filter(Boolean);
    },
});
