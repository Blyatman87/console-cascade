/** Simple Web Audio SFX + music with mute / volume. */

type SfxName =
  | 'move'
  | 'rotate'
  | 'soft'
  | 'hard'
  | 'lock'
  | 'clear'
  | 'hold'
  | 'pause'
  | 'levelComplete'
  | 'ui';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes: OscillatorNode[] = [];
  private musicPlaying = false;
  muted = false;
  sfxVolume = 0.7;
  musicVolume = 0.35;

  private ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.master || !this.sfxGain || !this.musicGain) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxGain.gain.value = this.sfxVolume;
    this.musicGain.gain.value = this.musicVolume;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyVolumes();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  resume() {
    this.ensure();
    void this.ctx?.resume();
  }

  play(name: SfxName) {
    this.ensure();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const beeps: Record<SfxName, { freq: number; dur: number; type: OscillatorType; peak: number }> = {
      move: { freq: 220, dur: 0.04, type: 'square', peak: 0.08 },
      rotate: { freq: 330, dur: 0.05, type: 'square', peak: 0.1 },
      soft: { freq: 160, dur: 0.03, type: 'triangle', peak: 0.05 },
      hard: { freq: 90, dur: 0.12, type: 'sawtooth', peak: 0.18 },
      lock: { freq: 140, dur: 0.08, type: 'triangle', peak: 0.12 },
      clear: { freq: 520, dur: 0.18, type: 'square', peak: 0.16 },
      hold: { freq: 400, dur: 0.07, type: 'sine', peak: 0.1 },
      pause: { freq: 260, dur: 0.1, type: 'sine', peak: 0.1 },
      levelComplete: { freq: 440, dur: 0.35, type: 'square', peak: 0.2 },
      ui: { freq: 480, dur: 0.05, type: 'sine', peak: 0.08 },
    };
    const b = beeps[name];
    osc.type = b.type;
    osc.frequency.setValueAtTime(b.freq, t);
    if (name === 'levelComplete') {
      osc.frequency.linearRampToValueAtTime(880, t + 0.2);
      osc.frequency.linearRampToValueAtTime(660, t + 0.35);
    }
    if (name === 'clear') {
      osc.frequency.linearRampToValueAtTime(780, t + 0.12);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(b.peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + b.dur);
    osc.start(t);
    osc.stop(t + b.dur + 0.02);
  }

  /** Short victory sting (1.2–1.8s arpeggio). */
  playVictorySting(durationSec = 1.5) {
    this.ensure();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    void this.ctx.resume();
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const step = durationSec / notes.length;
    const t0 = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      const start = t0 + i * step;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + step * 0.9);
      osc.start(start);
      osc.stop(start + step);
    });
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || !this.musicGain || this.musicPlaying) return;
    void this.ctx.resume();
    this.musicPlaying = true;
    const base = this.ctx.createOscillator();
    const fifth = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    base.type = 'triangle';
    fifth.type = 'sine';
    base.frequency.value = 110;
    fifth.frequency.value = 165;
    g.gain.value = 0.04;
    base.connect(g);
    fifth.connect(g);
    g.connect(this.musicGain);
    base.start();
    fifth.start();
    this.musicNodes = [base, fifth];
  }

  stopMusic() {
    for (const n of this.musicNodes) {
      try {
        n.stop();
      } catch {
        // already stopped
      }
    }
    this.musicNodes = [];
    this.musicPlaying = false;
  }
}

export const audio = new AudioEngine();
