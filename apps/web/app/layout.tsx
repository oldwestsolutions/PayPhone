import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { IdentityProvider } from "@/components/IdentityProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "payphone.cc",
  description:
    "DID-authenticated WebRTC signaling and trustless settlement for verified marketplaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen`}>
        <IdentityProvider>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-zinc-800/80 bg-black/40 backdrop-blur-sm">
              <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
                <a href="/" className="text-lg tracking-tight font-semibold">
                  payphone<span className="text-accent">.cc</span>
                </a>
                <nav className="flex gap-4 text-sm text-zinc-400">
                  <a className="hover:text-zinc-100" href="/">
                    Marketplace
                  </a>
                  <a className="hover:text-zinc-100" href="/dashboard">
                    Dashboard
                  </a>
                </nav>
              </div>
            </header>
            <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
              Old West Solutions LLC — signaling only; media is peer‑to‑peer
              encrypted.
            </footer>
          </div>
        </IdentityProvider>
      </body>
    </html>
  );
}
