import Link from "next/link";

const steps = [
  {
    title: "Hum your melody",
    description: "Sing, hum, or whistle an idea into your phone or mic.",
  },
  {
    title: "Layer your song",
    description: "Add bass, drums, and harmony with more voice recordings.",
  },
  {
    title: "Let AI produce",
    description: "Get chord suggestions, timing cleanup, and polished instruments.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b10] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">
              SongBuilder
            </p>
            <p className="mt-1 text-sm text-zinc-500">The AI Music Producer</p>
          </div>
          <Link
            href="/studio"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            Open studio
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Turn the song in your head into something you can hear.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              SongBuilder is not another prompt-to-song generator. It helps you develop your own
              musical ideas through voice-first recording, layered sketching, and AI production
              assistance.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/studio"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_rgba(168,85,247,0.25)] transition hover:scale-[1.02]"
              >
                Start creating
              </Link>
              <a
                href="https://github.com/tylerxia8/song-builder"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                Step {index + 1}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{step.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
