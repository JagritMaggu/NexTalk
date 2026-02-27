"use client";

import { memo, useState, useMemo, useCallback, useEffect } from "react";
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
    PlusCircle,
    X,
    Archive,
    Inbox,
    Plus
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import CreateGroupModal from "./CreateGroupModal";

const ConversationItem = ({ conv, onClick, isSelected, onPreviewImage, onToggleStar, isStarred, onToggleArchive, isArchived }: any) => {
    const isGroup = conv.isGroup;
    const displayName = isGroup ? conv.groupName : (conv.otherParticipants?.[0]?.name || "User");
    const displayImage = isGroup ? conv.groupImage : conv.otherParticipants?.[0]?.image;
    const isOnline = !isGroup && conv.otherParticipants?.[0]?.isOnline;

    const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId: conv._id });

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 w-full p-3.5 rounded-3xl md:rounded-none transition-all cursor-pointer ${isSelected
                ? 'bg-zinc-50 md:bg-white/5'
                : 'hover:bg-zinc-50/50 md:hover:bg-white/[0.02]'
                }`}
        >
            <div className="relative group">
                <div
                    onClick={(e) => {
                        if (displayImage) {
                            e.stopPropagation();
                            onPreviewImage(displayImage);
                        }
                    }}
                    className={`w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shadow-sm border md:border-2 border-zinc-100 md:border-white/10 ring-1 ring-black/5 md:ring-white/5 transition-all group-hover:shadow-md ${displayImage ? 'cursor-pointer' : ''}`}
                >
                    {displayImage ? (
                        <img
                            src={displayImage}
                            className="w-full h-full object-cover"
                            alt=""
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white ${isGroup ? 'bg-indigo-500' : 'bg-gradient-to-br from-zinc-700 to-zinc-900 font-bold'}`}>
                            {isGroup ? <Users className="w-5 h-5" /> : <span className="text-xs">{displayName?.charAt(0) || "U"}</span>}
                        </div>
                    )}
                </div>
                {isOnline && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white md:border-[#0b141b] shadow-sm" />}
            </div>
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={`truncate text-xs md:text-sm ${conv.unreadCount > 0 ? 'font-black text-yellow-600 md:text-[#FEF9C3]' : 'font-bold text-black md:text-white'}`}>
                        {displayName}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleArchive();
                            }}
                            className={`flex p-1.5 rounded-full transition-all 
                                    ${isArchived
                                    ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                                    : 'text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/5'}
                                `}
                            title={isArchived ? "Unarchive chat" : "Archive chat"}
                        >
                            <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleStar();
                            }}
                            className={`p-1 rounded-full transition-all ${isStarred ? 'text-accent-star' : 'text-zinc-500 hover:text-zinc-400'}`}
                        >
                            <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                        <span className={`text-[10px] uppercase md:normal-case tracking-tighter md:tracking-normal whitespace-nowrap ${conv.unreadCount > 0 ? 'font-black text-yellow-600 md:text-[#FEF9C3]' : 'font-black md:font-medium text-zinc-300 md:text-zinc-600'}`}>
                            {new Date(conv.lastMessage?._creationTime || conv._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {typingUsers && typingUsers.length > 0 ? (
                            <p className="text-[11px] text-yellow-600 md:text-[#FEF9C3] font-bold italic animate-pulse truncate">
                                {isGroup ? `${typingUsers[0]?.name} is typing...` : 'typing...'}
                            </p>
                        ) : (
                            <p className={`text-[11px] truncate ${conv.unreadCount > 0 ? 'font-bold text-zinc-800 md:text-zinc-200' : 'font-semibold md:font-medium text-zinc-400 md:text-zinc-500'}`}>
                                {conv.isDeleted ? "Group deleted, can't message" : (conv.lastMessage?.content || "Tap to chat")}
                            </p>
                        )}
                    </div>
                    {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center bg-[#FEF9C3] text-[#111827] text-[10px] font-black rounded-full shadow-lg shadow-black/10">
                            {conv.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const PeopleItem = ({ user, onClick, onPreviewImage }: any) => (
    <div onClick={onClick} className="flex items-center gap-3 w-full p-3.5 hover:bg-zinc-50 md:hover:bg-white/[0.02] rounded-3xl md:rounded-none transition-all cursor-pointer">
        <div className="relative group">
            <div
                onClick={(e) => {
                    if (user.image) {
                        e.stopPropagation();
                        onPreviewImage(user.image);
                    }
                }}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shadow-sm border md:border-2 border-zinc-100 md:border-white/10 ${user.image ? 'cursor-pointer transition-all' : ''}`}
            >
                {user.image ? (
                    <img src={user.image} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className="w-full h-full bg-zinc-100 md:bg-white/5 flex items-center justify-center text-zinc-400 md:text-zinc-500 font-bold">
                        <span className="text-xs">{user.name?.charAt(0) || "U"}</span>
                    </div>
                )}
            </div>
            {user.isOnline && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white md:border-[#0b141b] shadow-sm" />}
        </div>
        <div className="flex-1 text-left">
            <p className="font-bold text-black md:text-white text-xs md:text-sm">{user.name}</p>
            <p className={`text-[8px] font-black uppercase tracking-widest ${user.isOnline ? 'text-green-500' : 'text-zinc-300 md:text-zinc-600'}`}>
                {user.isOnline ? 'Online' : 'Offline'}
            </p>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-200 md:text-zinc-400" />
    </div>
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
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<"All" | "Today" | "Yesterday">("All");
    const [sortOrder, setSortOrder] = useState<"Newest" | "Oldest">("Newest");
    const [openDropdown, setOpenDropdown] = useState<"time" | "sort" | null>(null);

    // Frontend-only starring
    const [starredIds, setStarredIds] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('starred_conversations');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });

    const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('archived_conversations');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });

    const [viewMode, setViewMode] = useState<"all" | "favorites" | "archived">("all");

    const conversations = useQuery(api.conversations.getMyConversations);
    const allUsers = useQuery(api.users.getAllUsers);
    const me = useQuery(api.users.getMe);
    const createOrGetConversation = useMutation(api.conversations.createOrGetConversation);

    const toggleStar = (id: string) => {
        setStarredIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem('starred_conversations', JSON.stringify(Array.from(next)));
            }
            return next;
        });
    };

    const toggleArchive = (id: string) => {
        setArchivedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem('archived_conversations', JSON.stringify(Array.from(next)));
            }
            return next;
        });
    };

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
        let valid = conversations.filter(c => c !== null);

        // View Mode Filtering (Archive/Favorite folders)
        if (viewMode === "favorites") {
            valid = valid.filter(c => starredIds.has(c._id));
        } else if (viewMode === "archived") {
            valid = valid.filter(c => archivedIds.has(c._id));
        } else {
            // "All" view hides archived by default
            valid = valid.filter(c => !archivedIds.has(c._id));
        }

        // Time Range Filter
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0)).getTime();
        const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

        if (timeRange === "Today") {
            valid = valid.filter(c => {
                const time = c.lastMessage?._creationTime || c._creationTime;
                return time >= todayStart;
            });
        } else if (timeRange === "Yesterday") {
            valid = valid.filter(c => {
                const time = c.lastMessage?._creationTime || c._creationTime;
                return time >= yesterdayStart && time < todayStart;
            });
        }

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            valid = valid.filter(c =>
                c.otherParticipants?.some((p: any) => p?.name?.toLowerCase().includes(q)) ||
                c.groupName?.toLowerCase().includes(q)
            );
        }

        // Sort Order
        return [...valid].sort((a, b) => {
            const aTime = a.lastMessage?._creationTime || a._creationTime;
            const bTime = b.lastMessage?._creationTime || b._creationTime;
            return sortOrder === "Newest" ? bTime - aTime : aTime - bTime;
        });
    }, [conversations, searchQuery, timeRange, sortOrder, viewMode, starredIds, archivedIds]);

    // Close dropdowns on outside click
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleClick = () => setOpenDropdown(null);
            window.addEventListener("click", handleClick);
            return () => window.removeEventListener("click", handleClick);
        }
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-[#0b141b] md:bg-[#0b141b] text-white overflow-hidden">
            {/* ─── DESKTOP HEADER (Restored & Taller) ─── */}
            <div className="hidden md:flex h-20 px-6 items-center justify-between border-b border-white/5 bg-black/5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-lg bg-white">
                        <img
                            src="/BrandLogo/brandlogo.jpg"
                            className="w-full h-full object-contain select-none p-1 scale-[1.5]"
                            alt="NexTalk"
                        />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">NexTalk</p>
                        <h1 className="text-sm font-black text-white">
                            {activeTab === 'people' ? 'All Members' :
                                viewMode === 'favorites' ? 'Favorites' :
                                    viewMode === 'archived' ? 'Archived Chats' : 'Recent Chats'}
                        </h1>
                    </div>
                </div>
                <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8 border border-white/10" } }} />
            </div>

            {/* ─── MOBILE HEADER (Dark Section Restored) ─── */}
            <div className="flex md:hidden px-6 pt-12 pb-8 flex-col bg-[#0b141b] text-white">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-800 overflow-hidden shadow-md flex-shrink-0">
                            <img
                                src="/BrandLogo/brandlogo.jpg"
                                className="w-full h-full object-contain select-none p-1 scale-[1.5]"
                                alt="NexTalk"
                            />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">NexTalk</p>
                            <h1 className="text-xl font-black mt-0.5 tracking-tight">
                                {activeTab === 'people' ? 'All Members' :
                                    viewMode === 'favorites' ? 'Favorites' :
                                        viewMode === 'archived' ? 'Archived Chats' : 'Recent Chats'}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsGroupModalOpen(true)}
                            className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800"
                        >
                            <UserPlus className="w-4.5 h-4.5 text-zinc-400" />
                        </button>
                        <UserButton
                            appearance={{
                                elements: {
                                    userButtonAvatarBox: "h-9 w-9 border border-white/20",
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
            <div className="flex-1 bg-white md:bg-transparent md:text-white rounded-t-[40px] md:rounded-none flex flex-col overflow-hidden relative">

                {/* Filters, Search & Tabs */}
                <div className="px-6 pt-8 pb-4 space-y-4">
                    {/* Filters Row (Top level) */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === "time" ? null : "time"); }}
                                    className={`flex items-center gap-2 transition-colors px-3 py-1.5 rounded-md ${openDropdown === 'time' ? 'bg-zinc-100 md:bg-white/10 text-black md:text-white' : 'bg-zinc-50 md:bg-white/5 text-zinc-400 md:text-zinc-500'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider">{timeRange}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'time' ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === "time" && (
                                    <div className="absolute top-full left-0 mt-2 w-32 bg-white md:bg-[#1e2329] border border-zinc-100 md:border-white/5 rounded-md shadow-2xl py-1 z-50">
                                        {(["All", "Today", "Yesterday"] as const).map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => { setTimeRange(r); setOpenDropdown(null); }}
                                                className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all hover:bg-zinc-50 md:hover:bg-white/5 ${timeRange === r ? 'text-[#FACC15]' : 'text-zinc-400'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === "sort" ? null : "sort"); }}
                                    className={`flex items-center gap-2 transition-colors px-3 py-1.5 rounded-md ${openDropdown === 'sort' ? 'bg-zinc-100 md:bg-white/10 text-black md:text-white' : 'bg-zinc-50 md:bg-white/5 text-zinc-400 md:text-zinc-500'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider">{sortOrder === "Newest" ? "New" : "Old"}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === "sort" && (
                                    <div className="absolute top-full left-0 mt-2 w-36 bg-white md:bg-[#1e2329] border border-zinc-100 md:border-white/5 rounded-md shadow-2xl py-1 z-50">
                                        <button onClick={() => { setSortOrder("Newest"); setOpenDropdown(null); }} className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-zinc-50 md:hover:bg-white/5 ${sortOrder === "Newest" ? 'text-[#FACC15]' : 'text-zinc-400'}`}>Newest First</button>
                                        <button onClick={() => { setSortOrder("Oldest"); setOpenDropdown(null); }} className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-zinc-50 md:hover:bg-white/5 ${sortOrder === "Oldest" ? 'text-[#FACC15]' : 'text-zinc-400'}`}>Oldest First</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Folder Switchers (Unified 4-tab Nav) */}
                        <div className="flex items-center gap-1 bg-zinc-50 md:bg-white/5 p-1 rounded-md">
                            <button
                                onClick={() => { setActiveTab("chats"); setViewMode("all"); }}
                                className={`p-1.5 rounded transition-all ${activeTab === 'chats' && viewMode === 'all' ? 'bg-transparent text-[#FACC15] md:text-[#FEF9C3] shadow-none' : 'text-zinc-400 hover:text-zinc-600 md:hover:text-[#FEF9C3]'}`}
                                title="All Chats"
                            >
                                <Inbox className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setActiveTab("people")}
                                className={`p-1.5 rounded transition-all ${activeTab === 'people' ? 'bg-transparent text-[#FACC15] md:text-[#FEF9C3] shadow-none' : 'text-zinc-400 hover:text-zinc-600 md:hover:text-[#FEF9C3]'}`}
                                title="People"
                            >
                                <Users className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => { setActiveTab("chats"); setViewMode("favorites"); }}
                                className={`p-1.5 rounded transition-all ${activeTab === 'chats' && viewMode === 'favorites' ? 'bg-transparent text-accent-star' : 'text-zinc-400 hover:text-accent-star'}`}
                                title="Favorites"
                            >
                                <Star className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => { setActiveTab("chats"); setViewMode("archived"); }}
                                className={`p-1.5 rounded transition-all ${activeTab === 'chats' && viewMode === 'archived' ? 'bg-transparent text-indigo-500 md:text-indigo-400' : 'text-zinc-400 hover:text-indigo-400'}`}
                                title="Archived"
                            >
                                <Archive className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Unified Search Bar */}
                    <div className="relative flex items-center bg-zinc-50 md:bg-black/10 rounded-xl h-12 px-5 group focus-within:bg-zinc-100 md:focus-within:bg-black/20 transition-all border border-transparent focus-within:border-zinc-200 md:focus-within:border-white/5">
                        <Search className="w-4 h-4 text-zinc-300 md:text-zinc-700 group-focus-within:text-[#FACC15] md:group-focus-within:text-[#FEF9C3] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent ml-3 text-sm font-bold focus:outline-none w-full placeholder:text-zinc-300 md:placeholder:text-zinc-800 text-black md:text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2.5 md:px-2.5 no-scrollbar pb-32">
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
                                        onPreviewImage={setPreviewImage}
                                        onToggleStar={() => toggleStar(conv._id)}
                                        isStarred={starredIds.has(conv._id)}
                                        onToggleArchive={() => toggleArchive(conv._id)}
                                        isArchived={archivedIds.has(conv._id)}
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
                                        onPreviewImage={setPreviewImage}
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

                {/* WhatsApp-style Sticky Plus Button */}
                <button
                    onClick={() => setIsGroupModalOpen(true)}
                    className="absolute bottom-32 md:bottom-10 right-8 w-8 h-8 bg-[#FEF9C3] hover:opacity-90 text-[#111827] rounded-md hidden md:flex items-center justify-center z-[60] group shadow-xl transition-all active:scale-95"
                    title="New Group"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                </button>

                {/* Mobile Navigation */}
                <div className="absolute bottom-16 left-0 w-full px-8 pointer-events-none md:hidden">
                    <div className="bg-black py-2.5 px-8 rounded-full flex items-center justify-between shadow-2xl pointer-events-auto border border-white/10">
                        <button
                            onClick={() => { setActiveTab("chats"); setViewMode("all"); }}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chats' && viewMode === 'all' ? 'text-white' : 'text-zinc-600'}`}
                        >
                            <Inbox className="w-4.5 h-4.5" />
                            <span className="text-[8px] font-bold">All</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("people")}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'people' ? 'text-white' : 'text-zinc-600'}`}
                        >
                            <Users className="w-4.5 h-4.5" />
                            <span className="text-[8px] font-bold">Members</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab("chats"); setViewMode("favorites"); }}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chats' && viewMode === 'favorites' ? 'text-accent-star' : 'text-zinc-600'}`}
                        >
                            <Star className="w-4.5 h-4.5" />
                            <span className="text-[8px] font-bold">Starred</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab("chats"); setViewMode("archived"); }}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chats' && viewMode === 'archived' ? 'text-indigo-400' : 'text-zinc-600'}`}
                        >
                            <Archive className="w-4.5 h-4.5" />
                            <span className="text-[8px] font-bold">Archive</span>
                        </button>
                    </div>
                </div>

                {/* Profile Image Preview Modal */}
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <button className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={previewImage}
                            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-300"
                            alt="Preview"
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

