"use client";

import { useEffect } from "react";

export default function ConsoleFilter() {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") {
            const originalWarn = console.warn;
            console.warn = (...args: any[]) => {
                if (
                    args[0] &&
                    typeof args[0] === "string" &&
                    args[0].includes("Clerk: Clerk has been loaded with development keys")
                ) {
                    return;
                }
                originalWarn(...args);
            };
        }
    }, []);

    return null;
}
