"use client";

import Link from "next/link";

export function MenuBar() {
  return (
    <header className="flex h-11 items-center justify-between border-b border-white/10 bg-[#101018] px-4">
      <div className="flex items-center gap-5">
        <Link href="/" className="text-sm font-semibold tracking-wide text-white">
          SongBuilder <span className="text-violet-400">Pro</span>
        </Link>
        <nav className="hidden items-center gap-4 text-xs text-zinc-400 md:flex">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Mix</span>
        </nav>
      </div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        Professional Music Producer
      </p>
    </header>
  );
}
