"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import SignedActionButton from "@/app/components/SignedActionButton";

type Profile = {
  username: string;
  wins: number;
  goals: number;
  matches: number;
  walletAddress?: string;
  gameBalance?: number;
  lastReloadAt?: string;
};

type MatchHistory = {
  room: string;
  goals: number;
  result: "Win" | "Loss";
  playedAt: string;
};

function readProfileFromStorage(): Profile | null {
  try {
    const saved = localStorage.getItem("bpl_profile");
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem("bpl_profile");
    return null;
  }
}

function readHistoryFromStorage(): MatchHistory[] {
  try {
    const saved = localStorage.getItem("bpl_match_history");
    return saved ? JSON.parse(saved) : [];
  } catch {
    localStorage.removeItem("bpl_match_history");
    return [];
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    setProfile(readProfileFromStorage());
    setHistory(readHistoryFromStorage());

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(Date.now());
  }, []);

  function createProfile() {
    if (!nameInput.trim()) return;

    const newProfile: Profile = {
      username: nameInput.trim(),
      wins: 0,
      goals: 0,
      matches: 0,
      walletAddress: isConnected && address ? address : undefined,
      gameBalance: 200,
    };

    localStorage.setItem("bpl_profile", JSON.stringify(newProfile));
    setProfile(newProfile);
    setNameInput("");
  }

  function attachWalletToProfile() {
    if (!profile || !isConnected || !address) return;

    const updatedProfile: Profile = {
      ...profile,
      walletAddress: address,
    };

    localStorage.setItem("bpl_profile", JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
  }

  function resetProfile() {
    localStorage.removeItem("bpl_profile");
    localStorage.removeItem("bpl_match_history");
    setProfile(null);
    setHistory([]);
    setNameInput("");
  }

  //Reload balance after 1hr
  function reloadBalance() {
    if (!profile) return;

    const updatedProfile: Profile = {
      ...profile,
      gameBalance: 200,
      lastReloadAt: new Date().toISOString(),
    };

    localStorage.setItem("bpl_profile", JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <p className="text-slate-400">Loading profile...</p>
      </main>
    );
  }

  const safeWins = profile?.wins ?? 0;
  const safeGoals = profile?.goals ?? 0;
  const safeMatches = profile?.matches ?? 0;
  const safeBalance = profile?.gameBalance ?? 200;

  const lastReloadTime = profile?.lastReloadAt
    ? new Date(profile.lastReloadAt).getTime()
    : 0;

  const oneHour = 60 * 60 * 1000;
  const timeSinceReload = currentTime - lastReloadTime;

  const canReloadBalance = safeBalance < 16 && timeSinceReload >= oneHour;

  const minutesUntilReload = Math.max(
    Math.ceil((oneHour - timeSinceReload) / 60000),
    0,
  );

  const winRate = safeMatches ? Math.round((safeWins / safeMatches) * 100) : 0;

  const averageGoals = safeMatches
    ? (safeGoals / safeMatches).toFixed(1)
    : "0.0";

  const league =
    safeWins >= 500
      ? "Diamond League"
      : safeWins >= 300
        ? "Gold League"
        : safeWins >= 150
          ? "Silver League"
          : safeWins >= 50
            ? "Bronze League"
            : "Rookie League";

  const legendStatus = safeGoals >= 1000 ? "Legend Striker" : "Road to Legend";

  const nextLeagueTarget =
    safeWins >= 500
      ? 500
      : safeWins >= 300
        ? 500
        : safeWins >= 150
          ? 300
          : safeWins >= 50
            ? 150
            : 50;

  const winsToNextLeague = Math.max(nextLeagueTarget - safeWins, 0);
  const xpEstimate = safeWins * 100 + safeGoals * 10;
  const goalsToLegend = Math.max(1000 - safeGoals, 0);

  const unlockedBadgeCount = [
    Boolean(profile?.username),
    safeMatches >= 1,
    safeGoals >= 3,
    safeWins >= 50,
    safeWins >= 150,
    safeWins >= 300,
    safeWins >= 500,
    safeGoals >= 1000,
  ].filter(Boolean).length;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <section className="relative mx-auto max-w-4xl">
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-green-500/10 blur-3xl" />

        <h1 className="relative mt-2 text-4xl font-black">Player Profile</h1>

        {!profile ? (
          <div className="relative mt-8 rounded-4xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Create Identity
            </p>

            <h2 className="mt-3 text-2xl font-black">Create Your Player</h2>

            <p className="mt-2 text-slate-400">
              Pick a username before playing so your goals, wins, and match
              history can be saved.
            </p>

            <input
              placeholder="Enter username"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              className="mt-6 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-blue-500"
            />

            <button
              onClick={createProfile}
              className="mt-4 w-full rounded-2xl bg-blue-600 p-4 font-bold hover:bg-blue-500"
            >
              Create Profile
            </button>
          </div>
        ) : (
          <div className="relative mt-8 rounded-4xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                  {league}
                </p>

                <h2 className="mt-2 text-4xl font-black">{profile.username}</h2>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-center">
                <p className="text-xs text-slate-400">Win Rate</p>
                <p className="text-3xl font-black text-blue-300">{winRate}%</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-5">
              <Stat label="Matches" value={safeMatches} />
              <Stat label="Wins" value={safeWins} />
              <Stat label="Goals" value={safeGoals} />
              <Stat label="Avg Goals" value={averageGoals} />
              <Stat label="Balance" value={`$${safeBalance}`} />
            </div>

            {safeBalance < 16 && (
              <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                <p className="text-sm font-bold uppercase tracking-widest text-yellow-300">
                  Balance Reload
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Low Balance Detected
                </h3>

                <p className="mt-2 text-slate-400">
                  Reload is available only when your balance is below $16.
                </p>

                {canReloadBalance ? (
                  <button
                    onClick={reloadBalance}
                    className="mt-4 rounded-2xl bg-yellow-300 px-5 py-3 font-bold text-yellow-950 hover:bg-yellow-200"
                  >
                    Reload Balance to $200
                  </button>
                ) : (
                  <p className="mt-4 rounded-2xl bg-slate-950/80 px-5 py-3 text-sm font-bold text-yellow-300">
                    Reload available in {minutesUntilReload} minutes.
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-blue-500/20 bg-slate-950/80 p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                Base Player Identity
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <h3 className="text-3xl font-black">{profile.username}</h3>
                  <p className="mt-1 text-blue-300">{league}</p>

                  <p className="mt-4 break-all font-mono text-sm text-slate-400">
                    {profile.walletAddress || "No wallet attached yet"}
                  </p>
                </div>

                <div className="rounded-3xl bg-blue-500/10 p-5">
                  <p className="text-sm text-slate-400">Unlocked Badges</p>
                  <p className="mt-1 text-4xl font-black text-blue-300">
                    {unlockedBadgeCount}/8
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-green-300">
                League Progress
              </p>

              <h3 className="mt-2 text-2xl font-black">{league}</h3>

              <p className="mt-2 text-slate-400">
                {winsToNextLeague === 0
                  ? "You have reached the highest league tier."
                  : `${winsToNextLeague} more wins needed for the next league.`}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">Legend Status</p>
                  <p className="mt-1 text-xl font-black text-green-300">
                    {legendStatus}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {goalsToLegend} goals left to become a legend.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">XP Estimate</p>
                  <p className="mt-1 text-xl font-black text-green-300">
                    {xpEstimate} XP
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Wins earn 100 XP. Goals earn 10 XP.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                Wallet Identity
              </p>

              <h3 className="mt-2 text-2xl font-black">Base Player Identity</h3>

              <div className="mt-4 grid gap-4">
                <WalletStatus
                  label="Connected Wallet"
                  value={
                    isConnected && address ? address : "No wallet connected"
                  }
                  active={Boolean(isConnected && address)}
                />

                <WalletStatus
                  label="Attached Profile Wallet"
                  value={profile.walletAddress || "No wallet attached yet"}
                  active={Boolean(profile.walletAddress)}
                />
              </div>

              {isConnected &&
                address &&
                profile.walletAddress &&
                profile.walletAddress !== address && (
                  <p className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300">
                    Connected wallet is different from the wallet attached to
                    this profile.
                  </p>
                )}

              {profile.walletAddress === address ? (
                <p className="mt-4 rounded-2xl bg-green-500/10 px-5 py-3 font-bold text-green-300">
                  Wallet attached to profile
                </p>
              ) : (
                <button
                  onClick={attachWalletToProfile}
                  disabled={!isConnected || !address}
                  className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  Attach Wallet to Profile
                </button>
              )}

              <div className="mt-4">
                <SignedActionButton
                  action="Create or verify player profile"
                  label="Sign Profile Action"
                  className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Link
                href="/create"
                className="rounded-2xl bg-blue-600 p-4 text-center font-bold hover:bg-blue-500"
              >
                Create Match
              </Link>

              <Link
                href="/leaderboard"
                className="rounded-2xl border border-slate-700 p-4 text-center font-bold hover:bg-slate-800"
              >
                Leaderboard
              </Link>

              <button
                onClick={resetProfile}
                className="rounded-2xl border border-red-500/30 p-4 font-bold text-red-300 hover:bg-red-500/10"
              >
                Reset Profile
              </button>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                Badges
              </p>

              <h3 className="mt-2 text-2xl font-black">Player Achievements</h3>

              <p className="mt-2 text-slate-400">
                Unlock achievements based on your match activity and
                performance.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-4">
                <Badge
                  title="Rookie Striker"
                  text="Create your first player profile."
                  unlocked={Boolean(profile.username)}
                />

                <Badge
                  title="First Match"
                  text="Complete at least one penalty match."
                  unlocked={safeMatches >= 1}
                />

                <Badge
                  title="Goal Hunter"
                  text="Score at least 3 total goals."
                  unlocked={safeGoals >= 3}
                />

                <Badge
                  title="Bronze League"
                  text="Win 50 games."
                  unlocked={safeWins >= 50}
                />

                <Badge
                  title="Silver League"
                  text="Win 150 games."
                  unlocked={safeWins >= 150}
                />

                <Badge
                  title="Gold League"
                  text="Win 300 games."
                  unlocked={safeWins >= 300}
                />

                <Badge
                  title="Diamond League"
                  text="Win 500 games."
                  unlocked={safeWins >= 500}
                />

                <Badge
                  title="Legend Striker"
                  text="Score 1000 total goals."
                  unlocked={safeGoals >= 1000}
                />
              </div>

              <div className="mt-5">
                <SignedActionButton
                  action="Claim player badge"
                  label="Sign Badge Claim"
                  className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200"
                />
              </div>
            </div>

            <div className="mt-10">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                  Match History
                </p>

                <h3 className="mt-2 text-2xl font-black">Recent Matches</h3>
              </div>

              {history.length === 0 ? (
                <div className="mt-4 rounded-3xl bg-slate-950/80 p-6 text-center">
                  <p className="text-slate-400">No matches played yet.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {history.slice(0, 5).map((match, index) => (
                    <div
                      key={`${match.room}-${match.playedAt}-${index}`}
                      className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 sm:grid-cols-[1fr_0.6fr_0.6fr]"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          Room
                        </p>

                        <p className="mt-1 text-xl font-black text-blue-300">
                          {match.room}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          {match.playedAt}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          Goals
                        </p>

                        <p className="mt-1 text-3xl font-black">
                          {match.goals}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          Result
                        </p>

                        <div
                          className={`mt-2 inline-flex rounded-2xl px-4 py-2 text-sm font-black ${
                            match.result === "Win"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {match.result}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Badge({
  title,
  text,
  unlocked,
}: {
  title: string;
  text: string;
  unlocked: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 transition ${
        unlocked
          ? "border-green-500/20 bg-green-500/10 shadow-[0_0_25px_rgba(34,197,94,0.15)]"
          : "border-slate-800 bg-slate-900/80"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-black">{title}</p>

        <div
          className={`rounded-full px-3 py-1 text-xs font-black ${
            unlocked
              ? "bg-green-400 text-green-950"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {unlocked ? "Unlocked" : "Locked"}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  );
}

function WalletStatus({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        active
          ? "border-green-500/20 bg-green-500/10"
          : "border-slate-800 bg-slate-950/80"
      }`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-blue-300">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-slate-950/80 p-4 text-center">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}
