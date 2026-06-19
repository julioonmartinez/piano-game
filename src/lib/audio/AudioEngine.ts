import { PianoSynth } from './PianoSynth'

export type AudioState = 'uninitialized' | 'loading' | 'ready' | 'error'

export class AudioEngine {
  private synth: PianoSynth | null = null
  state: AudioState = 'uninitialized'
  private volume: number = 0.5
  private resumeOnInteraction: boolean = true

  get isReady(): boolean {
    return this.synth?.isReady ?? false
  }

  async init(): Promise<void> {
    if (this.state === 'loading' || this.state === 'ready') return
    this.state = 'loading'
    try {
      this.synth = new PianoSynth()
      await this.synth.init()
      this.synth.setVolume(this.volume)
      this.state = 'ready'
    } catch (e) {
      console.error('Audio init failed:', e)
      this.state = 'error'
    }
  }

  resumeIfNeeded(): void {
    if (this.resumeOnInteraction && this.synth) {
      this.synth.resume()
    }
  }

  setVolume(v: number): void {
    this.volume = v
    this.synth?.setVolume(v)
  }

  getVolume(): number {
    return this.volume
  }

  playNote(midiNote: number, time?: number, duration?: number): void {
    this.synth?.playNote(midiNote, time, duration)
  }

  playEffect(type: 'tap' | 'perfect' | 'good' | 'miss'): void {
    this.synth?.playEffect(type)
  }

  laneToNote(lane: number): number {
    return 60 + lane * 2
  }

  destroy(): void {
    this.synth?.destroy()
    this.synth = null
    this.state = 'uninitialized'
  }
}
