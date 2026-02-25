"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Camera, UserPlus, Trash2, Shield, ShieldCheck, LogOut, Loader2, Save, Image as ImageIcon, FileText, ChevronRight, Video, Music, Paperclip } from "lucide-react";
import { toast } from "sonner";
import AddMemberModal from "./AddMemberModal";

interface GroupSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
}

export default function GroupSettingsModal({ isOpen, onClose, conversationId }: GroupSettingsModalProps) {
    const conversation = useQuery(api.conversations.getConversationById, { conversationId });
    const members = useQuery(api.conversations.getGroupMembers, { conversationId });
    const me = useQuery(api.users.getMe);
    const sharedMedia = useQuery(api.messages.getSharedMedia, { conversationId });

    const updateDetails = useMutation(api.conversations.updateGroupDetails);
    const manageMember = useMutation(api.conversations.manageGroupMember);
    const leaveGroup = useMutation(api.conversations.leaveGroup);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const deleteGroup = useMutation(api.conversations.deleteGroupConversation);

    const [groupName, setGroupName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (conversation?.groupName) {
            setGroupName(conversation.groupName);
        }
    }, [conversation]);

    if (!isOpen || !conversation) return null;

    const myRole = (members as any)?.find((m: any) => m._id === me?._id)?.role || "member";
    const canManage = myRole === "owner" || myRole === "admin";
    const isOwner = myRole === "owner";

    const handleSaveDetails = async () => {
        if (!canManage) return;
        setIsSaving(true);
        try {
            await updateDetails({
                conversationId,
                groupName: groupName.trim(),
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !canManage) return;

        setIsUploading(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            await updateDetails({
                conversationId,
                groupImageStorageId: storageId,
            });
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(true); // Small delay feel
            setTimeout(() => setIsUploading(false), 500);
        }
    };

    const handleMemberAction = async (targetUserId: Id<"users">, action: "remove" | "promote" | "demote") => {
        if (!canManage) return;
        if (action !== "remove" && !isOwner) return; // Only owner can promote/demote

        try {
            await manageMember({ conversationId, targetUserId, action });
            toast.success(action === "remove" ? "Member removed" : "Role updated");
        } catch (error: any) {
            toast.error(error.message || "Action failed");
            console.error(error);
        }
    };

    const handleLeaveGroup = async () => {
        toast.warning("Are you sure you want to leave this group?", {
            action: {
                label: "Leave Group",
                onClick: async () => {
                    setIsLeaving(true);
                    try {
                        await leaveGroup({ conversationId });
                        onClose();
                        toast.success("Left group successfully");
                    } catch (error: any) {
                        toast.error(error.message || "Failed to leave group");
                        console.error(error);
                    } finally {
                        setIsLeaving(false);
                    }
                }
            },
            cancel: {
                label: "Cancel",
                onClick: () => { }
            }
        });
    };

    const handleDeleteGroup = async () => {
        toast.error("PERMANENT ACTION: Delete this group?", {
            description: "No one will be able to send messages anymore.",
            action: {
                label: "Delete Group",
                onClick: async () => {
                    setIsDeleting(true);
                    try {
                        await deleteGroup({ conversationId });
                        onClose();
                        toast.success("Group deleted successfully");
                    } catch (error: any) {
                        toast.error(error.message || "Failed to delete group");
                        console.error(error);
                    } finally {
                        setIsDeleting(false);
                    }
                }
            },
            cancel: {
                label: "Cancel",
                onClick: () => { }
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0b141b] w-full max-w-md rounded-md border border-zinc-800 overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-zinc-900">
                    <h2 className="text-xl font-black tracking-tight text-white">Group Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-md transition-colors text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Image & Name Section */}
                    <div className="p-8 flex flex-col items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-md overflow-hidden bg-zinc-900 border-4 border-zinc-800 shadow-xl">
                                {isUploading ? (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    </div>
                                ) : (
                                    conversation.groupImage ? (
                                        <img src={conversation.groupImage} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white text-3xl font-black">
                                            {conversation.groupName?.charAt(0) || "G"}
                                        </div>
                                    )
                                )}
                            </div>
                            {canManage && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 p-3 bg-[#0b141b] border border-zinc-800 rounded-md shadow-lg text-indigo-500 active:scale-95 transition-all"
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        </div>

                        <div className="w-full space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Group Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    disabled={!canManage}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50 placeholder:text-zinc-600"
                                    placeholder="Enter group name..."
                                />
                                {canManage && groupName !== conversation.groupName && (
                                    <button
                                        onClick={handleSaveDetails}
                                        disabled={isSaving}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 text-white rounded-md shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Media Shared Section */}
                        <div className="w-full space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Media, Links and Docs</label>
                                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest cursor-pointer">
                                    {(sharedMedia as any)?.length || 0} <ChevronRight className="w-3 h-3" />
                                </div>
                            </div>

                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                {sharedMedia === undefined ? (
                                    Array(4).fill(0).map((_, i) => (
                                        <div key={i} className="min-w-[80px] h-20 rounded-xl bg-zinc-100 animate-pulse" />
                                    ))
                                ) : (sharedMedia as any).length === 0 ? (
                                    <div className="w-full py-6 flex flex-col items-center justify-center bg-zinc-900/30 rounded-md border border-dashed border-zinc-800 uppercase tracking-widest">
                                        <ImageIcon className="w-6 h-6 text-zinc-800 mb-1" />
                                        <p className="text-[9px] font-black text-zinc-700">No Media Found</p>
                                    </div>
                                ) : (
                                    (sharedMedia as any).map((media: any) => (
                                        <a
                                            key={media._id}
                                            href={media.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-[80px] h-20 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-transform shrink-0 hover:bg-zinc-800/50"
                                        >
                                            {media.fileType === 'image' ? (
                                                <img src={media.url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-2 text-center w-full bg-zinc-900/50">
                                                    <div className="p-1.5 bg-zinc-800 rounded-md shadow-sm mb-1 text-zinc-400">
                                                        {(media.fileType === 'video' || media.content?.toLowerCase().includes('video')) ? <Video className="w-3.5 h-3.5" /> :
                                                            (media.fileType === 'audio' || media.content?.toLowerCase().includes('voice memo')) ? <Music className="w-3.5 h-3.5" /> :
                                                                (media.fileType === 'pdf' || media.content?.toLowerCase().includes('pdf')) ? <FileText className="w-3.5 h-3.5" /> :
                                                                    (media.fileType === 'archive' || media.content?.toLowerCase().includes('archive')) ? <Paperclip className="w-3.5 h-3.5" /> :
                                                                        <FileText className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter truncate w-full px-1">
                                                        {(media.fileType === 'video' || media.content?.toLowerCase().includes('video')) ? 'VIDEO' :
                                                            (media.fileType === 'audio' || media.content?.toLowerCase().includes('voice memo')) ? 'AUDIO' :
                                                                (media.fileType === 'pdf' || media.content?.toLowerCase().includes('pdf')) ? 'PDF' :
                                                                    (media.fileType === 'archive' || media.content?.toLowerCase().includes('archive')) ? 'ZIP' : 'DOC'}
                                                    </span>
                                                </div>
                                            )}
                                        </a>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-8 pb-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Members ({(members as any)?.length || 0})</label>
                            {canManage && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Add</span>
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {(members as any)?.map((member: any) => (
                                <div key={member._id} className="flex items-center justify-between p-3 rounded-md border border-zinc-900 hover:bg-zinc-900/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-900 shadow-sm">
                                            {member.image ? (
                                                <img src={member.image} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold">
                                                    {member.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{member.name} {member._id === me?._id && "(You)"}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {member.role === "owner" ? (
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-amber-500 flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                                        <ShieldCheck className="w-2.5 h-2.5" /> Creator
                                                    </span>
                                                ) : member.role === "admin" ? (
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-500 flex items-center gap-0.5 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
                                                        <Shield className="w-2.5 h-2.5" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1.5 py-0.5">Member</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions (Only for Creator or Admins for removal) */}
                                    {member._id !== me?._id && (
                                        <div className="flex items-center gap-1">
                                            {isOwner && (
                                                member.role === "admin" ? (
                                                    <button
                                                        onClick={() => handleMemberAction(member._id, "demote")}
                                                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                                                        title="Dismiss as Admin"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMemberAction(member._id, "promote")}
                                                        className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all"
                                                        title="Make Admin"
                                                    >
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </button>
                                                )
                                            )}

                                            {(isOwner || (canManage && member.role === "member")) && (
                                                <button
                                                    onClick={() => handleMemberAction(member._id, "remove")}
                                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                    title="Remove from Group"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-zinc-900 flex items-center gap-3">
                    {isOwner && (
                        <button
                            onClick={handleDeleteGroup}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-3.5 text-[9px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-500/5 hover:bg-red-500/10 rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-red-500/10"
                        >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Delete Group</span>
                        </button>
                    )}
                    <button
                        onClick={handleLeaveGroup}
                        disabled={isLeaving}
                        className="flex-1 px-4 py-3.5 text-[9px] font-black text-white uppercase tracking-[0.2em] bg-red-600 hover:bg-red-700 rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-600/10"
                    >
                        {isLeaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                        <span>Leave Group</span>
                    </button>
                </div>
            </div>

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                conversationId={conversationId}
                existingMemberIds={conversation.participantIds}
            />
        </div>
    );
}
