import Link from "next/link";

const features = [
  {
    title: "Arrangement timeline",
    description: "Multi-track clips on a bar grid with loop regions, zoom, and live playhead.",
  },
  {
    title: "Drum machine",
    description: "16-step patterns for kick, snare, hi-hat, and clap with instant audition.",
  },
  {
    title: "Piano roll",
    description: "Click to paint MIDI notes on instrument tracks with real synth playback.",
  },
  {
    title: "Pro mixer",
    description: "Per-track volume, pan, mute, and solo with master bus compression and reverb.",
  },
  {
    title: "Studio export",
    description: "Render your session to WAV or MP3 directly from the browser.",
  },
  {
    title: "Demo session included",
    description: "Open the studio and press Play to hear a full arrangement immediately.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b0b10] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400">
              SongBuilder Pro
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              A professional music producer in your browser.
            </h1>
          </div>
          <Link
            href="/studio"
            className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Open Studio
          </Link>
        </header>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-[#12121a] p-5"
            >
              <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-auto flex flex-col items-start gap-4 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            Start with a complete producer workflow — arrangement, editing, mixing, and export —
            then iterate backward toward voice capture, AI assist, and advanced editing.
          </p>
          <Link
            href="/studio"
            className="rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
          >
            Launch SongBuilder Pro
          </Link>
        </section>
      </div>
    </main>
  );
}
