"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, Search, Check, Users, Camera, Loader2, Plus, Sparkles, Image as ImageIcon } from "lucide-react";

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const allUsers = useQuery(api.users.getAllUsers);
    const createGroup = useMutation(api.conversations.createGroupConversation);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const [groupName, setGroupName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const filteredUsers = allUsers?.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName || selectedUsers.length === 0) return;

        setIsSubmitting(true);
        try {
            let groupImageStorageId = undefined;

            // Upload image if selected
            if (selectedImage) {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedImage.type },
                    body: selectedImage,
                });
                const { storageId } = await result.json();
                groupImageStorageId = storageId;
            }

            await createGroup({
                groupName,
                memberIds: selectedUsers as any,
                groupImageStorageId,
            });

            handleClose();
        } catch (error) {
            console.error("Failed to create group", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setGroupName("");
        setSelectedUsers([]);
        setSearchQuery("");
        setSelectedImage(null);
        setImagePreview(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0b141b] w-full max-w-md border border-zinc-800 rounded-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-zinc-900 bg-zinc-900/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-[#FEF9C3]/10 flex items-center justify-center border border-[#FEF9C3]/20">
                                <Users className="w-5 h-5 text-[#FEF9C3]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">New Group</h2>
                                <p className="text-xs font-medium text-zinc-500">Create a space for everyone</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Group Identity */}
                    <div className="flex items-center gap-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative group flex-shrink-0 cursor-pointer"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                            />

                            <div className="w-20 h-20 rounded-md bg-zinc-900 flex items-center justify-center border-2 border-dashed border-zinc-800 group-hover:border-[#FEF9C3]/50 transition-all overflow-hidden relative">
                                {imagePreview ? (
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <Camera className="w-8 h-8 text-zinc-700 group-hover:text-[#FEF9C3] transition-colors" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <ImageIcon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FEF9C3] rounded-full border-4 border-[#0b141b] flex items-center justify-center shadow-lg">
                                <Plus className="w-3 h-3 text-[#111827]" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Group Name</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Team Awesome"
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-3 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FEF9C3]/50 focus:ring-4 focus:ring-[#FEF9C3]/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Add Members</label>
                            <span className="text-[10px] font-bold text-[#FACC15] bg-[#FACC15]/10 px-2 py-0.5 rounded-full border border-[#FACC15]/20">
                                {selectedUsers.length} selected
                            </span>
                        </div>

                        {/* Search */}
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#FACC15] transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search friends..."
                                className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-md pl-10 pr-4 py-3 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FACC15]/30 focus:bg-zinc-900/50 transition-all"
                            />
                        </div>

                        {/* User List */}
                        <div className="max-h-[250px] overflow-y-auto space-y-1 pr-2 stealth-scrollbar">
                            {allUsers === undefined ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-shimmer">
                                        <div className="w-10 h-10 rounded-full bg-zinc-900" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-24 bg-zinc-900 rounded-lg" />
                                            <div className="h-3 w-32 bg-zinc-900/50 rounded-lg" />
                                        </div>
                                    </div>
                                ))
                            ) : filteredUsers?.length === 0 ? (
                                <div className="text-center py-10 space-y-2">
                                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                        <Search className="w-5 h-5 text-zinc-700" />
                                    </div>
                                    <p className="text-sm font-bold text-zinc-500">No friends found</p>
                                </div>
                            ) : (
                                filteredUsers?.map((user) => {
                                    const isSelected = selectedUsers.includes(user._id);
                                    return (
                                        <button
                                            key={user._id}
                                            onClick={() => toggleUser(user._id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-md transition-all group relative ${isSelected
                                                ? 'bg-[#FACC15]/10 border border-[#FACC15]/20'
                                                : 'hover:bg-zinc-900/50 border border-transparent'
                                                }`}
                                        >
                                            <div className="relative">
                                                <img src={user.image} className="w-10 h-10 rounded-full object-cover shadow-sm grayscale-[0.3] group-hover:grayscale-0 transition-all" alt="" />
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FACC15] rounded-full border-2 border-[#0b141b] flex items-center justify-center">
                                                        <Check className="w-2.5 h-2.5 text-[#111827] stroke-[4]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className={`text-sm font-bold tracking-tight ${isSelected ? 'text-[#FACC15]' : 'text-zinc-200'}`}>
                                                    {user.name}
                                                </p>
                                                <p className="text-[11px] font-medium text-zinc-500 truncate w-40">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-zinc-900/50 border-t border-zinc-900 mt-2">
                    <button
                        onClick={handleCreateGroup}
                        disabled={!groupName || selectedUsers.length === 0 || isSubmitting}
                        className={`w-full py-4 rounded-md font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 group ${!groupName || selectedUsers.length === 0 || isSubmitting
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                            : 'bg-white text-black hover:bg-white/90'
                            }`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Create Group Chat
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
