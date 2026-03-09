// =============================================================================
// SOUND ENGINE
// Web Audio API sound engine for focus timer chimes.
// Uses layered oscillators with ADSR envelopes for rich, musical sounds.
// Zero file dependencies.
// =============================================================================

type SoundType = "start" | "warning" | "workEnd" | "breakEnd";

// Note frequencies (Hz)
const NOTE = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
} as const;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.7;
  private muted = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMasterGain(): GainNode {
    this.getContext();
    return this.masterGain!;
  }

  /**
   * Play a rich tone with layered oscillators and proper ADSR envelope.
   * Layers: triangle fundamental + sine 2nd harmonic + slightly detuned triangle for chorus.
   */
  private playRichTone(
    frequency: number,
    startTime: number,
    duration: number,
    gainValue: number
  ) {
    const ctx = this.getContext();
    const master = this.getMasterGain();

    const attack = 0.015;
    const decay = duration * 0.3;
    const sustainLevel = gainValue * 0.6;
    const releaseStart = startTime + duration * 0.7;

    // Layer 1: Triangle fundamental
    this.createOscLayer(ctx, master, {
      type: "triangle",
      frequency,
      gain: gainValue,
      startTime,
      duration,
      attack,
      decay,
      sustainLevel,
      releaseStart,
    });

    // Layer 2: Sine 2nd harmonic (octave up, quieter)
    this.createOscLayer(ctx, master, {
      type: "sine",
      frequency: frequency * 2,
      gain: gainValue * 0.25,
      startTime,
      duration,
      attack,
      decay,
      sustainLevel: sustainLevel * 0.25,
      releaseStart,
    });

    // Layer 3: Slightly detuned triangle for chorus width
    this.createOscLayer(ctx, master, {
      type: "triangle",
      frequency: frequency + 2,
      gain: gainValue * 0.3,
      startTime,
      duration,
      attack,
      decay,
      sustainLevel: sustainLevel * 0.3,
      releaseStart,
    });
  }

  private createOscLayer(
    ctx: AudioContext,
    destination: AudioNode,
    opts: {
      type: OscillatorType;
      frequency: number;
      gain: number;
      startTime: number;
      duration: number;
      attack: number;
      decay: number;
      sustainLevel: number;
      releaseStart: number;
    }
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.type;
    osc.frequency.value = opts.frequency;

    // ADSR envelope
    const { startTime, attack, decay, sustainLevel, releaseStart, duration } = opts;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(opts.gain, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(sustainLevel, 0.001),
      startTime + attack + decay
    );
    gain.gain.setValueAtTime(Math.max(sustainLevel, 0.001), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /** Ascending 3-note arpeggio C5 -> E5 -> G5, ~400ms, gentle and uplifting */
  playStartChime() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playRichTone(NOTE.C5, now, 0.35, 0.4);
    this.playRichTone(NOTE.E5, now + 0.12, 0.3, 0.45);
    this.playRichTone(NOTE.G5, now + 0.24, 0.35, 0.5);
  }

  /** Soft double-tap — two quick pulses, like a gentle wooden knock, ~200ms */
  playWarningTick() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const master = this.getMasterGain();

    // Two short taps with triangle waves for warmth
    for (const [freq, offset] of [[1000, 0], [1200, 0.1]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const t = now + offset;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  /** Triumphant 4-note celebration E5 -> G5 -> B5 -> C6, ~1200ms */
  playWorkEndChime() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playRichTone(NOTE.E5, now, 0.5, 0.45);
    this.playRichTone(NOTE.G5, now + 0.2, 0.5, 0.45);
    this.playRichTone(NOTE.B5, now + 0.4, 0.5, 0.5);
    this.playRichTone(NOTE.C6, now + 0.6, 0.8, 0.55);
  }

  /** Warm descending resolution G5 -> E5 -> C5, ~800ms, peaceful */
  playBreakEndChime() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playRichTone(NOTE.G5, now, 0.45, 0.4);
    this.playRichTone(NOTE.E5, now + 0.2, 0.45, 0.38);
    this.playRichTone(NOTE.C5, now + 0.4, 0.6, 0.35);
  }

  play(type: SoundType) {
    if (this.muted) return;
    switch (type) {
      case "start": this.playStartChime(); break;
      case "warning": this.playWarningTick(); break;
      case "workEnd": this.playWorkEndChime(); break;
      case "breakEnd": this.playBreakEndChime(); break;
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.masterGain) {
      this.masterGain.gain.value = m ? 0 : this.volume;
    }
  }

  getVolume() { return this.volume; }
  isMuted() { return this.muted; }
}

export type { SoundType };
export const soundEngine = new SoundEngine();
