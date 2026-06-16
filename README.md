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
- **Audio:** Web Audio API, MediaRecorder
- **Planned:** Audio-to-MIDI, pitch detection, harmony generation, AI arrangement

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
- Multi-layer preview playback

## Roadmap

- [ ] Pitch and rhythm detection
- [ ] Audio-to-MIDI conversion
- [ ] Instrument rendering (piano, guitar, synth, etc.)
- [ ] AI chord and arrangement suggestions
- [ ] Export polished song

## License

TBD
