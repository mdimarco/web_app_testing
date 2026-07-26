import { useEffect, useRef } from 'react';
import { useTornadoStore } from './store';

interface Engine {
  ctx: AudioContext;
  filter: BiquadFilterNode;
  gain: GainNode;
  rumbleGain: GainNode;
  rumbleFilter: BiquadFilterNode;
}

export function useWindAudio() {
  const sound = useTornadoStore((s) => s.sound);
  const intensity = useTornadoStore((s) => s.intensity);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (!sound) {
      if (engineRef.current) {
        const { gain, rumbleGain, ctx } = engineRef.current;
        const now = ctx.currentTime;
        gain.gain.setTargetAtTime(0, now, 0.4);
        rumbleGain.gain.setTargetAtTime(0, now, 0.4);
      }
      return;
    }

    let engine = engineRef.current;
    if (!engine) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();

      // broadband wind noise
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      filter.Q.value = 0.6;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(0);

      // low rumble layer
      const rumbleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const rdata = rumbleBuffer.getChannelData(0);
      let rlast = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        rlast = (rlast + 0.005 * white) / 1.005;
        rdata[i] = rlast * 6;
      }
      const rumble = ctx.createBufferSource();
      rumble.buffer = rumbleBuffer;
      rumble.loop = true;
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 90;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0;
      rumble.connect(rumbleFilter).connect(rumbleGain).connect(ctx.destination);
      rumble.start(0);

      engine = { ctx, filter, gain, rumbleGain, rumbleFilter };
      engineRef.current = engine;
    }
    if (engine.ctx.state === 'suspended') engine.ctx.resume();
    const now = engine.ctx.currentTime;
    engine.gain.gain.setTargetAtTime(0.16, now, 0.5);
    engine.rumbleGain.gain.setTargetAtTime(0.2, now, 0.5);
  }, [sound]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !sound) return;
    const now = engine.ctx.currentTime;
    engine.filter.frequency.setTargetAtTime(300 + intensity * 500, now, 0.3);
    engine.gain.gain.setTargetAtTime(0.08 + intensity * 0.11, now, 0.3);
    engine.rumbleGain.gain.setTargetAtTime(0.12 + intensity * 0.16, now, 0.3);
  }, [intensity, sound]);

  useEffect(() => {
    return () => {
      engineRef.current?.ctx.close().catch(() => {});
    };
  }, []);
}
