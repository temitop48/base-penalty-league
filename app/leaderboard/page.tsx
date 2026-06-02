"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";

type Profile = {
  username: string;
  wins: number;
  goals: number;
  matches: number;
};

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const saved = localStorage.getItem("bpl_profile");
    if (saved) {
     
      setPlayers([JSON.parse(saved)]);
    }
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <p className="text-slate-400">Loading leaderboard...</p>
      </main>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.goals - a.goals;
  });

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <section className="relative mx-auto max-w-4xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        <Link href="/" className="relative text-sm text-blue-300">
          ← Back home
        </Link>

        <div className="relative mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              League Table
            </p>
            <h1 className="mt-2 text-4xl font-black">Leaderboard</h1>
          </div>

          <Link
            href="/create"
            className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500"
          >
            Play Match
          </Link>
        </div>

        <div className="relative mt-8 rounded-4xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl">
          {sortedPlayers.length === 0 ? (
            <div className="rounded-3xl bg-slate-950/80 p-8 text-center">
              <p className="text-2xl font-black">No players yet</p>
              <p className="mt-2 text-slate-400">
                Create a profile and finish a match to enter the table.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => {
                const winRate = player.matches
                  ? Math.round((player.wins / player.matches) * 100)
                  : 0;

                const badge =
                  index === 0
                    ? "Champion"
                    : player.wins >= 5
                      ? "Elite"
                      : player.wins >= 2
                        ? "Contender"
                        : "Rookie";

                return (
                  <div
                    key={player.username}
                    className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 sm:grid-cols-[0.4fr_1.4fr_1fr]"
                  >
                    <div className="flex items-center">
                      <div className="rounded-2xl bg-blue-500/10 px-4 py-3 text-center">
                        <p className="text-xs text-slate-400">Rank</p>
                        <p className="text-2xl font-black text-blue-300">
                          #{index + 1}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
                        {badge}
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {player.username}
                      </p>
                      <p className="text-sm text-slate-400">
                        {player.matches} matches played
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <MiniStat label="Wins" value={player.wins} />
                      <MiniStat label="Goals" value={player.goals} />
                      <MiniStat label="Rate" value={`${winRate}%`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}