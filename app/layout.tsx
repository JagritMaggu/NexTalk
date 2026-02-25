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
  title: "ChatApp | Connect Real-time",
  description: "A premium real-time chat application built with Convex and Clerk",
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
        variables: { colorPrimary: "#6c47ff" },
        elements: {
          card: "shadow-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl",
          headerTitle: "text-2xl font-bold tracking-tight",
          socialButtonsBlockButton: "border-white/10 hover:bg-white/5 transition-all",
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
