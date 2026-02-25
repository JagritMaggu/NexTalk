"use client";

import { memo, useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    ChevronLeft,
    MoreVertical,
    Mic,
    Send,
    Trash2,
    Video,
    Phone,
    Smile,
    Paperclip,
    Image as ImageIcon,
    Users,
    MessageCircle
} from "lucide-react";

interface ChatAreaProps {
    conversationId: Id<"conversations"> | null;
    onBack: () => void;
}

export const ChatArea = memo(function ChatArea({
    conversationId,
    onBack,
}: ChatAreaProps) {
    if (!conversationId) return (
        <div className="hidden md:flex flex-1 h-full items-center justify-center bg-white text-zinc-100 px-20 text-center">
            <div className="animate-fade-in">
                <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageCircleInChat className="w-12 h-12 text-zinc-200" />
                </div>
                <h2 className="text-3xl font-black text-black mb-2 tracking-tight">Select a Chat</h2>
                <p className="text-zinc-400 text-sm font-medium">Connect with your friends smoothly.</p>
            </div>
        </div>
    );

    return <ActiveChat conversationId={conversationId} onBack={onBack} />;
});

const MessageCircleInChat = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const ActiveChat = memo(function ActiveChat({
    conversationId,
    onBack,
}: {
    conversationId: Id<"conversations">;
    onBack: () => void;
}) {
    const [content, setContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messages = useQuery(api.messages.getMessages, { conversationId });
    const conversation = useQuery(api.conversations.getConversationById, { conversationId });
    const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);

    const isGroup = conversation?.isGroup;
    const displayName = isGroup ? conversation.groupName : (conversation?.otherParticipants?.[0] as any)?.name;
    const displayImage = isGroup ? conversation.groupImage : (conversation?.otherParticipants?.[0] as any)?.image;
    const isOnline = !isGroup && (conversation?.otherParticipants?.[0] as any)?.isOnline;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = useCallback(async () => {
        if (!content.trim()) return;
        const msg = content;
        setContent("");
        await sendMessage({ conversationId, content: msg });
    }, [content, conversationId, sendMessage]);

    return (
        <div className="flex flex-col h-full w-full bg-white relative">
            {/* ─── HEADER (Desktop Style) ─── */}
            <div className="px-6 md:px-10 h-20 md:h-24 flex items-center justify-between border-b border-zinc-100 bg-white z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="md:hidden p-2 -ml-2 hover:bg-zinc-50 rounded-full transition-colors text-black">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="relative">
                        {displayImage ? (
                            <img src={displayImage} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm" alt="" />
                        ) : (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Users className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        )}
                        {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-black text-sm md:text-base leading-tight">{displayName || (isGroup ? "Group Chat" : "Loading...")}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {typingUsers && typingUsers.length > 0 ? (
                                <span className="text-blue-500 animate-pulse">Typing...</span>
                            ) : (
                                <span>{isGroup ? `${conversation?.participantIds?.length} members` : (isOnline ? 'Active Now' : 'Offline')}</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6 text-zinc-400">
                    <button className="hidden md:block hover:text-black transition-colors">
                        <Video className="w-5 h-5 shadow-sm" />
                    </button>
                    <button className="hidden md:block hover:text-black transition-colors">
                        <Phone className="w-5 h-5 shadow-sm" />
                    </button>
                    <button className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ─── MESSAGES (Desktop Inspiration) ─── */}
            <div className="flex-1 overflow-y-auto px-6 md:px-20 py-8 no-scrollbar bg-white">
                <div className="flex flex-col gap-10">
                    {messages === undefined ? (
                        Array(6).fill(0).map((_, i) => <MessageSkeleton key={i} isMe={i % 2 === 0} />)
                    ) : messages?.map((msg, idx) => (
                        <div key={msg._id} className={`flex items-start gap-4 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                            <div className="flex-shrink-0 mt-1">
                                <img src={msg.sender?.image} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm" alt="" />
                            </div>

                            <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                <div className={`relative px-6 py-4 text-sm md:text-[15px] font-medium leading-relaxed bubble-shadow rounded-3xl ${msg.isMe
                                    ? 'bg-white text-black border border-zinc-100 rounded-tr-none'
                                    : 'bg-[#0b141b] text-white rounded-tl-none'
                                    } ${msg.isDeleted ? 'opacity-40 italic' : ''}`}>
                                    {/* Tail for Desktop */}
                                    <div className={`hidden md:block absolute top-0 w-4 h-4 ${msg.isMe
                                        ? '-right-1.5'
                                        : '-left-1.5'
                                        }`}>
                                        <svg viewBox="0 0 16 16" className={`${msg.isMe ? 'text-white' : 'text-[#0b141b]'} w-full h-full fill-current`}>
                                            {msg.isMe
                                                ? <path d="M0 0h16v16L0 0z" />
                                                : <path d="M16 0H0v16L16 0z" />
                                            }
                                        </svg>
                                    </div>

                                    {msg.isDeleted ? 'Deleted message' : msg.content}

                                    {/* Requirement #11: Delete */}
                                    {msg.isMe && !msg.isDeleted && (
                                        <button
                                            onClick={() => deleteMessage({ messageId: msg._id })}
                                            className="absolute -bottom-6 right-0 text-[10px] font-bold text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-zinc-300 mt-3 px-2">
                                    {new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ─── INPUT AREA (Desktop Inspiration) ─── */}
            <div className="p-6 md:px-20 md:py-10 bg-white border-t border-zinc-50">
                <div className="flex items-center gap-4 h-16 md:h-20 px-8 shadow-sm border border-zinc-100 rounded-2xl md:rounded-3xl bg-white transition-all focus-within:shadow-md">
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Write Message..."
                        className="flex-1 bg-transparent text-sm md:text-base font-medium text-black placeholder:text-zinc-300 focus:outline-none"
                    />

                    <div className="flex items-center gap-4 text-zinc-300">
                        <button className="hover:text-black transition-colors">
                            <Smile className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <button className="hover:text-black transition-colors">
                            <Paperclip className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <button className="hidden md:block hover:text-black transition-colors">
                            <ImageIcon className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <div className="w-px h-6 bg-zinc-100 mx-1 hidden md:block" />
                        <button
                            onClick={handleSend}
                            disabled={!content.trim()}
                            className={`transition-all ${content.trim() ? 'text-[#0b141b] scale-110' : 'text-zinc-200'}`}
                        >
                            <Send className="w-6 h-6 rotate-[-15deg]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const MessageSkeleton = ({ isMe }: { isMe: boolean }) => (
    <div className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-50 border border-zinc-100 animate-shimmer flex-shrink-0 mt-1" />
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} flex-1`}>
            <div className={`w-3/4 h-14 rounded-3xl animate-shimmer ${isMe ? 'bg-zinc-50 border border-zinc-100' : 'bg-[#0b141b]/5'}`} />
            <div className="w-12 h-3 bg-zinc-50 rounded mt-3 animate-shimmer" />
        </div>
    </div>
);
