import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Called by the Clerk webhook to upsert a user into Convex
export const upsertFromClerk = internalMutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        image: v.string(),
    },
    handler: async (ctx, { clerkId, name, email, image }) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { name, email, image });
        } else {
            await ctx.db.insert("users", { clerkId, name, email, image, isOnline: false });
        }
    },
});

// Get the current logged-in user's Convex document
export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        return user;
    },
});

// Get all users except the current user
export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        return await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("clerkId"), identity.subject))
            .collect();
    },
});

// Get a single user by their Convex _id
export const getUserById = query({
    args: { id: v.id("users") },
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

// Update online status (Feature 7)
// Call with true when app mounts, false on beforeunload/tab close
export const updateOnlineStatus = mutation({
    args: { isOnline: v.boolean() },
    handler: async (ctx, { isOnline }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, { isOnline });
        }
    },
});
