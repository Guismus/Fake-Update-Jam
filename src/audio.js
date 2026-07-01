class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicPlaying = false;
    this.sequenceTimer = null;
    
    // Song definition: 8-bar retro loop
    // Notes are MIDI values, -1 represents a rest
    this.bassline = [
      48, 48, 55, 48, 51, 51, 58, 51,
      43, 43, 50, 43, 46, 46, 53, 46,
      48, 48, 55, 48, 51, 51, 58, 51,
      45, 45, 52, 45, 41, 41, 48, 41
    ];
    
    this.melody = [
      60, -1, 63, 67, 70, 67, 63, -1,
      58, -1, 62, 65, 69, 65, 62, -1,
      60, 63, 67, 72, 70, 67, 63, 60,
      57, -1, 60, -1, 53, 57, 60, 62
    ];
    
    this.currentStep = 0;
    this.tempo = 110; // BPM
    this.glitchIntensity = 0; // 0 (normal) to 1 (extreme)
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
    
    this.startMusicLoop();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.init(); // ensure active
    this.setMuted(!this.muted);
    return this.muted;
  }

  setGlitchIntensity(val) {
    this.glitchIntensity = Math.min(1, Math.max(0, val));
  }

  midiToFreq(midi) {
    if (midi <= 0) return 0;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  playClick() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playSelect() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.06);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playSuccess() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const notes = [52, 57, 60, 64, 69]; // C Am chord rising notes
    
    notes.forEach((midi, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.midiToFreq(midi), now + index * 0.07);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + index * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(now + index * 0.07);
      osc.stop(now + index * 0.07 + 0.35);
    });
  }

  playError() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc1.frequency.linearRampToValueAtTime(80, now + 0.3);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(133, now);
    osc2.frequency.linearRampToValueAtTime(83, now + 0.3);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.31);
    osc2.stop(now + 0.31);
  }

  playGlitch() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(Math.random() * 1000 + 100, now);
    osc.frequency.setValueAtTime(Math.random() * 2000 + 50, now + 0.05);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playJump() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.15);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playPickup() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(950, now + 0.06);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.setValueAtTime(0.1, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playHurt() {
    this.init();
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.27);
  }

  startMusicLoop() {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    
    const scheduler = () => {
      if (!this.musicPlaying) return;
      const stepDuration = 60 / this.tempo / 4; // sixteenth notes
      this.playStep();
      this.currentStep = (this.currentStep + 1) % 32;
      this.sequenceTimer = setTimeout(scheduler, stepDuration * 1000);
    };
    
    scheduler();
  }

  playStep() {
    if (this.muted || !this.ctx || this.ctx.state === 'suspended') return;
    
    const now = this.ctx.currentTime;
    const glitch = this.glitchIntensity;
    
    // 1. Play Bass Note
    const bassNote = this.bassline[this.currentStep];
    if (bassNote !== -1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // If glitched, mutate waveform and pitch slightly
      if (glitch > 0.4 && Math.random() < glitch * 0.3) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(this.midiToFreq(bassNote + Math.floor(Math.random() * 5 - 2)), now);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(this.midiToFreq(bassNote), now);
      }
      
      const decay = (60 / this.tempo / 4) * 0.8;
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      
      osc.start(now);
      osc.stop(now + decay + 0.05);
    }
    
    // 2. Play Melody Note
    const melodyNote = this.melody[this.currentStep];
    // Under high glitch, melody notes become scrambled
    let playedMelodyNote = melodyNote;
    if (glitch > 0.2 && melodyNote !== -1 && Math.random() < glitch * 0.5) {
      playedMelodyNote += Math.random() > 0.5 ? 12 : -12; // octave jumps
    }
    
    if (playedMelodyNote !== -1 && playedMelodyNote !== undefined) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.midiToFreq(playedMelodyNote), now);
      
      // Pitch glide/slide effect if glitched
      if (glitch > 0.5) {
        osc.frequency.exponentialRampToValueAtTime(this.midiToFreq(playedMelodyNote - 5), now + 0.1);
      }
      
      const decay = 0.12 + glitch * 0.1;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      
      osc.start(now);
      osc.stop(now + decay + 0.05);
    }
    
    // 3. Play simple hi-hat / snare noise on beats 2 and 4
    const beatIndex = this.currentStep % 8;
    if (beatIndex === 4 || (glitch > 0.6 && Math.random() < glitch * 0.2)) {
      this.playSnareNoise(now);
    }
  }

  playSnareNoise(time) {
    if (!this.ctx) return;
    
    // Create quick noise buffer
    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000 + (this.glitchIntensity * 2000);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    
    noiseNode.start(time);
    noiseNode.stop(time + 0.05);
  }

  stop() {
    this.musicPlaying = false;
    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
    }
  }
}

export const audio = new AudioSystem();
