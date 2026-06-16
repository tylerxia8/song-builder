# SongBuilder

The first AI music producer — transform your own musical ideas into polished songs.

## Vision

Music creation tools today fall into two categories: traditional DAWs that offer complete control but require technical training, and AI music generators that create songs from prompts but sideline the user from the creative process.

SongBuilder introduces a third category: the **AI Music Producer**. Rather than generating music for users, SongBuilder helps users transform their own ideas into finished songs. The platform acts as producer, arranger, and engineer while preserving creative ownership.

**Goal:** Anyone — including children with no musical experience — should be able to imagine a song, hum it into a phone, and hear a professional-quality version within minutes.

## Workflow

**Idea → Voice → Song**

1. Hum your melody
2. Layer bass, drums, and harmony with more voice recordings
3. Let AI assist with pitch detection, timing cleanup, and instrument rendering

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Audio:** Web Audio API, MediaRecorder, Tone.js, Pitchy, LameJS
- **Planned:** AI arrangement suggestions, sample-based instruments, mobile app

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, or go directly to [http://localhost:3000/studio](http://localhost:3000/studio) to start recording layers.

## Project Structure

```
src/
  app/              Next.js routes (landing + studio)
  components/       UI and studio workspace
  hooks/            Audio recording hook
  lib/              Track definitions and shared types
```

## Current MVP

- Landing page with product vision
- Voice-first studio with four track layers: melody, bass, drums, harmony
- Browser microphone recording, playback, and waveform preview
- **Instrument selection** per layer (piano, guitar, violin, synth, brass, drum kit, or original voice)
- **Autofit & produce** — aligns layer timing and tempo, converts hums/noises into selected instruments
- **Harmony analysis** — detects key and chord progression, snaps harmony/bass to chord tones
- **Richer instruments** — reverb, compression, and improved synth voices per instrument
- **Export** — download the produced mix as WAV or MP3
- Synced playback of raw layers or the produced song

## Roadmap

- [ ] AI-powered arrangement suggestions
- [ ] Sample-based instrument libraries
- [ ] Mobile-native recording experience

## License

TBD
