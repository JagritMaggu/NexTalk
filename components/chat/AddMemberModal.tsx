"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Search, Check, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
    existingMemberIds: Id<"users">[];
}

export default function AddMemberModal({ isOpen, onClose, conversationId, existingMemberIds }: AddMemberModalProps) {
    const allUsers = useQuery(api.users.getAllUsers);
    const addMembers = useMutation(api.conversations.addGroupMembers);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const filteredUsers = allUsers?.filter(user =>
        !existingMemberIds.includes(user._id) &&
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const toggleUser = (userId: Id<"users">) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;

        setIsSubmitting(true);
        try {
            await addMembers({
                conversationId,
                newUserIds: selectedUsers,
            });
            toast.success(`Added ${selectedUsers.length} member(s)`);
            onClose();
            setSelectedUsers([]);
        } catch (error) {
            console.error("Failed to add members", error);
            toast.error("Failed to add members");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0b141b] w-full max-w-md border border-zinc-800 rounded-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Add Members</h2>
                            <p className="text-[10px] font-bold text-zinc-500 mt-0.5">GROW YOUR CONVERSATION</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 transition-colors text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                    </div>

                    {/* User List */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 no-scrollbar">
                        {allUsers === undefined ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Finding Friends...</p>
                            </div>
                        ) : filteredUsers?.length === 0 ? (
                            <div className="text-center py-20 bg-zinc-900/20 rounded-md border border-dashed border-zinc-800">
                                <Users className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700">No one else to add</p>
                            </div>
                        ) : (
                            filteredUsers?.map((user) => {
                                const isSelected = selectedUsers.includes(user._id);
                                return (
                                    <button
                                        key={user._id}
                                        onClick={() => toggleUser(user._id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-md transition-all ${isSelected
                                            ? 'bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                                            : 'hover:bg-zinc-900 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 text-left min-w-0">
                                            <div className="relative shrink-0">
                                                <img src={user.image} className="w-12 h-12 rounded-full object-cover border-2 border-zinc-800" alt="" />
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full border-2 border-[#0b141b] flex items-center justify-center">
                                                        <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-black truncate ${isSelected ? 'text-indigo-400' : 'text-zinc-200'}`}>{user.name}</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-md border shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-800 bg-zinc-900/50'
                                            }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleAddMembers}
                            disabled={selectedUsers.length === 0 || isSubmitting}
                            className={`w-full py-5 rounded-md text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl ${selectedUsers.length === 0 || isSubmitting
                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-white/90 active:scale-[0.98]'
                                }`}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    ADD {selectedUsers.length} {selectedUsers.length === 1 ? 'MEMBER' : 'MEMBERS'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
