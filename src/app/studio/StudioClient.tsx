"use client";

import dynamic from "next/dynamic";

const ProStudio = dynamic(
  () => import("@/components/studio/ProStudio").then((module) => module.ProStudio),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#0b0b10] text-sm text-zinc-400">
        Loading SongBuilder Pro…
      </div>
    ),
  },
);

export function StudioClient() {
  return <ProStudio />;
}
