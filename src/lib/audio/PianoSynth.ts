export class PianoSynth {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private reverbNode: ConvolverNode | null = null
  private reverbGain: GainNode | null = null

  get isReady(): boolean {
    return this.ctx !== null
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0
  }

  async init(): Promise<void> {
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.5
    this.masterGain.connect(this.ctx.destination)

    reverbImpulse(this.ctx).then((buffer) => {
      if (!this.ctx || !this.masterGain) return
      const rev = this.ctx.createConvolver()
      rev.buffer = buffer
      const revGain = this.ctx.createGain()
      revGain.gain.value = 0.15
      rev.connect(revGain)
      revGain.connect(this.masterGain)
      this.reverbNode = rev
      this.reverbGain = revGain
    })
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setVolume(v: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v))
    }
  }

  playNote(midiNote: number, time?: number, duration: number = 0.6): void {
    if (!this.ctx || !this.masterGain) return
    const t = time ?? this.ctx.currentTime
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12)
    const vel = 0.7 + Math.random() * 0.15

    const noteGain = this.ctx.createGain()
    noteGain.connect(this.masterGain)
    if (this.reverbNode) {
      noteGain.connect(this.reverbNode)
    }

    const env = this.ctx.createGain()
    env.connect(noteGain)

    const attack = 0.003
    const decay = 0.08
    const sustain = 0.3
    const release = duration

    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(vel, t + attack)
    env.gain.exponentialRampToValueAtTime(vel * sustain, t + decay + attack)
    env.gain.exponentialRampToValueAtTime(0.001, t + release)

    const oscCount = midiNote > 72 ? 2 : 3
    const detune = [0, -5, 7]

    for (let i = 0; i < oscCount; i++) {
      const osc = this.ctx.createOscillator()
      const oscType: OscillatorType = i === 0 ? 'triangle' : 'sine'
      osc.type = oscType
      osc.frequency.value = freq
      osc.detune.value = detune[i]

      const oscGain = this.ctx.createGain()
      const mix = i === 0 ? 0.6 : i === 1 ? 0.25 : 0.15
      oscGain.gain.value = mix

      osc.connect(oscGain)
      oscGain.connect(env)

      osc.start(t)
      osc.stop(t + release + 0.05)
    }

    if (midiNote < 72) {
      const sub = this.ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.value = freq * 0.5
      const subGain = this.ctx.createGain()
      subGain.gain.value = 0.12
      sub.connect(subGain)
      subGain.connect(env)
      sub.start(t)
      sub.stop(t + release + 0.05)
    }

    const noiseLen = 0.012
    const noise = this.ctx.createBufferSource()
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15
    }
    noise.buffer = buf
    const noiseGain = this.ctx.createGain()
    noiseGain.gain.setValueAtTime(0.08, t)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.005)
    const noiseFilter = this.ctx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 3000
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(noteGain)
    noise.start(t)
    noise.stop(t + noiseLen + 0.01)
  }

  playEffect(type: 'tap' | 'perfect' | 'good' | 'miss'): void {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime

    if (type === 'tap') {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 800
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.06, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
      osc.connect(g)
      g.connect(this.masterGain)
      osc.start(t)
      osc.stop(t + 0.05)
      return
    }

    if (type === 'miss') {
      const osc = this.ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 180
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.15, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.connect(g)
      g.connect(this.masterGain)
      osc.start(t)
      osc.stop(t + 0.3)

      const osc2 = this.ctx.createOscillator()
      osc2.type = 'sawtooth'
      osc2.frequency.value = 120
      const g2 = this.ctx.createGain()
      g2.gain.setValueAtTime(0.1, t)
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      osc2.connect(g2)
      g2.connect(this.masterGain)
      osc2.start(t)
      osc2.stop(t + 0.25)
      return
    }

    if (type === 'perfect') {
      const freqs = [1200, 1500, 1800]
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freqs[i]
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0.07, t + i * 0.06)
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15)
        osc.connect(g)
        g.connect(this.masterGain)
        osc.start(t + i * 0.06)
        osc.stop(t + i * 0.06 + 0.2)
      }
      return
    }

    if (type === 'good') {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 600
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.08, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      osc.connect(g)
      g.connect(this.masterGain)
      osc.start(t)
      osc.stop(t + 0.12)
    }
  }

  playMetronome(): void {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 1200
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.07, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.connect(g)
    g.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.07)
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}

async function reverbImpulse(ctx: AudioContext): Promise<AudioBuffer> {
  const len = ctx.sampleRate * 0.8
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.15))
      data[i] = (Math.random() * 2 - 1) * decay
    }
  }
  return buf
}
