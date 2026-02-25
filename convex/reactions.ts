import { v } from "convex/values";
import { mutation } from "./_generated/server";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "✨", "🚀", "💯", "✅", "🙌", "🎉", "🤝"];

// Toggle a reaction on a message (Feature 12)
export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, { messageId, emoji }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Validate emoji is in the allowed set
        if (!ALLOWED_EMOJIS.includes(emoji)) {
            throw new Error("Invalid emoji");
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!currentUser) throw new Error("User not found");

        // Check if user already reacted with this emoji
        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_messageId_userId", (q) =>
                q.eq("messageId", messageId).eq("userId", currentUser._id)
            )
            .filter((q) => q.eq(q.field("emoji"), emoji))
            .first();

        if (existing) {
            // Toggle off — remove the reaction
            await ctx.db.delete(existing._id);
        } else {
            // Toggle on — add the reaction
            await ctx.db.insert("reactions", {
                messageId,
                userId: currentUser._id,
                emoji,
            });
        }
    },
});
