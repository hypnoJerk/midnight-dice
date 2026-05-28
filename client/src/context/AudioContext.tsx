import React, { createContext, useContext, useState } from 'react';

interface AudioContextType {
  playClick: () => void;
  playRoll: () => void;
  playSuccess: () => void;
  playDq: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(
    localStorage.getItem('midnight_muted') === 'true'
  );

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('midnight_muted', String(next));
      return next;
    });
  };

  const audioCtxRef = React.useRef<AudioContext | null>(null);

  const getAudioContext = (): AudioContext | null => {
    if (isMuted || typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // 1. Procedural 8-bit bip click
  const playClick = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  // 2. Procedural retro noise roll clatter
  const playRoll = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.3; // 300ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Bandpass filter to make it sound clattery like dice
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseNode.start();
    noiseNode.stop(ctx.currentTime + 0.3);
  };

  // 3. Procedural 8-bit success arpeggio
  const playSuccess = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Ascending arpeggio (C Major: C5 -> E5 -> G5 -> C6)
    playTone(523.25, now, 0.1);
    playTone(659.25, now + 0.08, 0.1);
    playTone(783.99, now + 0.16, 0.1);
    playTone(1046.50, now + 0.24, 0.25);
  };

  // 4. Procedural downward sliding DQ buzzer
  const playDq = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  };

  return (
    <AudioContext.Provider value={{ playClick, playRoll, playSuccess, playDq, isMuted, toggleMute }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
