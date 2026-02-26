import type { Metadata } from "next";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexTalk — Premium Real-time Messaging",
  description: "Experience ultra-fast communication with NexTalk. A high-performance chat platform featuring seamless real-time synchronization, secure auth, and a stunning modern interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0b141b",
          colorInputBackground: "#0b141b",
          colorInputText: "white",
          colorText: "white",
          colorTextSecondary: "#a1a1aa",
          borderRadius: "0.5rem",
        },
        elements: {
          card: "border border-white/5 bg-[#0b141b] rounded-md overflow-hidden",
          navbar: "bg-[#0b141b]",
          headerTitle: "text-2xl font-black tracking-tighter text-white",
          headerSubtitle: "text-[11px] font-bold text-zinc-500 uppercase tracking-widest",
          socialButtonsBlockButton: "border-white/5 hover:bg-white/5 transition-all rounded-md",
          socialButtonsBlockButtonText: "font-bold text-xs",
          formFieldInput: "bg-[#0b141b] border-white/5 focus:border-indigo-500/50 transition-all rounded-md py-3 px-4",
          formButtonPrimary: "bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[11px] tracking-[0.2em] py-4 rounded-md shadow-xl transition-all active:scale-[0.98]",
          footerActionText: "text-zinc-500 font-medium",
          footerActionLink: "text-indigo-400 hover:text-indigo-300 font-bold",
          userButtonPopoverCard: "border border-white/5 bg-[#0b141b] rounded-md overflow-hidden",
          userButtonPopoverActionButton: "hover:bg-white/5 transition-all py-3.5",
          userButtonPopoverActionButtonText: "text-xs font-bold text-zinc-300",
          userButtonPopoverActionButtonIcon: "text-zinc-500",
          userButtonPopoverActionButton__signOut: "group",
          userButtonPopoverActionButtonText__signOut: "text-red-500",
          userButtonPopoverActionButtonIcon__signOut: "text-red-500",
          userButtonPopoverFooter: "hidden",
          userPreviewMainIdentifier: "text-sm font-black text-white",
          userPreviewSecondaryIdentifier: "text-[11px] font-bold text-zinc-500",
          userButtonAvatarBox: "rounded-md w-10 h-10",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}
        >
          <ConvexClientProvider>
            <main className="h-screen w-full overflow-hidden">{children}</main>
            <Toaster position="top-center" richColors expand={false} />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
