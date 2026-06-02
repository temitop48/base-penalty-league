"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";

type RoomPlayer = {
  id: string;
  username: string;
  wallet_address: string | null;
  goals: number;
  shots: number;
  joined_at: string;
  league: string | null;
  badge_count: number | null;
  xp: number | null;
  game_balance: number | null;
};

type Room = {
  room_code: string;
  host_wallet: string | null;
  status: "waiting" | "live" | "completed" | string;
  max_players: number;
  winner_username: string | null;
  stake_tier: string | null;
  custom_stake: string | null;
};

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();

  const roomCode = searchParams.get("room") || "";

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------
  // HOST DETECTION
  // Only the wallet that created the room can start the match.
  // --------------------------------------
  const isHost =
    !!room?.host_wallet &&
    !!address &&
    room.host_wallet.toLowerCase() === address.toLowerCase();

  // --------------------------------------
  // MATCH RESULT DERIVED DATA
  // Used to show finished players and rank players by goals.
  // --------------------------------------
  const finishedPlayers = players.filter((player) => player.shots >= 5);

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return b.shots - a.shots;
  });

  const winnerLabel =
    room?.winner_username === "Draw"
      ? "Draw"
      : room?.winner_username || "Pending";

  // --------------------------------------
  // LOAD ROOM DETAILS
  // Fetches status, host wallet, max players, and winner.
  // --------------------------------------
  async function loadRoom() {
    if (!roomCode) {
      setError("No room code found.");
      setLoading(false);
      return;
    }

    const { data, error: roomError } = await supabase
      .from("rooms")
      .select(
        "room_code, host_wallet, status, max_players, winner_username, stake_tier, custom_stake",
      )
      .eq("room_code", roomCode)
      .single();

    if (roomError || !data) {
      setError("Room not found.");
      setLoading(false);
      return;
    }

    setRoom(data);
    setLoading(false);
  }

  // --------------------------------------
  // LOAD ROOM PLAYERS
  // Pulls players from Supabase and updates lobby list.
  // --------------------------------------
  async function loadPlayers() {
    if (!roomCode) return;

    const { data, error: playersError } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_code", roomCode)
      .order("joined_at", { ascending: true });

    if (playersError) {
      setError(playersError.message);
      return;
    }

    setPlayers(data ?? []);
  }

  // --------------------------------------
  // START MATCH
  // Host changes room status from waiting to live.
  // Realtime listener redirects players into the match page.
  // --------------------------------------
  async function startMatch() {
    if (!isHost) {
      setError("Only the room host can start this match.");
      return;
    }

    if (players.length < 2) {
      setError("You need at least 2 players to start.");
      return;
    }

    setStarting(true);
    setError("");

    const { error: updateError } = await supabase
      .from("rooms")
      .update({ status: "live" })
      .eq("room_code", roomCode);

    setStarting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push(`/game?room=${roomCode}`);
  }

  // --------------------------------------
  // REALTIME LOBBY SYNC
  // Reloads players and room status whenever Supabase changes.
  // --------------------------------------
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoom();

    loadPlayers();

    const channel = supabase
      .channel(`lobby-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${roomCode}`,
        },
        async () => {
          await loadPlayers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        async () => {
          await loadRoom();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // --------------------------------------
  // AUTO-ENTER LIVE MATCH
  // Players in a waiting lobby enter game when host starts.
  // Completed rooms stay on lobby to show final results.
  // --------------------------------------
 useEffect(() => {
  try {
    const savedProfile = localStorage.getItem("bpl_profile");
    const profile = savedProfile ? JSON.parse(savedProfile) : null;

    const currentPlayer = players.find(
      (player) => player.username === profile?.username,
    );

    const playerHasFinished = (currentPlayer?.shots ?? 0) >= 5;

    if (room?.status === "live" && players.length > 0 && !playerHasFinished) {
      router.push(`/game?room=${roomCode}`);
    }
  } catch {
    if (room?.status === "live" && players.length > 0) {
      router.push(`/game?room=${roomCode}`);
    }
  }
}, [room?.status, players, roomCode, router]);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <section className="relative mx-auto max-w-4xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mt-8 rounded-4xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
            Match Lobby
          </p>

          <h1 className="mt-3 text-4xl font-black">Room {roomCode}</h1>

          <p className="mt-3 text-slate-300">
            Waiting for players. Minimum 2 players, maximum 8 players.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-5">
            <Info title="Invite Code" text={roomCode || "No room"} />
            <Info title="Players" text={`${players.length}/8`} />
            <Info
              title="Finished"
              text={`${finishedPlayers.length}/${players.length}`}
            />
            <Info title="Status" text={room?.status || "loading"} />

            <Info
              title="Match Tier"
              text={
                room?.stake_tier === "Custom"
                  ? room.custom_stake || "Custom"
                  : room?.stake_tier || "Free"
              }
            />
          </div>

          <div className="mt-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Host Control
            </p>

            <p className="mt-2 text-slate-400">
              Only the wallet that created this room can start the match.
            </p>

            <p className="mt-3 break-all text-xs text-slate-500">
              Host wallet: {room?.host_wallet || "Not connected"}
            </p>

            <p className="mt-2 text-sm font-bold text-blue-300">
              {isHost ? "You are the host." : "Waiting for host to start."}
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-5">
            <p className="text-sm font-bold uppercase tracking-widest text-green-300">
              Prize-Free Match Tier
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {room?.stake_tier === "Custom"
                ? room.custom_stake || "Custom Tier"
                : room?.stake_tier || "Free Match"}
            </h2>

            <p className="mt-2 text-slate-400">
              This room uses a competitive tier system only. No real money moves
              in this MVP version.
            </p>
          </div>

          {room?.status === "completed" && (
            <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-green-300">
                Match Completed
              </p>

              <h2 className="mt-2 text-3xl font-black">
                {winnerLabel === "Draw"
                  ? "Final Result: Draw"
                  : `Winner: ${winnerLabel}`}
              </h2>
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">
                {room?.status === "completed" ? "Final Rankings" : "Players"}
              </h2>

              <p className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-blue-300">
                {players.length}/8
              </p>
            </div>

            {loading ? (
              <p className="mt-4 text-slate-400">Loading lobby...</p>
            ) : error ? (
              <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                {error}
              </p>
            ) : players.length === 0 ? (
              <p className="mt-4 text-slate-400">No players joined yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/80 p-5"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-widest text-blue-300">
                        Rank {index + 1}
                      </p>

                      <p className="mt-1 text-xl font-black">
                        {player.username}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">
                          {player.league || "Rookie League"}
                        </span>

                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">
                          {player.badge_count ?? 0} badges
                        </span>

                        <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300">
                          {player.xp ?? 0} XP
                        </span>

                        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-300">
                          ${player.game_balance ?? 200}
                        </span>
                      </div>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        {player.wallet_address || "No wallet attached"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`rounded-2xl px-4 py-2 text-sm font-black ${
                          player.shots >= 5
                            ? "bg-green-500/10 text-green-300"
                            : "bg-blue-500/10 text-blue-300"
                        }`}
                      >
                        {player.shots >= 5 ? "Finished" : "Joined"}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        {player.goals} goals / {player.shots} shots
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href={`/join?room=${roomCode}`}
              className="rounded-2xl border border-slate-700 px-6 py-4 text-center font-bold hover:bg-slate-800"
            >
              Invite Another Player
            </Link>

            {room?.status === "live" ? (
              <Link
                href={`/game?room=${roomCode}`}
                className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500"
              >
                Continue Match
              </Link>
            ) : room?.status === "completed" ? (
              <Link
                href="/create"
                className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500"
              >
                Create New Match
              </Link>
            ) : (
              <button
                onClick={startMatch}
                disabled={!isHost || players.length < 2 || starting}
                className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {starting
                  ? "Starting Match..."
                  : players.length < 2
                    ? "Need 2 Players"
                    : isHost
                      ? "Start Match"
                      : "Waiting for Host"}
              </button>
            )}
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
      <p className="break-all font-black">{text}</p>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense>
      <LobbyContent />
    </Suspense>
  );
}
