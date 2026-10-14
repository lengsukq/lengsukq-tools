    /* Procedural Web Audio synthesis: no external audio files. */
    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
        this.gemPitchIndex = 0;
        this.lastGemTime = 0;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // Pentatonic
        // Noise buffers are generated once and reused. Filling a fresh buffer
        // per explosion cost ~26k Math.random() calls each time, which is pure
        // main-thread work on the frame that a big explosion happens.
        this.noiseBuffers = Object.create(null);
      }

      /** Cached decaying-noise buffer, keyed by length and decay rate. */
      cachedNoise(duration, decay) {
        const key = duration + ':' + decay;
        const cached = this.noiseBuffers[key];
        if (cached) return cached;
        const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-decay * i / bufferSize);
        }
        this.noiseBuffers[key] = buffer;
        return buffer;
      }

      init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? 0.28 : 0;
        this.masterGain.connect(this.ctx.destination);
        this.startBGM();
      }

      toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
          this.masterGain.gain.value = this.enabled ? 0.28 : 0.0;
        }
        return this.enabled;
      }

      playLaser(freq = 600, type = 'sawtooth') {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
      }

      playExplosion(size = 'small') {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const dur = size === 'large' ? 0.6 : 0.25;

        // White noise node for crisp explosion crunch (buffer is cached)
        const buffer = this.cachedNoise(dur, 3);

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(size === 'large' ? 450 : 800, t);
        filter.frequency.exponentialRampToValueAtTime(60, t + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(size === 'large' ? 0.6 : 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);

        // Sub bass thump
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(size === 'large' ? 140 : 100, t);
        sub.frequency.exponentialRampToValueAtTime(30, t + dur);
        subGain.gain.setValueAtTime(size === 'large' ? 0.5 : 0.3, t);
        subGain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(t);
        sub.stop(t + dur);
      }

      playGemPickup() {
        if (!this.enabled || !this.ctx) return;
        const now = performance.now();
        if (now - this.lastGemTime < 250) {
          this.gemPitchIndex = (this.gemPitchIndex + 1) % this.scale.length;
        } else {
          this.gemPitchIndex = 0;
        }
        this.lastGemTime = now;

        const freq = this.scale[this.gemPitchIndex];
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.1);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
      }

      playDash() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }

      playZap() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
      }

      playLevelUp() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const start = t + idx * 0.08;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.2, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(start);
          osc.stop(start + 0.35);
        });
      }

      playBossAlert() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const st = t + i * 0.28;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, st);
          osc.frequency.linearRampToValueAtTime(580, st + 0.14);
          osc.frequency.linearRampToValueAtTime(320, st + 0.26);

          gain.gain.setValueAtTime(0.35, st);
          gain.gain.linearRampToValueAtTime(0.01, st + 0.27);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(st);
          osc.stop(st + 0.27);
        }
      }

      playHeal() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const st = t + idx * 0.06;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.2, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(st);
          osc.stop(st + 0.25);
        });
      }

      playNuke() {
        if (!this.enabled || !this.ctx) return;
        this.playExplosion('large');
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.8);
      }

      playBeam() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.linearRampToValueAtTime(750, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }

      playFreeze() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        [1200, 1600, 2200].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const st = t + idx * 0.04;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.15, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(st);
          osc.stop(st + 0.18);
        });
      }

      playBlackHole() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.4);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      }

      // Procedural Cyber Synth Background Loop
      startBGM() {
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        const bassNotes = [55, 55, 65.41, 55, 73.42, 55, 65.41, 49]; // A1, C2, D2, G1
        const tempo = 128; // BPM
        const interval = (60 / tempo / 2) * 1000; // 16th notes approx

        this.bgmTimer = setInterval(() => {
          if (!this.enabled || !this.ctx) return;
          const t = this.ctx.currentTime;
          const step = this.bgmStep % 16;

          // Bass synth
          if (step % 2 === 0) {
            const noteIdx = Math.floor(step / 2) % bassNotes.length;
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(bassNotes[noteIdx], t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.18);
          }

          // Kick Drum on 0, 4, 8, 12
          if (step % 4 === 0) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.frequency.setValueAtTime(120, t);
            kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.1);
            kickGain.gain.setValueAtTime(0.2, t);
            kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            kickOsc.connect(kickGain);
            kickGain.connect(this.masterGain);
            kickOsc.start(t);
            kickOsc.stop(t + 0.12);
          }

          // Hi-hat on every odd step
          if (step % 2 === 1) {
            // Cached: this used to refill ~1.7k samples eight times per bar.
            const hat = this.ctx.createBufferSource();
            hat.buffer = this.cachedNoise(0.04, 15);
            const hatFilter = this.ctx.createBiquadFilter();
            hatFilter.type = 'highpass';
            hatFilter.frequency.value = 6500;
            const hatGain = this.ctx.createGain();
            hatGain.gain.value = 0.04;
            hat.connect(hatFilter);
            hatFilter.connect(hatGain);
            hatGain.connect(this.masterGain);
            hat.start(t);
          }

          this.bgmStep++;
        }, interval);
      }
    }
