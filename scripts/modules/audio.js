/**
 * Rune Spire Web Audio Synth
 */
class RuneSpireAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try {
      const saved = localStorage.getItem("runespire_audio");
      if (saved !== null) this.enabled = saved === "1";
    } catch (e) {}
  }

  ensureContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("runespire_audio", this.enabled ? "1" : "0");
    } catch (e) {}
    return this.enabled;
  }

  playTone(freq, type = "sine", duration = 0.15, vol = 0.12, endFreq = null) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (e) {}
  }


  playDraw() {
    this.playTone(480, "triangle", 0.08, 0.06, 720);
  }

  playHover() {
    this.playTone(320, "sine", 0.04, 0.04);
  }

  playCard() {
    this.playTone(520, "triangle", 0.12, 0.1, 880);
  }

  playSlash() {
    this.playTone(850, "sawtooth", 0.15, 0.16, 120);
  }


  playImpact() {
    this.playTone(180, "square", 0.22, 0.2, 45);
  }


  playShield() {
    this.playTone(660, "sine", 0.25, 0.14, 990);
  }


  playMagic() {
    this.playTone(440, "sine", 0.1, 0.1, 880);
    setTimeout(() => this.playTone(880, "sine", 0.18, 0.12, 1320), 60);
  }


  playPoison() {
    this.playTone(280, "sawtooth", 0.2, 0.08, 140);
  }


  playVictory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, "triangle", 0.35, 0.15), idx * 110);
    });
  }


  playDefeat() {
    [320, 270, 210, 150].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, "sawtooth", 0.4, 0.12, 90), idx * 160);
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RuneSpireAudio };
}
