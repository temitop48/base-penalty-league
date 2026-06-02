import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-green-500/10 blur-3xl" />

        <div className="relative mb-6 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-300">
          ⚽ Built on Base
        </div>

        <h1 className="relative text-5xl font-black tracking-tight md:text-7xl">
          Base Penalty League
        </h1>

        <p className="relative mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Create a room, invite friends, take five penalties, and fight for the
          top spot on the leaderboard.
        </p>

        <div className="relative mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/create"
            className="rounded-2xl bg-blue-600 px-8 py-4 font-bold shadow-lg shadow-blue-600/20 transition hover:scale-105 hover:bg-blue-500"
          >
            Create Match
          </Link>

          <Link
            href="/join"
            className="rounded-2xl border border-slate-700 px-8 py-4 font-bold text-slate-200 transition hover:bg-slate-900"
          >
            Join Match
          </Link>
        </div>

        <div className="relative mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/profile"
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 transition hover:bg-slate-900"
          >
            Player Profile
          </Link>

          <Link
            href="/leaderboard"
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 transition hover:bg-slate-900"
          >
            Leaderboard
          </Link>
        </div>

        <div className="relative mt-14 w-full rounded-4xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl">
          <div className="rounded-3xl bg-green-800 p-6">
            <div className="relative mx-auto h-72 max-w-4xl overflow-hidden rounded-3xl bg-green-700">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[70px_70px]" />

              <div className="absolute inset-x-20 top-8 h-28 rounded-b-3xl border-x-4 border-b-4 border-white/80" />
              <div className="absolute left-1/2 top-28 h-20 w-20 -translate-x-1/2 rounded-full bg-yellow-300 shadow-xl" />
              <div className="absolute bottom-12 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full bg-white" />

              <div className="absolute bottom-6 left-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left">
                <p className="text-xs text-slate-400">Room</p>
                <p className="font-black text-blue-300">BPL1234</p>
              </div>

              <div className="absolute bottom-6 right-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-right">
                <p className="text-xs text-slate-400">Score</p>
                <p className="font-black text-blue-300">3 / 5</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 grid w-full gap-4 md:grid-cols-3">
          <Feature title="2 to 8 Players" text="Create a room and challenge your friends." />
          <Feature title="Penalty Shootout" text="Shoot left, center, or right." />
          <Feature title="Leaderboard Rank" text="Track wins, goals, and climb higher." />
        </div>
      </section>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-slate-400">{text}</p>
    </div>
  );
}