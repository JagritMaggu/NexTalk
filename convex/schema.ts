import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ─── Users ───────────────────────────────────────────────────────────────
    // Mirrors basic Clerk user data + app-specific fields
    users: defineTable({
        name: v.string(),
        email: v.string(),
        image: v.string(),
        clerkId: v.string(),
        isOnline: v.boolean(),         // Feature 7: Online/Offline status
    })
        .index("by_clerkId", ["clerkId"]),

    // ─── Conversations ───────────────────────────────────────────────────────
    // Supports both 1-on-1 DMs and group chats (Feature 3, 14)
    conversations: defineTable({
        participantIds: v.array(v.id("users")),  // all members of this conversation
        isGroup: v.boolean(),                    // false = DM, true = group
        groupName: v.optional(v.string()),       // Feature 14: group name
        groupImage: v.optional(v.string()),      // Feature 14: group avatar (URL or placeholder)
        groupImageStorageId: v.optional(v.id("_storage")),
        lastMessageId: v.optional(v.id("messages")), // for sidebar preview (Feature 3)
        ownerId: v.optional(v.id("users")),          // Feature: Group Owner
        isDeleted: v.optional(v.boolean()),          // Feature: Group deletion support
    })
        .index("by_lastMessageId", ["lastMessageId"]),

    // ─── Messages ────────────────────────────────────────────────────────────
    // Core messaging with soft delete support (Feature 3, 4, 11)
    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        isDeleted: v.boolean(),         // Feature 11: soft delete
        fileStorageId: v.optional(v.id("_storage")),
        fileUrl: v.optional(v.string()),
        fileType: v.optional(v.string()), // 'image', 'file', etc.
        deliveredAt: v.optional(v.number()), // Feature: Read Receipts
        seenAt: v.optional(v.number()),      // Feature: Read Receipts
        isEdited: v.optional(v.boolean()),   // Feature: Message Editing
        editedAt: v.optional(v.number()),    // Feature: Message Editing
        parentMessageId: v.optional(v.id("messages")), // Feature: Quoted Replies
        isPinned: v.optional(v.boolean()),      // Feature: Pinning Messages
        pinnedAt: v.optional(v.number()),      // Feature: Pinning Messages
    })
        .index("by_conversationId", ["conversationId"]),

    // ─── Typing Indicators ───────────────────────────────────────────────────
    // Tracks who is currently typing in a conversation (Feature 8)
    typingIndicators: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        lastTypedAt: v.number(),        // timestamp — clear if > 2s ago
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),

    // ─── Reactions ───────────────────────────────────────────────────────────
    // Emoji reactions on messages (Feature 12)
    reactions: defineTable({
        messageId: v.id("messages"),
        userId: v.id("users"),
        emoji: v.string(),              // one of: 👍 ❤️ 😂 😮 😢
    })
        .index("by_messageId", ["messageId"])
        .index("by_messageId_userId", ["messageId", "userId"]),

    // ─── Conversation Members ─────────────────────────────────────────────
    // Join table to track per-user state in each conversation (Feature 9)
    conversationMembers: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        lastSeenMessageId: v.optional(v.id("messages")), // for unread count (Feature 9)
        role: v.optional(v.string()),                  // "owner" | "admin" | "member"
        isPinned: v.optional(v.boolean()),             // Feature: Pinned Chats
        pinnedAt: v.optional(v.number()),              // Feature: Pinned Chats
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_userId", ["userId"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),
});
