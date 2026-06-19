"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const ProStudio = dynamic(
  () => import("@/components/studio/ProStudio").then((module) => module.ProStudio),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[var(--sf-bg)] text-sm text-[var(--sf-text-muted)]">
        Loading studio…
      </div>
    ),
  },
);

export function StudioClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[var(--sf-bg)] text-sm text-[var(--sf-text-muted)]">
          Loading studio…
        </div>
      }
    >
      <ProStudio />
    </Suspense>
  );
}
