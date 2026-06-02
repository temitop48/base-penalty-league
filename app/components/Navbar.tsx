import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-white shadow-xl">
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
        <Link href="/profile" className="text-slate-300 hover:text-blue-300">
          Profile
        </Link>
        <Link href="/leaderboard" className="text-slate-300 hover:text-blue-300">
          Leaderboard
        </Link>
      </div>
    </nav>
  );
}
