"use client";

import { ChevronLeft, Info, MessageCircle, MoreVertical, Paperclip, Phone, Search, Send, Smile, User, Users, Video, ImageIcon, Trash2, Heart, ThumbsUp, Laugh, Frown, MoreHorizontal, Download, FileText, ArrowDown, X, Music, LayoutGrid } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react";
import GroupSettingsModal from "./GroupSettingsModal";
import { toast } from "sonner";

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
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<{ url: string; showDownload: boolean } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showNewMessageButton, setShowNewMessageButton] = useState(false);
    const [activeReactionMessageId, setActiveReactionMessageId] = useState<Id<"messages"> | null>(null);
    const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<Id<"messages">>>(new Set());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const conversation = useQuery(api.conversations.getConversationById, { conversationId });
    const messages = useQuery(api.messages.getMessages, { conversationId });
    const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });

    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const markAsRead = useMutation(api.messages.markConversationAsRead);
    const toggleReaction = useMutation(api.reactions.toggleReaction);
    const setTyping = useMutation(api.typing.setTyping);
    const clearTyping = useMutation(api.typing.clearTyping);

    const isGroup = conversation?.isGroup;
    const displayName = isGroup ? conversation.groupName : (conversation?.otherParticipants?.[0] as any)?.name;
    const displayImage = isGroup ? conversation.groupImage : (conversation?.otherParticipants?.[0] as any)?.image;
    const isOnline = !isGroup && (conversation?.otherParticipants?.[0] as any)?.isOnline;

    // Redirect if conversation is gone (e.g. left group)
    useEffect(() => {
        if (conversation === null) {
            onBack();
        }
    }, [conversation, onBack]);

    // Mark as read
    useEffect(() => {
        if (conversationId) {
            markAsRead({ conversationId });
        }
    }, [conversationId, messages, markAsRead]);

    // Smart Auto-Scroll
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;

        if (isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowNewMessageButton(false);
        } else if (messages && messages.length > 0) {
            setShowNewMessageButton(true);
        }
    }, [messages]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        if (isAtBottom) setShowNewMessageButton(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMessageButton(false);
    };

    const formatMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isThisYear = date.getFullYear() === now.getFullYear();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (isThisYear) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ", " +
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + ", " +
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    const handleSend = useCallback(async (overrides?: any) => {
        const text = overrides?.content !== undefined ? overrides.content : content;
        if (!text.trim() && !overrides?.fileStorageId) return;

        const currentContent = text;
        setContent("");
        setShowEmojiPicker(false);
        await clearTyping({ conversationId });

        try {
            await sendMessage({
                conversationId,
                content: currentContent,
                fileStorageId: overrides?.fileStorageId,
                fileType: overrides?.fileType
            });
        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Message failed to send. Click to retry", {
                duration: 5000,
                action: {
                    label: "Retry",
                    onClick: () => handleSend(overrides)
                }
            });
            // Restore content if it was a plain text message
            if (!overrides?.fileStorageId) setContent(currentContent);
        }
    }, [content, conversationId, sendMessage, clearTyping]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        let detectedType = 'file';
        if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext!)) detectedType = 'image';
        else if (file.type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext!)) detectedType = 'video';
        else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext!)) detectedType = 'audio';
        else if (file.type === 'application/pdf' || ext === 'pdf') detectedType = 'pdf';
        else if (file.type.includes('zip') || file.type.includes('archive') || ['zip', 'rar', '7z', 'tar'].includes(ext!)) detectedType = 'archive';

        setIsUploading(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            const contentLabel = detectedType === 'image' ? 'photo' :
                detectedType === 'video' ? 'video' :
                    detectedType === 'audio' ? 'voice memo' :
                        detectedType === 'pdf' ? 'PDF' :
                            detectedType === 'archive' ? 'archive' : 'file';

            const article = ['a', 'e', 'i', 'o', 'u'].includes(contentLabel[0].toLowerCase()) ? 'an' : 'a';

            await handleSend({
                content: `Sent ${article} ${contentLabel}`,
                fileStorageId: storageId,
                fileType: detectedType
            });
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    const onInputChange = (val: string) => {
        setContent(val);
        if (val.trim()) {
            setTyping({ conversationId });
        } else {
            clearTyping({ conversationId });
        }
    };

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;
        return messages?.filter(msg =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [messages, searchQuery]);

    return (
        <div className="flex flex-col h-full w-full bg-[#0b141b] md:bg-[#fcfdfe] relative overflow-hidden">
            {/* ─── HEADER (Optimized with Memo & Shimmer) ─── */}
            <div className="px-6 md:px-10 pt-14 md:pt-0 h-32 md:h-20 flex items-center justify-between border-b border-white/5 bg-[#0b141b] sticky top-0 z-20">
                {useMemo(() => {
                    if (conversation === undefined) {
                        return (
                            <div className="flex items-center gap-4">
                                <button onClick={onBack} className="md:hidden p-2 -ml-2 text-white/20">
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 animate-shimmer" />
                                <div className="space-y-2">
                                    <div className="w-32 h-4 bg-white/5 rounded-md animate-shimmer" />
                                    <div className="w-20 h-2.5 bg-white/5 rounded-md animate-shimmer opacity-50" />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="md:hidden p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors text-white md:text-black">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div className="relative group">
                                <div
                                    onClick={() => displayImage && setPreviewAsset({ url: displayImage, showDownload: false })}
                                    className={`w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden transition-all bg-transparent ${displayImage ? 'cursor-pointer' : ''}`}
                                >
                                    {displayImage ? (
                                        <img src={displayImage} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                                            <span className="text-sm font-bold uppercase">{displayName?.charAt(0) || "U"}</span>
                                        </div>
                                    )}
                                </div>
                                {isOnline && (
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base leading-tight tracking-tight">
                                    {displayName || (isGroup ? "Group Chat" : "Loading...")}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {typingUsers && typingUsers.length > 0 ? (
                                        <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                                            <span className="flex gap-0.5">
                                                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
                                            </span>
                                            typing...
                                        </span>
                                    ) : (
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${isOnline ? 'text-green-500' : 'text-zinc-400'}`}>
                                            {isGroup ? `${conversation?.participantIds?.length} members` : (isOnline ? 'Online' : 'Offline')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }, [conversation, displayName, displayImage, isOnline, typingUsers, onBack])}

                <div className="flex items-center gap-3">
                    {isSearching ? (
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 animate-in fade-in slide-in-from-right-4">
                            <Search className="w-3.5 h-3.5 text-zinc-500" />
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search messages..."
                                className="bg-transparent border-none outline-none text-xs font-medium text-white w-32 md:w-48 placeholder:text-zinc-600"
                                onKeyDown={(e) => e.key === 'Escape' && setIsSearching(false)}
                            />
                            <button onClick={() => { setIsSearching(false); setSearchQuery(""); }} className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-500 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearching(true)}
                            className="p-2 transition-all text-zinc-500 hover:text-[#FACC15] md:hover:text-[#FEF9C3] hidden md:flex"
                        >
                            <Search className="w-5 h-5 transition-colors" />
                        </button>
                    )}

                    {isGroup && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 transition-all text-zinc-500 hover:text-white flex items-center justify-center group/btn"
                            title="Group Settings"
                        >
                            <Info className="w-5 h-5 transition-colors" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-t-[40px] md:rounded-none flex flex-col overflow-hidden">
                {/* ─── MESSAGES ─── */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-6 md:px-20 py-10 no-scrollbar relative"
                >
                    {showNewMessageButton && (
                        <button
                            onClick={scrollToBottom}
                            className="fixed bottom-32 right-10 z-30 bg-zinc-100 border border-zinc-200 p-2 rounded-lg flex items-center justify-center transition-all active:scale-95 text-black hover:text-zinc-500 shadow-xl"
                        >
                            <ArrowDown className="w-4 h-4" strokeWidth={3} />
                        </button>
                    )}

                    <div className="flex flex-col gap-10">
                        {useMemo(() => {
                            if (messages === undefined) {
                                return Array(6).fill(0).map((_, i) => <MessageSkeleton key={i} isMe={i % 2 === 0} isGroup={!!isGroup} />);
                            }

                            if (messages.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                                            <MessageCircle className="w-8 h-8 text-zinc-200" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Start a conversation</p>
                                    </div>
                                );
                            }

                            return filteredMessages?.filter(msg => !hiddenMessageIds.has(msg._id)).map((msg) => (
                                <MessageItem
                                    key={msg._id}
                                    msg={msg}
                                    isGroup={!!isGroup}
                                    activeReactionMessageId={activeReactionMessageId}
                                    setActiveReactionMessageId={setActiveReactionMessageId}
                                    toggleReaction={toggleReaction}
                                    deleteMessage={deleteMessage}
                                    setHiddenMessageIds={setHiddenMessageIds}
                                    setPreviewAsset={setPreviewAsset}
                                    formatMessageTime={formatMessageTime}
                                />
                            ));
                        }, [messages, filteredMessages, hiddenMessageIds, activeReactionMessageId, isGroup, toggleReaction, deleteMessage, setHiddenMessageIds, setPreviewAsset, formatMessageTime])}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* ─── INPUT AREA ─── */}
                <div className="sticky bottom-0 left-0 w-full px-6 md:px-20 py-4 bg-white/80 backdrop-blur-md z-30">
                    {conversation?.isDeleted ? (
                        <div className="flex items-center justify-center h-12 bg-zinc-50 rounded-full border border-zinc-100">
                            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">This group no longer exists</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-4 p-4 bg-white border border-zinc-100 shadow-2xl rounded-3xl flex gap-3 animate-in fade-in slide-in-from-bottom-2 z-50 overflow-x-auto max-w-full no-scrollbar">
                                    {["👍", "❤️", "😂", "😮", "😢", "🔥", "✨", "🚀", "💯", "✅", "🙌", "🎉", "🤝"].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                onInputChange(content + emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            className="text-xl hover:bg-zinc-50 rounded-lg p-1 transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 md:gap-3 h-12 md:h-14 pl-2 pr-4 md:px-4 rounded-full bg-zinc-100/80 border border-transparent focus-within:bg-white focus-within:border-zinc-200 transition-all group">
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-full z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Uploading...</span>
                                        </div>
                                    </div>
                                )}

                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                <input type="file" ref={imageInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />

                                {/* Layout/More Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-9 h-9 md:w-11 md:h-11 bg-black text-white rounded-2xl flex items-center justify-center opacity-100 hover:opacity-70 transition-opacity flex-shrink-0"
                                >
                                    <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                                </button>

                                <input
                                    type="text"
                                    value={content}
                                    onChange={(e) => onInputChange(e.target.value)}
                                    onFocus={() => setShowEmojiPicker(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Aa"
                                    className="flex-1 bg-transparent text-sm md:text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none px-2"
                                />

                                <div className="flex items-center gap-0.5 md:gap-1.5 pr-1 md:pr-0">
                                    {/* Smile Button */}
                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`p-2 rounded-full transition-all flex-shrink-0 text-zinc-800 opacity-100 hover:opacity-60 ${showEmojiPicker ? 'bg-zinc-200' : ''}`}
                                    >
                                        <Smile className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>

                                    {/* Image Upload shortcut */}
                                    <button
                                        onClick={() => imageInputRef.current?.click()}
                                        className="hidden md:flex p-2 rounded-full transition-all flex-shrink-0 text-zinc-800 opacity-100 hover:opacity-60"
                                    >
                                        <ImageIcon className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>

                                    {/* Send Button - Always present, functional when typed */}
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!content.trim() && !isUploading}
                                        className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-black text-white rounded-2xl transition-all flex-shrink-0 ${content.trim() ? 'opacity-100 hover:opacity-70 active:scale-95' : 'opacity-20 cursor-not-allowed'}`}
                                    >
                                        <Send className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isGroup && (
                <GroupSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    conversationId={conversationId}
                />
            )}
            {previewAsset && (
                <AssetPreviewModal
                    url={previewAsset.url}
                    showDownload={previewAsset.showDownload}
                    onClose={() => setPreviewAsset(null)}
                />
            )}
        </div>
    );
});

const AssetPreviewModal = ({ url, showDownload, onClose }: { url: string; showDownload: boolean; onClose: () => void }) => {
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all border border-white/10 z-[210]"
            >
                <X className="w-6 h-6" />
            </button>

            <img
                src={url}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-md shadow-2xl animate-in zoom-in-95 duration-300 select-none"
                alt="Preview"
                onClick={(e) => e.stopPropagation()}
            />

            {showDownload && (
                <div className="absolute bottom-12 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3.5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-md hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download className="w-4 h-4" />
                        Download Original
                    </a>
                </div>
            )}
        </div>
    );
}

const MessageItem = memo(({
    msg,
    isGroup,
    activeReactionMessageId,
    setActiveReactionMessageId,
    toggleReaction,
    deleteMessage,
    setHiddenMessageIds,
    setPreviewAsset,
    formatMessageTime,
}: {
    msg: any;
    isGroup: boolean;
    activeReactionMessageId: Id<"messages"> | null;
    setActiveReactionMessageId: (id: Id<"messages"> | null) => void;
    toggleReaction: any;
    deleteMessage: any;
    setHiddenMessageIds: any;
    setPreviewAsset: any;
    formatMessageTime: any;
}) => (
    <div className={`flex items-end gap-3 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'} animate-fade-in group relative`}>
        {(!msg.isMe && isGroup) && (
            <div className="flex-shrink-0 mb-1">
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border border-zinc-100">
                    {msg.sender?.image ? (
                        <img src={msg.sender?.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            {msg.sender?.name?.charAt(0) || "U"}
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
            <div className={`relative px-4.5 py-2.5 text-[14px] md:text-[15px] font-medium leading-normal ${msg.isMe
                ? 'bg-[#F3F4F6] text-[#111827] rounded-[24px] rounded-tr-[8px]'
                : 'bg-[#FEF9C3] text-[#111827] rounded-[24px] rounded-tl-[8px]'
                } ${msg.isDeleted ? 'italic !bg-zinc-50 !text-zinc-500 border border-zinc-100/50' : ''} transition-all`}>

                {msg.isDeleted ? (
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-3 h-3" />
                        <span>Message deleted</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {msg.fileUrl && (
                            <div className="mb-1">
                                {msg.fileType === 'image' ? (
                                    <div className="block overflow-hidden rounded-md">
                                        <div
                                            className="relative cursor-zoom-in group/img"
                                            onClick={() => msg.fileUrl && setPreviewAsset({ url: msg.fileUrl, showDownload: true })}
                                        >
                                            <img
                                                src={msg.fileUrl}
                                                className="max-w-full max-h-60 rounded-md object-contain transition-opacity duration-300 group-hover/img:opacity-90"
                                                alt="Attachment"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`flex items-center gap-3 p-3 rounded-md border ${msg.isMe ? 'bg-white/40 border-black/5 text-zinc-900' : 'bg-white border-zinc-100 text-zinc-800'} backdrop-blur-sm shadow-sm`}
                                    >
                                        <div className="flex-1 min-w-0 px-1 text-left flex items-center gap-3">
                                            <div className="p-2 bg-zinc-100 rounded-md text-zinc-500">
                                                {msg.fileType === 'video' ? <Video className="w-5 h-5" /> :
                                                    msg.fileType === 'audio' ? <Music className="w-5 h-5" /> :
                                                        msg.fileType === 'pdf' ? <FileText className="w-5 h-5" /> :
                                                            msg.fileType === 'archive' ? <Paperclip className="w-5 h-5" /> :
                                                                <FileText className="w-5 h-5" />}
                                            </div>
                                            <p className="text-[11px] font-black uppercase tracking-widest leading-none">
                                                {(msg.fileType === 'video' || msg.content?.toLowerCase().includes('video')) ? 'Video File' :
                                                    (msg.fileType === 'audio' || msg.content?.toLowerCase().includes('voice memo')) ? 'Audio Clip' :
                                                        (msg.fileType === 'pdf' || msg.content?.toLowerCase().includes('pdf')) ? 'PDF Document' :
                                                            (msg.fileType === 'archive' || msg.content?.toLowerCase().includes('archive')) ? 'Archive' : 'Attachment'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (msg.fileUrl) window.open(msg.fileUrl, '_blank');
                                            }}
                                            className="p-3 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-all shadow-lg active:scale-95 group/dl"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                )}

                {/* Reaction Display */}
                {msg.reactionCounts && Object.keys(msg.reactionCounts).length > 0 && (
                    <div
                        onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg._id ? null : msg._id)}
                        className={`absolute -bottom-4 ${msg.isMe ? 'right-2' : 'left-2'} flex items-center gap-1 bg-white border border-zinc-50 px-2 py-1 rounded-full shadow-sm z-20 transition-transform cursor-pointer group/rx`}
                    >
                        {Object.entries(msg.reactionCounts).map(([emoji, count]) => (
                            <div key={emoji} className="flex items-center gap-1">
                                <span className="text-[11px]">{emoji}</span>
                                <span className="text-[10px] font-black text-zinc-500">{count as number}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Menu Trigger (Smile Icon on Hover) */}
                {!msg.isDeleted && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMessageId(activeReactionMessageId === msg._id ? null : msg._id);
                        }}
                        className={`absolute ${msg.isMe ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 p-1.5 text-zinc-300 hover:text-black transition-all opacity-0 group-hover:opacity-100 z-10`}
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                )}

                {/* Reaction Popover (Whatsapp Style) */}
                {!msg.isDeleted && activeReactionMessageId === msg._id && (
                    <div className={`absolute top-full mt-2 ${msg.isMe ? 'right-0' : 'left-0'} flex items-center gap-1 bg-white border border-zinc-100 p-2 rounded-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] transition-all animate-in fade-in zoom-in-95 duration-200 z-50`}>
                        {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    toggleReaction({ messageId: msg._id, emoji });
                                    setActiveReactionMessageId(null);
                                }}
                                className={`p-1.5 hover:bg-zinc-50 rounded-full transition-all ${msg.myReactions?.includes(emoji) ? 'bg-indigo-50 bg-opacity-100' : ''}`}
                            >
                                <span className="text-xl">{emoji}</span>
                            </button>
                        ))}
                        <div className="w-px h-4 bg-zinc-100 mx-1" />
                        {msg.isMe ? (
                            <button
                                onClick={() => {
                                    deleteMessage({ messageId: msg._id });
                                    setActiveReactionMessageId(null);
                                }}
                                className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-full transition-all"
                                title="Delete for Everyone"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setHiddenMessageIds((prev: any) => {
                                        const next = new Set(prev);
                                        next.add(msg._id);
                                        return next;
                                    });
                                    setActiveReactionMessageId(null);
                                }}
                                className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-black rounded-full transition-all"
                                title="Hide for Me"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
            <span className="text-[9px] font-bold text-zinc-500 mt-2 px-1 tracking-widest uppercase opacity-80">
                {formatMessageTime(msg._creationTime)}
            </span>
        </div>
    </div>
));
MessageItem.displayName = "MessageItem";

const MessageSkeleton = ({ isMe, isGroup }: { isMe: boolean; isGroup: boolean }) => (
    <div className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {(isGroup && !isMe) && <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-100/50 animate-pulse flex-shrink-0 mt-1" />}
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} flex-1`}>
            <div className={`w-[60%] h-14 rounded-2xl animate-pulse ${isMe ? 'bg-zinc-100' : 'bg-zinc-50'}`} />
            <div className="w-16 h-2.5 bg-zinc-50 rounded mt-3 opacity-50" />
        </div>
    </div>
);
