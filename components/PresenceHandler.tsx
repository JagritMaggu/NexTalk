"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function PresenceHandler() {
    const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);
    const { isSignedIn } = useAuth();

    useEffect(() => {
        if (!isSignedIn) return;

        // Set online when component mounts
        updateOnlineStatus({ isOnline: true });

        // Set offline on tab close or browser navigation
        const handleBeforeUnload = () => {
            updateOnlineStatus({ isOnline: false });
        };

        // Handle page visibility change
        const handleVisibilityChange = () => {
            updateOnlineStatus({ isOnline: document.visibilityState === "visible" });
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            // Optional: Also set offline when unmounting (though usually layout/provider doesn't unmount)
            updateOnlineStatus({ isOnline: false });
        };
    }, [isSignedIn, updateOnlineStatus]);

    return null;
}
