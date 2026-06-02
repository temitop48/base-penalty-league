"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";

const directions = ["Left", "Center", "Right"] as const;
type Direction = (typeof directions)[number];

type Profile = {
  username: string;
  wins: number;
  goals: number;
  matches: number;
  gameBalance?: number;
  lastReloadAt?: string;
};

type MatchHistory = {
  room: string;
  goals: number;
  result: "Win" | "Loss";
  playedAt: string;
};

type RoomPrizeInfo = {
  stake_tier: string | null;
  custom_stake: string | null;
};

function getStakeAmount(roomInfo: RoomPrizeInfo | null) {
  if (!roomInfo) return 0;

  const rawStake =
    roomInfo.stake_tier === "Custom"
      ? roomInfo.custom_stake || "0"
      : roomInfo.stake_tier || "0";

  const numberOnly = rawStake.replace(/[^0-9.]/g, "");
  const amount = Number(numberOnly);

  return Number.isFinite(amount) ? amount : 0;
}

function applyLocalBalanceChange(change: number) {
  try {
    const saved = localStorage.getItem("bpl_profile");
    if (!saved) return;

    const profile: Profile = JSON.parse(saved);
    const currentBalance = profile.gameBalance ?? 200;

    const updatedProfile: Profile = {
      ...profile,
      gameBalance: Math.max(currentBalance + change, 0),
    };

    localStorage.setItem("bpl_profile", JSON.stringify(updatedProfile));
  } catch {
    // Local balance update failed silently to avoid breaking match completion.
  }
}

type RoomPlayerScore = {
  username: string;
  goals: number;
  shots: number;
};

function GameContent() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") || "BPL0000";
  const { address } = useAccount();

  // --------------------------------------
  // LOCAL GAME STATE
  // Tracks this browser's current penalty session.
  // --------------------------------------
  const [shots, setShots] = useState(0);
  const [goals, setGoals] = useState(0);
  const [finished, setFinished] = useState(false);
  const [alreadyFinished, setAlreadyFinished] = useState(false);
  const [lastShot, setLastShot] = useState<Direction | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(
    null,
  );
  const [power, setPower] = useState(50);
  const [keeperDive, setKeeperDive] = useState<Direction | null>("Center");
  const [keeperPosition, setKeeperPosition] = useState<Direction>("Center");
  const [shotResult, setShotResult] = useState<"Goal" | "Save" | "Miss" | null>(
    null,
  );
  const [message, setMessage] = useState("Choose your shot direction.");

  // --------------------------------------
  // POWER BAR SYSTEM
  // Automatically cycles shot power.
  // --------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setPower((prev) => {
        const next = prev + 5;
        return next > 100 ? 10 : next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // --------------------------------------
  // GOALKEEPER MOVEMENT SYSTEM
  // Moves the keeper before each shot to make timing matter.
  // --------------------------------------
  useEffect(() => {
    if (finished) return;

    const movement = setInterval(() => {
      const next =
        directions[
          crypto.getRandomValues(new Uint32Array(1))[0] % directions.length
        ];

      setKeeperPosition(next);
    }, 350);

    return () => clearInterval(movement);
  }, [finished]);

  useEffect(() => {
    async function checkIfPlayerFinished() {
      try {
        const savedProfile = localStorage.getItem("bpl_profile");
        const profile = savedProfile ? JSON.parse(savedProfile) : null;

        if (!profile?.username || !room || room === "BPL0000") return;

        const { data } = await supabase
          .from("room_players")
          .select("shots")
          .eq("room_code", room)
          .eq("username", profile.username)
          .single();

        if ((data?.shots ?? 0) >= 5) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAlreadyFinished(true);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFinished(true);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMessage(
            "You have already completed this match. View room results.",
          );
        }
      } catch {
        // Ignore check failure so gameplay does not crash.
      }
    }

    checkIfPlayerFinished();
  }, [room]);

  // --------------------------------------
  // LOCAL PROFILE SAVE
  // Updates browser-stored player stats and match history.
  // --------------------------------------
  function saveResult(finalGoals: number) {
    const saved = localStorage.getItem("bpl_profile");

    if (!saved) {
      setMessage("Match finished. Create a profile to save stats.");
      return;
    }

    const profile: Profile = JSON.parse(saved);

    const updatedProfile: Profile = {
      ...profile,
      goals: profile.goals + finalGoals,
      matches: profile.matches + 1,
      wins: profile.wins + (finalGoals >= 3 ? 1 : 0),
    };

    localStorage.setItem("bpl_profile", JSON.stringify(updatedProfile));

    const existingHistory = localStorage.getItem("bpl_match_history");

    const history: MatchHistory[] = existingHistory
      ? JSON.parse(existingHistory)
      : [];

    const newMatch: MatchHistory = {
      room,
      goals: finalGoals,
      result: finalGoals >= 3 ? "Win" : "Loss",
      playedAt: new Date().toLocaleString(),
    };

    history.unshift(newMatch);
    localStorage.setItem("bpl_match_history", JSON.stringify(history));
  }

  // --------------------------------------
  // VISUAL RESET
  // Clears goal/save/miss animation after a short delay.
  // --------------------------------------
  function clearShotVisuals() {
    setTimeout(() => {
      setShotResult(null);
      setKeeperDive(null);
      setLastShot(null);
    }, 900);
  }

  // --------------------------------------
  // PLAYER IDENTITY
  // Reads local profile username for Supabase score saving.
  // --------------------------------------
  function getLocalUsername() {
    try {
      const saved = localStorage.getItem("bpl_profile");
      const profile = saved ? JSON.parse(saved) : null;

      return profile?.username || null;
    } catch {
      return null;
    }
  }

  // --------------------------------------
  // MULTIPLAYER ROOM COMPLETION
  // Checks if all players finished and saves the winner.
  // --------------------------------------
  async function completeRoomIfReady() {
    if (!room || room === "BPL0000") return;

    const { data: roomPlayers, error: playersError } = await supabase
      .from("room_players")
      .select("username, goals, shots, game_balance")
      .eq("room_code", room);

    if (playersError || !roomPlayers || roomPlayers.length === 0) {
      return;
    }

    const typedPlayers = roomPlayers as RoomPlayerScore[];
    const allFinished = typedPlayers.every((player) => player.shots >= 5);

    if (!allFinished) {
      return;
    }

    const winner = [...typedPlayers].sort((a, b) => b.goals - a.goals)[0];

    const sortedPlayers = [...roomPlayers].sort((a, b) => b.goals - a.goals);

    const topScore = sortedPlayers[0]?.goals ?? 0;

    const topPlayers = sortedPlayers.filter(
      (player) => player.goals === topScore,
    );

    const winnerUsername =
      topPlayers.length === 1 ? topPlayers[0].username : "Draw";

    const { data: roomInfo } = await supabase
      .from("rooms")
      .select("stake_tier, custom_stake")
      .eq("room_code", room)
      .single();

    const stakeAmount = getStakeAmount(roomInfo);

    if (winnerUsername !== "Draw" && stakeAmount > 0) {
      const loserCount = roomPlayers.length - 1;

      for (const player of roomPlayers) {
        const isWinner = player.username === winnerUsername;

        const balanceChange = isWinner
          ? stakeAmount * loserCount
          : -stakeAmount;

        await supabase
          .from("room_players")
          .update({
            game_balance: Math.max(
              ((player as { game_balance?: number }).game_balance ?? 200) +
                balanceChange,
              0,
            ),
          })
          .eq("room_code", room)
          .eq("username", player.username);

        if (player.username === getLocalUsername()) {
          applyLocalBalanceChange(balanceChange);
        }
      }
    }

    await supabase
      .from("rooms")
      .update({
        status: "completed",
        winner_username: winnerUsername,
      })
      .eq("room_code", room);
  }

  // --------------------------------------
  // SUPABASE SCORE SAVE
  // Saves this player's final score into the shared room.
  // --------------------------------------
  async function saveRoomScore(finalGoals: number) {
    const username = getLocalUsername();

    if (!room || room === "BPL0000" || !username) return;

    const { data: existingPlayer } = await supabase
      .from("room_players")
      .select("shots")
      .eq("room_code", room)
      .eq("username", username)
      .single();

    if ((existingPlayer?.shots ?? 0) >= 5) {
      setAlreadyFinished(true);
      setMessage("You have already completed this match.");
      return;
    }

    const query = supabase
      .from("room_players")
      .update({
        goals: finalGoals,
        shots: 5,
      })
      .eq("room_code", room)
      .eq("username", username);

    const { error: updateError } = await query;

    if (updateError) {
      console.error("Failed to update room score:", updateError);
      setMessage(
        "Score saved locally, but Supabase update failed. Check network.",
      );
      return;
    }

    const { error: scoreError } = await supabase.from("match_scores").insert({
      room_code: room,
      username,
      wallet_address: address ?? null,
      goals: finalGoals,
      shots: 5,
      result: finalGoals >= 3 ? "Win" : "Loss",
    });

    if (scoreError) {
      console.error("Failed to save match score:", scoreError.message);
    }

    await completeRoomIfReady();
  }

  // --------------------------------------
  // MATCH FINISH
  // Runs all local and multiplayer save actions.
  // --------------------------------------
  function finishMatch(finalGoals: number) {
    setFinished(true);
    saveResult(finalGoals);
    saveRoomScore(finalGoals);

    setMessage(
      finalGoals >= 3
        ? `🏆 Match finished. You won with ${finalGoals} goals!`
        : `⚽ Match finished. You scored ${finalGoals} goals.`,
    );
  }

  // --------------------------------------
  // SHOT RESOLUTION
  // Calculates goal/save based on direction, keeper, and power.
  // --------------------------------------
  function shoot(direction: Direction) {
    if (finished || alreadyFinished) {
      setMessage("You have already completed this match.");
      return;
    }

    setLastShot(direction);
    setShotResult(null);

    const keeperDirection = keeperPosition;
    const perfectPower = power >= 35 && power <= 88;
    const scored = direction !== keeperDirection && perfectPower;

    setKeeperDive(keeperDirection);
    setShotResult(scored ? "Goal" : "Save");
    clearShotVisuals();

    const nextShots = shots + 1;
    const nextGoals = scored ? goals + 1 : goals;

    setShots(nextShots);
    setGoals(nextGoals);

    if (nextShots >= 5) {
      finishMatch(nextGoals);
      return;
    }

    setMessage(
      scored
        ? `⚽ GOAL! Perfect strike. Keeper moved ${keeperDirection}.`
        : !perfectPower
          ? "⚠️ Weak shot! You need better power."
          : `🧤 Saved! Keeper covered ${keeperDirection}.`,
    );
  }

  // --------------------------------------
  // MISS SHOT
  // Handles overpower shots that go over the bar.
  // --------------------------------------
  function missShot(direction: Direction) {
    if (finished || alreadyFinished) {
      setMessage("You have already completed this match.");
      return;
    }

    const nextShots = shots + 1;

    setShots(nextShots);
    setLastShot(direction);
    setShotResult("Miss");
    setMessage("🚀 Too much power! Ball over the bar.");
    clearShotVisuals();

    if (nextShots >= 5) {
      finishMatch(goals);
    }
  }

  // --------------------------------------
  // RESTART LOCAL MATCH
  // Resets only this browser's current match attempt.
  // --------------------------------------
  function restartMatch() {
    setShots(0);
    setGoals(0);
    setFinished(false);
    setLastShot(null);
    setKeeperDive(null);
    setShotResult(null);
    setSelectedDirection(null);
    setMessage("Choose your shot direction.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <section className="relative mx-auto max-w-6xl">
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-green-500/10 blur-3xl" />

        <div className="relative mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
            {/* -------------------------------------- */}
            {/* MATCH HEADER */}
            {/* Room info and current score. */}
            {/* -------------------------------------- */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                  Room {room}
                </p>
                <h1 className="mt-2 text-4xl font-black">Penalty Shootout</h1>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-center">
                <p className="text-xs text-slate-400">Goals</p>
                <p className="text-3xl font-black text-blue-300">{goals}</p>
              </div>
            </div>

            {/* -------------------------------------- */}
            {/* STADIUM ARENA UI */}
            {/* Main visual gameplay section. */}
            {/* -------------------------------------- */}
            <div className="mt-8 rounded-[2rem] border border-blue-500/20 bg-[#06111f] p-4 shadow-[0_0_60px_rgba(0,100,255,0.15)]">
              <div className="relative mx-auto h-[430px] sm:h-[520px] overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#081426]">
                {/* Stadium crowd and sky */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#081426_0%,#0d1f38_35%,#123f1f_100%)]" />

                {/* Stadium lighting glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(80,180,255,0.25),transparent_55%)]" />

                {/* Flood lights */}
                <div className="absolute left-1/2 top-6 flex -translate-x-1/2 gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-3 w-3 rounded-full bg-blue-100 shadow-[0_0_18px_rgba(255,255,255,0.9)]"
                    />
                  ))}
                </div>

                {/* Pitch grass */}
                <div className="absolute bottom-0 left-0 right-0 h-[72%] bg-gradient-to-b from-green-700 to-green-950">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:80px_80px]" />
                </div>

                {/* Result color flash */}
                {shotResult === "Goal" && (
                  <div className="absolute inset-0 animate-pulse bg-green-400/20" />
                )}

                {shotResult === "Save" && (
                  <div className="absolute inset-0 animate-pulse bg-red-500/20" />
                )}

                {shotResult === "Miss" && (
                  <div className="absolute inset-0 animate-pulse bg-yellow-300/20" />
                )}

                {/* Penalty box */}
                <div className="absolute left-1/2 top-[155px] h-[180px] w-[72%] -translate-x-1/2 rounded-b-[2rem] border-[5px] border-t-0 border-white/90" />

                {/* Goal post and net */}
                {/* Goal post */}
                <div
                  className={`absolute left-1/2 top-[95px] h-[120px] w-[58%] -translate-x-1/2 border-[5px] border-white bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-transform duration-200 ${
                    shotResult === "Goal"
                      ? "scale-105 shadow-[0_0_60px_rgba(34,197,94,0.6)]"
                      : ""
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:16px_16px] transition-transform duration-200 ${
                      shotResult === "Goal" ? "translate-y-1 scale-105" : ""
                    }`}
                  />
                </div>

                {/* Goalkeeper character */}
                {/* -------------------------------------- */}
                {/* GOALKEEPER CHARACTER */}
                {/* Animated keeper with layered styling */}
                {/* -------------------------------------- */}
                <div
                  className={`absolute top-[165px] z-20 transition-all duration-300 ${
                    (shotResult ? keeperDive : keeperPosition) === "Left"
                      ? "left-[34%] rotate-[-20deg] scale-110"
                      : (shotResult ? keeperDive : keeperPosition) === "Right"
                        ? "left-[57%] rotate-[20deg] scale-110"
                        : "left-1/2 -translate-x-1/2"
                  } ${shotResult === "Save" ? "scale-125" : ""}`}
                >
                  {/* Shadow */}
                  <div className="absolute left-1/2 top-[88px] h-4 w-20 -translate-x-1/2 rounded-full bg-black/40 blur-md" />

                  {/* Head */}
                  <div className="relative mx-auto h-9 w-9 rounded-full border-2 border-black/20 bg-amber-200">
                    <div className="absolute left-2 top-3 h-1 w-1 rounded-full bg-black" />
                    <div className="absolute right-2 top-3 h-1 w-1 rounded-full bg-black" />
                  </div>

                  {/* Jersey */}
                  <div className="relative mx-auto mt-1 h-16 w-16 rounded-2xl bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-[0_0_25px_rgba(255,220,0,0.45)]">
                    <div className="absolute left-1/2 top-2 -translate-x-1/2 text-sm font-black text-black">
                      GK
                    </div>
                  </div>

                  {/* Arms */}
                  <div className="absolute left-[-24px] top-[40px] h-4 w-10 rotate-[-20deg] rounded-full bg-yellow-300 shadow-md" />
                  <div className="absolute right-[-24px] top-[40px] h-4 w-10 rotate-[20deg] rounded-full bg-yellow-300 shadow-md" />

                  {/* Gloves */}
                  <div
                    className={`absolute top-[38px] h-5 w-5 rounded-full bg-red-500 shadow-lg transition-all duration-300 ${
                      shotResult === "Save" ? "left-[-42px]" : "left-[-30px]"
                    }`}
                  />
                  <div
                    className={`absolute top-[38px] h-5 w-5 rounded-full bg-red-500 shadow-lg transition-all duration-300 ${
                      shotResult === "Save" ? "right-[-42px]" : "right-[-30px]"
                    }`}
                  />

                  {/* Shorts */}
                  <div className="mx-auto h-6 w-12 rounded-b-xl bg-black" />

                  {/* Legs */}
                  <div className="absolute bottom-[-28px] left-4 h-10 w-3 rotate-[8deg] rounded-full bg-black" />
                  <div className="absolute bottom-[-28px] right-4 h-10 w-3 rotate-[-8deg] rounded-full bg-black" />

                  {/* Boots */}
                  <div className="absolute bottom-[-32px] left-1 h-4 w-6 rounded-full bg-red-600" />
                  <div className="absolute bottom-[-32px] right-1 h-4 w-6 rounded-full bg-red-600" />
                </div>

                {/* -------------------------------------- */}
                {/* PLAYER CHARACTER */}
                {/* Main football shooter */}
                {/* -------------------------------------- */}
                <div
                  className={`absolute bottom-[25px] left-1/2 z-10 -translate-x-1/2 scale-[1.05] transition-transform duration-300 ${
                    lastShot ? "rotate-[-4deg] scale-[1.1]" : ""
                  }`}
                >
                  {/* Shadow */}
                  <div className="absolute left-1/2 top-[120px] h-5 w-24 -translate-x-1/2 rounded-full bg-black/40 blur-md" />

                  {/* Head */}
                  <div className="relative mx-auto h-10 w-10 rounded-full border-2 border-black/20 bg-amber-200">
                    <div className="absolute left-2 top-3 h-1 w-1 rounded-full bg-black" />
                    <div className="absolute right-2 top-3 h-1 w-1 rounded-full bg-black" />
                  </div>

                  {/* Jersey */}
                  <div className="relative mx-auto mt-1 h-24 w-20 rounded-t-3xl rounded-b-2xl bg-gradient-to-b from-blue-400 to-blue-700 shadow-[0_0_30px_rgba(0,80,255,0.45)]">
                    {/* Jersey stripes */}
                    <div className="absolute left-3 top-0 h-full w-1 bg-white/30" />
                    <div className="absolute right-3 top-0 h-full w-1 bg-white/30" />

                    {/* Number */}
                    <p className="absolute left-1/2 top-7 -translate-x-1/2 text-3xl font-black text-white">
                      10
                    </p>
                  </div>

                  {/* Arms */}
                  <div className="absolute left-[-22px] top-[52px] h-4 w-10 rotate-[25deg] rounded-full bg-blue-500 shadow-md" />
                  <div className="absolute right-[-22px] top-[52px] h-4 w-10 rotate-[-25deg] rounded-full bg-blue-500 shadow-md" />

                  {/* Shorts */}
                  <div className="mx-auto h-7 w-14 rounded-b-xl bg-white" />

                  {/* Legs */}
                  <div className="absolute bottom-[-38px] left-5 h-12 w-4 rotate-[10deg] rounded-full bg-slate-200" />
                  <div
                    className={`absolute bottom-[-38px] right-5 h-12 w-4 rounded-full bg-slate-200 transition-transform duration-300 ${
                      lastShot ? "rotate-[-45deg]" : "rotate-[-10deg]"
                    }`}
                  />

                  {/* Boots */}
                  <div className="absolute bottom-[-44px] left-1 h-4 w-7 rounded-full bg-black" />
                  <div className="absolute bottom-[-44px] right-1 h-4 w-7 rounded-full bg-black" />
                </div>

                {/* Shot trail effect */}
                {lastShot && (
                  <div
                    className={`absolute z-20 h-2 rounded-full bg-white/70 shadow-[0_0_25px_rgba(255,255,255,0.9)] ${
                      lastShot === "Left"
                        ? "bottom-[130px] left-[38%] w-[150px] rotate-[-28deg]"
                        : lastShot === "Right"
                          ? "bottom-[180px] right-[34%] w-[150px] rotate-[28deg]"
                          : "bottom-[185px] left-1/2 w-[170px] -translate-x-1/2 rotate-[-90deg]"
                    }`}
                  />
                )}

                {/* Football */}
                {/* -------------------------------------- */}
                {/* FOOTBALL */}
                {/* Ball moves based on selected shot direction */}
                {/* -------------------------------------- */}
                <div
                  className={`absolute z-30 h-9 w-9 rounded-full border-2 border-black bg-white shadow-[0_0_25px_rgba(255,255,255,0.75)] transition-all duration-500 ${
                    lastShot === "Left"
                      ? "left-[32%] top-[180px]"
                      : lastShot === "Right"
                        ? "left-[66%] top-[180px]"
                        : lastShot === "Center"
                          ? "left-1/2 top-[180px] -translate-x-1/2"
                          : "bottom-[95px] left-1/2 -translate-x-1/2"
                  }`}
                >
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
                  <div className="absolute left-1 top-2 h-2 w-2 rounded-full bg-black" />
                  <div className="absolute right-1 top-2 h-2 w-2 rounded-full bg-black" />
                  <div className="absolute bottom-1 left-2 h-2 w-2 rounded-full bg-black" />
                  <div className="absolute bottom-1 right-2 h-2 w-2 rounded-full bg-black" />
                </div>

                {/* -------------------------------------- */}
                {/* CINEMATIC IMPACT EFFECTS */}
                {/* Adds visual drama for goals, saves, and misses */}
                {/* -------------------------------------- */}
                {shotResult === "Goal" && (
                  <>
                    <div className="absolute inset-0 z-20 animate-pulse bg-green-400/20" />

                    <div className="absolute left-1/2 top-[145px] z-30 h-52 w-52 -translate-x-1/2 rounded-full bg-green-300/30 blur-3xl" />

                    <div className="absolute left-1/2 top-[190px] z-30 h-24 w-64 -translate-x-1/2 rounded-full bg-white/20 blur-2xl" />
                  </>
                )}

                {shotResult === "Save" && (
                  <>
                    <div className="absolute inset-0 z-20 animate-pulse bg-red-500/20" />

                    <div className="absolute left-1/2 top-[170px] z-30 h-40 w-40 -translate-x-1/2 rounded-full bg-red-400/30 blur-3xl" />

                    <div className="absolute left-1/2 top-[210px] z-30 h-12 w-48 -translate-x-1/2 rounded-full bg-red-200/30 blur-xl" />
                  </>
                )}

                {shotResult === "Miss" && (
                  <>
                    <div className="absolute inset-0 z-20 animate-pulse bg-yellow-300/20" />

                    <div className="absolute left-1/2 top-[55px] z-30 h-48 w-48 -translate-x-1/2 rounded-full bg-yellow-300/30 blur-3xl" />

                    <div className="absolute left-1/2 top-[90px] z-30 h-2 w-80 -translate-x-1/2 rotate-[-8deg] rounded-full bg-yellow-200/70 shadow-[0_0_30px_rgba(255,255,0,0.8)]" />
                  </>
                )}

                {/* Shot result overlay */}
                {shotResult && (
                  <div
                    className={`absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-3xl px-10 py-5 text-5xl font-black shadow-2xl ${
                      shotResult === "Goal"
                        ? "bg-green-400 text-green-950"
                        : shotResult === "Save"
                          ? "bg-red-400 text-red-950"
                          : "bg-yellow-300 text-yellow-950"
                    }`}
                  >
                    {shotResult === "Goal"
                      ? "GOAL!"
                      : shotResult === "Save"
                        ? "SAVED!"
                        : "MISS!"}
                  </div>
                )}

                {/* Arena stat cards */}
                <div className="absolute left-5 top-5 rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 backdrop-blur">
                  <p className="text-sm text-slate-400">Shots</p>
                  <p className="text-4xl font-black text-white">{shots}/5</p>
                </div>

                <div className="absolute right-5 top-5 rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 backdrop-blur">
                  <p className="text-sm text-slate-400">Goals</p>
                  <p className="text-4xl font-black text-blue-300">{goals}</p>
                </div>
              </div>
            </div>

            {/* -------------------------------------- */}
            {/* GAME MESSAGE */}
            {/* Shows shot result instructions and feedback. */}
            {/* -------------------------------------- */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center font-bold text-slate-100">
              {message}
            </div>

            {/* -------------------------------------- */}
            {/* DIRECTION SELECTION */}
            {/* Player chooses target direction before shooting. */}
            {/* -------------------------------------- */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {directions.map((direction) => (
                <button
                  key={direction}
                  onClick={() => setSelectedDirection(direction)}
                  disabled={finished}
                  className={`rounded-2xl px-6 py-5 text-lg font-black transition ${
                    selectedDirection === direction
                      ? "scale-105 bg-green-500 text-green-950"
                      : "bg-blue-600 hover:bg-blue-500"
                  } disabled:cursor-not-allowed disabled:bg-slate-700`}
                >
                  {direction}
                </button>
              ))}
            </div>

            {/* -------------------------------------- */}
            {/* SHOT POWER + SHOOT BUTTON */}
            {/* Player must time power before shooting. */}
            {/* -------------------------------------- */}
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold">Shot Power</p>
                <p className="text-sm font-black text-blue-300">{power}%</p>
              </div>

              <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${power}%` }}
                  className={`h-full transition-all ${
                    power > 85
                      ? "bg-red-500"
                      : power > 60
                        ? "bg-yellow-400"
                        : "bg-green-500"
                  }`}
                />
              </div>

              <button
                disabled={!selectedDirection || finished || alreadyFinished}
                onClick={() => {
                  if (!selectedDirection) return;

                  if (power > 96) {
                    missShot(selectedDirection);
                    setSelectedDirection(null);
                    return;
                  }

                  shoot(selectedDirection);
                  setSelectedDirection(null);
                }}
                className="mt-5 w-full rounded-2xl bg-white px-6 py-5 text-lg font-black text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                SHOOT
              </button>
            </div>

            {/* -------------------------------------- */}
            {/* FINISHED MATCH ACTIONS */}
            {/* Lets player restart locally or view shared room results. */}
            {/* -------------------------------------- */}
            {finished && (
              <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-6">
                <p className="text-sm font-bold uppercase tracking-widest text-green-300">
                  Match Summary
                </p>

                <h3 className="mt-2 text-3xl font-black">
                  {alreadyFinished
                    ? "Match Already Completed"
                    : "Your Match Is Complete"}
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <Stat label="Goals" value={String(goals)} />
                  <Stat label="Shots" value={`${shots}/5`} />
                  <Stat
                    label="Accuracy"
                    value={
                      shots === 0
                        ? "0%"
                        : `${Math.round((goals / shots) * 100)}%`
                    }
                  />
                </div>

                <p className="mt-5 text-sm text-slate-300">
                  Room results will show the final winner, draw status, virtual
                  balance updates, and all player rankings.
                </p>

                <button
                  onClick={() => {
                    window.location.href = `/lobby?room=${room}`;
                  }}
                  className="mt-5 w-full rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500"
                >
                  View Room Results
                </button>
              </div>
            )}
          </div>

          {/* -------------------------------------- */}
          {/* MATCH SCOREBOARD SIDEBAR */}
          {/* Displays current match performance and navigation */}
          {/* -------------------------------------- */}
          <aside className="rounded-[2rem] border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_45px_rgba(0,80,255,0.18)] backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Live Match
            </p>

            <h2 className="mt-2 text-3xl font-black">Scoreboard</h2>

            <div className="mt-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
              <p className="text-sm text-slate-400">Room</p>
              <p className="mt-1 break-all text-2xl font-black text-blue-300">
                {room}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat label="Goals" value={String(goals)} />
              <Stat label="Shots" value={`${shots}/5`} />
            </div>

            <div className="mt-4">
              <Stat
                label="Accuracy"
                value={
                  shots === 0 ? "0%" : `${Math.round((goals / shots) * 100)}%`
                }
              />
            </div>

            <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm text-slate-400">Match Status</p>

              <p className="mt-1 text-xl font-black">
                {finished ? "Completed" : "In Progress"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Complete all 5 shots to submit your score.
              </p>
            </div>

            <Link
              href={`/lobby?room=${room}`}
              className="mt-6 block rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold transition hover:bg-blue-500"
            >
              View Room Results
            </Link>

            <Link
              href="/profile"
              className="mt-4 block rounded-2xl border border-slate-700 px-6 py-4 text-center font-bold transition hover:bg-slate-800"
            >
              View Profile
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/80 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense>
      <GameContent />
    </Suspense>
  );
}
