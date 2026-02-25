"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Bell,
    MessageCircle,
    Users,
    ChevronRight,
    Search,
    Menu,
    MoreVertical,
    Star,
    ChevronDown,
    UserPlus,
    PlusCircle
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import CreateGroupModal from "./CreateGroupModal";

interface SidebarProps {
    selectedConversationId: Id<"conversations"> | null;
    onSelectConversation: (id: Id<"conversations">) => void;
}

export const Sidebar = memo(function Sidebar({
    selectedConversationId,
    onSelectConversation,
}: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"chats" | "people">("chats");
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const conversations = useQuery(api.conversations.getMyConversations);
    const allUsers = useQuery(api.users.getAllUsers);
    const me = useQuery(api.users.getMe);
    const createOrGetConversation = useMutation(api.conversations.createOrGetConversation);

    const handleUserClick = useCallback(async (userId: Id<"users">) => {
        const convId = await createOrGetConversation({ otherUserId: userId });
        onSelectConversation(convId);
        setActiveTab("chats");
    }, [createOrGetConversation, onSelectConversation]);

    const filteredPeople = useMemo(() => {
        if (!allUsers) return [];
        if (!searchQuery.trim()) return allUsers;
        const q = searchQuery.toLowerCase();
        return allUsers.filter(u => u.name.toLowerCase().includes(q));
    }, [allUsers, searchQuery]);

    const filteredConversations = useMemo(() => {
        if (!conversations) return [];
        const valid = conversations.filter(c => c !== null);
        if (!searchQuery.trim()) return valid;
        const q = searchQuery.toLowerCase();
        return valid.filter(c =>
            c.otherParticipants?.some((p: any) => p?.name?.toLowerCase().includes(q))
        );
    }, [conversations, searchQuery]);

    return (
        <div className="flex flex-col h-full w-full bg-[#0b141b] md:bg-[#0b141b] text-white overflow-hidden">
            {/* ─── DESKTOP HEADER (Matches Inspiration) ─── */}
            <div className="hidden md:flex p-6 items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveTab(activeTab === 'chats' ? 'people' : 'chats')}
                        className={`transition-colors ${activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                        title="Toggle People/Chats"
                    >
                        <Users className="w-6 h-6" />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent pl-7 text-sm font-medium focus:outline-none w-32 focus:w-40 transition-all placeholder:text-zinc-700"
                        />
                    </div>
                    <button
                        onClick={() => setIsGroupModalOpen(true)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                        title="Create Group Chat"
                    >
                        <PlusCircle className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400" />
                    </button>
                </div>
                <UserButton
                    appearance={{
                        elements: {
                            userButtonAvatarBox: "h-8 w-8 border border-white/10",
                        }
                    }}
                />
            </div>

            {/* ─── DESKTOP FILTERS ─── */}
            <div className="hidden md:flex px-6 py-4 items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-2 cursor-pointer hover:text-zinc-300">
                    Today <ChevronDown className="w-3 h-3 text-zinc-600" />
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:text-zinc-300">
                    Date <ChevronDown className="w-3 h-3 text-zinc-600" />
                </div>
            </div>

            {/* ─── MOBILE HEADER (Chatdong Style kept) ─── */}
            <div className="flex md:hidden px-6 pt-12 pb-8 flex-col">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">ChatApp</p>
                        <h1 className="text-2xl font-black mt-0.5 tracking-tight">
                            {activeTab === 'chats' ? 'Recent Chat' : 'All People'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsGroupModalOpen(true)}
                            className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800"
                        >
                            <UserPlus className="w-5 h-5 text-zinc-400" />
                        </button>
                        <UserButton
                            appearance={{
                                elements: {
                                    userButtonAvatarBox: "h-10 w-10 border border-white/20",
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
            />

            {/* ─── MAIN LIST AREA ─── */}
            <div className="flex-1 bg-white md:bg-transparent md:text-white surface-rounded-top md:rounded-none flex flex-col overflow-hidden relative">
                {/* Mobile Search Input */}
                <div className="md:hidden px-8 pt-8 pb-4">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-100 rounded-full px-6 py-3.5 text-sm font-medium text-black placeholder:text-zinc-400 focus:ring-2 focus:ring-black/5 outline-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-4 no-scrollbar pb-32">
                    {activeTab === 'chats' ? (
                        <div className="flex flex-col gap-0 md:gap-1 mt-4 md:mt-0">
                            {conversations === undefined ? (
                                Array(5).fill(0).map((_, i) => <ConversationSkeleton key={i} />)
                            ) : filteredConversations.length > 0 ? (
                                filteredConversations.map((conv: any) => (
                                    <ConversationItem
                                        key={conv._id}
                                        conv={conv}
                                        isSelected={selectedConversationId === conv._id}
                                        onClick={() => onSelectConversation(conv._id)}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                    <MessageCircle className="w-12 h-12 mb-4 opacity-10" />
                                    <p className="text-sm font-bold tracking-tight">No conversations found</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0 md:gap-1 mt-4 md:mt-0">
                            {allUsers === undefined ? (
                                Array(5).fill(0).map((_, i) => <PeopleSkeleton key={i} />)
                            ) : filteredPeople.length > 0 ? (
                                filteredPeople.map((user) => (
                                    <PeopleItem
                                        key={user._id}
                                        user={user}
                                        onClick={() => handleUserClick(user._id)}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                    <Users className="w-12 h-12 mb-4 opacity-10" />
                                    <p className="text-sm font-bold tracking-tight">No people found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile Navigation */}
                <div className="absolute bottom-10 left-0 w-full px-8 pointer-events-none md:hidden">
                    <div className="bg-black py-4 px-12 rounded-full flex items-center justify-between shadow-2xl pointer-events-auto">
                        <button
                            onClick={() => setActiveTab("chats")}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chats' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-[9px] font-bold">Chats</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("people")}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="text-[9px] font-bold">People</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const ConversationItem = ({ conv, onClick, isSelected }: any) => {
    const isGroup = conv.isGroup;
    const displayName = isGroup ? conv.groupName : (conv.otherParticipants?.[0]?.name || "User");
    const displayImage = isGroup ? conv.groupImage : conv.otherParticipants?.[0]?.image;
    const isOnline = !isGroup && conv.otherParticipants?.[0]?.isOnline;

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 w-full p-4 rounded-3xl md:rounded-none transition-all ${isSelected
                ? 'bg-zinc-50 md:bg-white/5'
                : 'hover:bg-zinc-50/50 md:hover:bg-white/[0.02]'
                }`}
        >
            <div className="relative">
                {displayImage ? (
                    <img
                        src={displayImage}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-sm border md:border-none border-zinc-100"
                        alt=""
                    />
                ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-indigo-500/10 flex items-center justify-center border md:border-none border-zinc-100 text-indigo-400">
                        {isGroup ? <Users className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
                    </div>
                )}
                {isOnline && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white md:border-[#0b141b]" />}
            </div>
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-black md:text-white truncate text-sm md:text-base">{displayName}</span>
                    <div className="flex items-center gap-4">
                        <Star className="hidden md:block w-4 h-4 text-zinc-800 hover:text-accent-star transition-colors" />
                        <span className="text-[10px] font-black md:font-medium text-zinc-300 md:text-zinc-600 uppercase md:normal-case tracking-tighter md:tracking-normal whitespace-nowrap">
                            {new Date(conv.lastMessage?._creationTime || conv._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                <p className="text-xs font-semibold md:font-medium text-zinc-400 md:text-zinc-500 truncate pr-4">
                    {conv.lastMessage?.content || "Tap to chat"}
                </p>
            </div>
        </button>
    );
};

const PeopleItem = ({ user, onClick }: any) => (
    <button onClick={onClick} className="flex items-center gap-4 w-full p-4 hover:bg-zinc-50 md:hover:bg-white/[0.02] rounded-3xl md:rounded-none transition-all">
        <div className="relative">
            {user.image && <img src={user.image} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover" alt="" />}
            {user.isOnline && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white md:border-[#0b141b]" />}
        </div>
        <div className="flex-1 text-left">
            <p className="font-bold text-black md:text-white text-sm md:text-base">{user.name}</p>
            <p className={`text-[9px] font-black uppercase tracking-widest ${user.isOnline ? 'text-green-500' : 'text-zinc-300 md:text-zinc-600'}`}>
                {user.isOnline ? 'Active Now' : 'Offline'}
            </p>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-200 md:text-zinc-800" />
    </button>
);

const ConversationSkeleton = () => (
    <div className="flex items-center gap-4 w-full p-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-100 md:bg-white/5 animate-shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="flex justify-between">
                <div className="w-24 h-4 bg-zinc-100 md:bg-white/5 animate-shimmer rounded" />
                <div className="w-12 h-3 bg-zinc-50 md:bg-white/5 animate-shimmer rounded mt-1" />
            </div>
            <div className="w-32 h-3 bg-zinc-50 md:bg-white/5 animate-shimmer rounded" />
        </div>
    </div>
);

const PeopleSkeleton = () => (
    <div className="flex items-center gap-4 w-full p-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-100 md:bg-white/5 animate-shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="w-24 h-4 bg-zinc-100 md:bg-white/5 animate-shimmer rounded" />
            <div className="w-16 h-2 bg-zinc-50 md:bg-white/5 animate-shimmer rounded" />
        </div>
    </div>
);
