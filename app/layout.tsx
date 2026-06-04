import type { Metadata } from "next";
import WalletProvider from "./wallet-provider";
import WalletButton from "./components/WalletButton";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://base-penalty-league.vercel.app"),

  title: "Base Penalty League",

  description:
    "Multiplayer football penalty shootout game built on Base.",

  openGraph: {
    title: "Base Penalty League",

    description:
      "Create rooms, compete in penalty shootouts, earn XP, unlock leagues and climb the rankings.",

    url: "https://base-penalty-league.vercel.app",

    siteName: "Base Penalty League",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Base Penalty League",
      },
    ],

    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title: "Base Penalty League",

    description:
      "Multiplayer football penalty shootout game built on Base.",

    images: ["/og-image.png"],
  },

  other: {
    "base:app_id": "6a203fbe4fbf682eb25dc106",

    "fc:frame": JSON.stringify({
      version: "next",

      imageUrl:
        "https://base-penalty-league.vercel.app/og-image.png",

      button: {
        title: "Play Base Penalty League",

        action: {
          type: "launch_frame",

          name: "Base Penalty League",

          url: "https://base-penalty-league.vercel.app",
        },
      },
    }),
  },
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
