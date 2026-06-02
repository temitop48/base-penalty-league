import type { Metadata } from "next";
import WalletProvider from "./wallet-provider";
import WalletButton from "./components/WalletButton";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Penalty League",
  description: "A 2D penalty shootout game built for Base.",
};

function Navbar() {
  return (
    <nav className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4 text-white shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-lg font-black text-blue-300">
          ⚽ Base Penalty League
        </Link>

        

          <div className="flex flex-wrap gap-3 text-sm font-bold">
            <Link href="/create" className="text-slate-300 hover:text-blue-300">
              Create
            </Link>
            <Link href="/join" className="text-slate-300 hover:text-blue-300">
              Join
            </Link>
            <Link
              href="/profile"
              className="text-slate-300 hover:text-blue-300"
            >
              Profile
            </Link>
            <Link
              href="/leaderboard"
              className="text-slate-300 hover:text-blue-300"
            >
              Leaderboard
            </Link>

            <WalletButton />
          </div>
        </div>
      
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Navbar />
          <div className="pt-24">{children}</div>
        </WalletProvider>
      </body>
    </html>
  );
}
