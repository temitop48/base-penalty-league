"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import SignedActionButton from "@/app/components/SignedActionButton";
import { supabase } from "@/lib/supabase";

type LocalProfile = {
  username?: string;
  wins?: number;
  goals?: number;
  matches?: number;
  walletAddress?: string;
  gameBalance?: number;
};

const stakeOptions = ["$4", "$8", "$16", "Custom"] as const;
type StakeOption = (typeof stakeOptions)[number];

function getPlayerLeague(wins: number) {
  if (wins >= 500) return "Diamond League";
  if (wins >= 300) return "Gold League";
  if (wins >= 150) return "Silver League";
  if (wins >= 50) return "Bronze League";
  return "Rookie League";
}

function getBadgeCount(profile: LocalProfile | null) {
  const wins = profile?.wins ?? 0;
  const goals = profile?.goals ?? 0;
  const matches = profile?.matches ?? 0;

  return [
    Boolean(profile?.username),
    matches >= 1,
    goals >= 3,
    wins >= 50,
    wins >= 150,
    wins >= 300,
    wins >= 500,
    goals >= 1000,
  ].filter(Boolean).length;
}

function getXp(profile: LocalProfile | null) {
  const wins = profile?.wins ?? 0;
  const goals = profile?.goals ?? 0;

  return wins * 100 + goals * 10;
}

function generateRoomCode() {
  const randomNumber = crypto.getRandomValues(new Uint32Array(1))[0] % 9000;
  return "BPL" + String(randomNumber + 1000);
}

export default function CreateMatchPage() {
  const { address } = useAccount();

  const [roomCode, setRoomCode] = useState("BPL0000");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [stakeTier, setStakeTier] = useState<StakeOption>("$4");
  const [customStake, setCustomStake] = useState("");

  const displayedStake =
    stakeTier === "Custom" ? customStake.trim() || "Custom" : stakeTier;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoomCode(generateRoomCode());
  }, []);

  async function createRoom() {
    if (roomCode === "BPL0000") {
      setError("Room code is still loading. Please wait.");
      return;
    }

    if (stakeTier === "Custom" && !customStake.trim()) {
      setError("Enter a custom match tier or choose $4, $8, or $16.");
      return;
    }

    setCreating(true);
    setError("");

    const { error: createError } = await supabase.from("rooms").insert({
      room_code: roomCode,
      host_wallet: address ?? null,
      status: "waiting",
      max_players: 8,
      stake_tier: stakeTier,
      custom_stake: stakeTier === "Custom" ? customStake.trim() : null,
    });

    if (!createError) {
      const savedProfile = localStorage.getItem("bpl_profile");
      const profile: LocalProfile | null = savedProfile
        ? JSON.parse(savedProfile)
        : null;

      await supabase.from("room_players").insert({
        room_code: roomCode,
        username: profile?.username || "Host Player",
        wallet_address: profile?.walletAddress || address || null,
        goals: 0,
        shots: 0,
        league: getPlayerLeague(profile?.wins ?? 0),
        badge_count: getBadgeCount(profile),
        xp: getXp(profile),
        game_balance: profile?.gameBalance ?? 200,
      });
    }

    setCreating(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    window.location.href = `/lobby?room=${roomCode}`;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <section className="relative mx-auto max-w-4xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mt-8 rounded-4xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
            Match Lobby
          </p>

          <h1 className="mt-3 text-4xl font-black">Create Match</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Create a room, invite friends, and start a five-shot penalty battle.
          </p>

          <div className="mt-8 rounded-4xl border border-blue-500/30 bg-blue-500/10 p-8 text-center">
            <p className="text-sm text-slate-300">Room Code</p>

            <h2 className="mt-3 text-5xl font-black tracking-widest text-blue-300">
              {roomCode}
            </h2>

            <p className="mt-3 text-sm text-slate-400">
              Share this code with players joining your match.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-5">
            <p className="text-sm font-bold uppercase tracking-widest text-green-300">
              Prize-Free Stake Mode
            </p>

            <h3 className="mt-2 text-2xl font-black">Choose Match Tier</h3>

            <p className="mt-2 text-slate-400">
              This is a competitive room tier only. No real money moves in this
              MVP.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {stakeOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setStakeTier(option)}
                  className={`rounded-2xl px-5 py-4 font-black transition ${
                    stakeTier === option
                      ? "bg-green-400 text-green-950"
                      : "bg-slate-950/80 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {stakeTier === "Custom" && (
              <input
                value={customStake}
                onChange={(event) => setCustomStake(event.target.value)}
                placeholder="Example: $25 room tier"
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-white outline-none focus:border-green-500"
              />
            )}

            <div className="mt-4 rounded-2xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Selected Tier</p>
              <p className="mt-1 text-2xl font-black text-green-300">
                {displayedStake}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Web3 Match Proof
            </p>

            <p className="mt-2 text-slate-400">
              Sign a wallet message to prove you created this match room.
            </p>

            <div className="mt-4">
              <SignedActionButton
                action={`Create match room ${roomCode} with prize-free tier ${displayedStake}`}
                label="Sign Create Match"
                className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Info title="Players" text="2 to 8 players" />
            <Info title="Format" text="5 penalties each" />
            <Info title="Tier" text={displayedStake} />
          </div>

          {error && (
            <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              onClick={createRoom}
              disabled={creating || roomCode === "BPL0000"}
              className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {creating ? "Creating Room..." : "Start Match"}
            </button>

            <Link
              href={`/join?room=${roomCode}`}
              className={`rounded-2xl border border-slate-700 px-6 py-4 text-center font-bold hover:bg-slate-800 ${
                roomCode === "BPL0000" ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Open Invite Page
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/80 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="font-black">{text}</p>
    </div>
  );
}