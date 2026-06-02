"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import SignedActionButton from "@/app/components/SignedActionButton";
import { supabase } from "@/lib/supabase";

type Profile = {
  username?: string;
  wins?: number;
  goals?: number;
  matches?: number;
  walletAddress?: string;
  gameBalance?: number;
};

type Room = {
  room_code: string;
  max_players: number;
  status: string;
  stake_tier: string | null;
  custom_stake: string | null;
};

function getPlayerLeague(wins: number) {
  if (wins >= 500) return "Diamond League";
  if (wins >= 300) return "Gold League";
  if (wins >= 150) return "Silver League";
  if (wins >= 50) return "Bronze League";
  return "Rookie League";
}

function getBadgeCount(profile: Profile | null) {
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

function getXp(profile: Profile | null) {
  const wins = profile?.wins ?? 0;
  const goals = profile?.goals ?? 0;

  return wins * 100 + goals * 10;
}

function getLocalProfile(): Profile | null {
  try {
    const saved = localStorage.getItem("bpl_profile");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function getRoomStake(room: Room) {
  const rawStake =
    room.stake_tier === "Custom"
      ? room.custom_stake || "0"
      : room.stake_tier || "0";

  const amount = Number(String(rawStake).replace(/[^0-9.]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

export default function JoinMatchPage() {
  const router = useRouter();
  const { address } = useAccount();

  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanRoomCode = roomCode.trim().toUpperCase();

    if (!cleanRoomCode) {
      setError("Enter a room code first.");
      return;
    }

    setJoining(true);
    setError("");

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("room_code, max_players, status, stake_tier, custom_stake")
      .eq("room_code", cleanRoomCode)
      .single();

    if (roomError || !room) {
      setJoining(false);
      setError("Room not found. Check the code and try again.");
      return;
    }

    if (room.status !== "waiting") {
      setJoining(false);
      setError("This match has already started.");
      return;
    }

    const { count, error: countError } = await supabase
      .from("room_players")
      .select("*", { count: "exact", head: true })
      .eq("room_code", cleanRoomCode);

    if (countError) {
      setJoining(false);
      setError(countError.message);
      return;
    }

    if ((count ?? 0) >= room.max_players) {
      setJoining(false);
      setError("Room is full. Maximum is 8 players.");
      return;
    }

    const profile = getLocalProfile();
    const playerBalance = profile?.gameBalance ?? 200;
    const roomStake = getRoomStake(room);

    if (playerBalance < roomStake) {
      setJoining(false);
      setError(`You need at least $${roomStake} balance to join this room.`);
      return;
    }

    const username =
      profile?.username || `Player-${Math.floor(1000 + Math.random() * 9000)}`;

    const walletAddress = profile?.walletAddress || address || null;

    const { error: joinError } = await supabase.from("room_players").insert({
      room_code: cleanRoomCode,
      username,
      wallet_address: walletAddress,
      goals: 0,
      shots: 0,
      league: getPlayerLeague(profile?.wins ?? 0),
      badge_count: getBadgeCount(profile),
      xp: getXp(profile),
      game_balance: playerBalance,
    });

    setJoining(false);

    if (joinError) {
      setError(joinError.message);
      return;
    }

    router.push(`/lobby?room=${cleanRoomCode}`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <section className="relative mx-auto max-w-4xl">
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mt-8 rounded-4xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
            Join Lobby
          </p>

          <h1 className="mt-3 text-4xl font-black">Join Match</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Enter the room code shared by your friend and step into the penalty
            arena.
          </p>

          <form onSubmit={joinRoom} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-300">
                Room Code
              </label>

              <input
                name="room"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="Example: BPL1234"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-lg font-bold uppercase tracking-widest text-white outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-sm text-slate-500">
                Room codes usually start with BPL, for example BPL4821.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Info title="Players" text="2 to 8" />
              <Info title="Shots" text="5 each" />
              <Info title="Goal" text="Top scorer wins" />
            </div>

            <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                Web3 Join Proof
              </p>

              <p className="mt-2 text-slate-400">
                Sign a wallet message to prove you joined a match room.
              </p>

              <div className="mt-4">
                <SignedActionButton
                  action={`Join match room ${roomCode || "unknown"}`}
                  label="Sign Join Match"
                  className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {joining ? "Joining Match..." : "Join Match"}
            </button>
          </form>
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