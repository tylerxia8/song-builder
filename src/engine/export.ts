export function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const length = buffer.length;
  const dataLength = length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  const channels = Array.from({ length: numChannels }, (_, index) =>
    buffer.getChannelData(index),
  );

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportProjectWav(buffer: AudioBuffer, projectName: string) {
  const wav = encodeWav(buffer);
  const blob = new Blob([wav], { type: "audio/wav" });
  const safeName = projectName.trim().replace(/\s+/g, "-").toLowerCase() || "songbuilder-export";
  downloadBlob(blob, `${safeName}.wav`);
}

export async function exportProjectMp3(buffer: AudioBuffer, projectName: string) {
  const lamejs = await import("lamejs");
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const mono = new Float32Array(left.length);

  for (let i = 0; i < left.length; i += 1) {
    mono[i] = (left[i] + right[i]) * 0.5;
  }

  const mp3Encoder = new lamejs.Mp3Encoder(1, buffer.sampleRate, 192);
  const blockSize = 1152;
  const mp3Data: Int8Array[] = [];

  for (let i = 0; i < mono.length; i += blockSize) {
    const chunk = mono.subarray(i, i + blockSize);
    const int16 = floatTo16BitPCM(chunk);
    const encoded = mp3Encoder.encodeBuffer(int16);
    if (encoded.length > 0) mp3Data.push(encoded);
  }

  const flushed = mp3Encoder.flush();
  if (flushed.length > 0) mp3Data.push(flushed);

  const safeName = projectName.trim().replace(/\s+/g, "-").toLowerCase() || "songbuilder-export";
  downloadBlob(new Blob(mp3Data as BlobPart[], { type: "audio/mpeg" }), `${safeName}.mp3`);
}

function floatTo16BitPCM(samples: Float32Array): Int16Array {
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return int16;
}
