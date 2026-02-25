"use client";

import { useState, memo } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { Id } from "@/convex/_generated/dataModel";

const ChatPage = memo(function ChatPage() {
    const [selectedConversationId, setSelectedConversationId] =
        useState<Id<"conversations"> | null>(null);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-black">
            {/* Sidebar — Dynamic visibility for mobile stacking */}
            <div
                className={`${selectedConversationId ? "hidden md:flex" : "flex"
                    } w-full md:w-80 lg:w-96 flex-shrink-0 h-full transition-all duration-300 ease-in-out border-r border-white/[0.06]`}
            >
                <Sidebar
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={setSelectedConversationId}
                />
            </div>

            {/* Chat Area — Inspired by the sliding mobile panels */}
            <div
                className={`${selectedConversationId ? "flex" : "hidden md:flex"
                    } flex-1 min-w-0 h-full animate-slide-up bg-[#0b141b] md:bg-white shadow-2xl z-[100]`}
            >
                <ChatArea
                    conversationId={selectedConversationId}
                    onBack={() => setSelectedConversationId(null)}
                />
            </div>
        </div>
    );
});

export default ChatPage;
