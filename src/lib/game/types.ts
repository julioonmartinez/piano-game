export interface TileData {
  id: number
  lane: number
  time: number
  duration: number
  midiNote: number
}

export interface Tile extends TileData {
  y: number
  tapped: boolean
  missed: boolean
  judgment: Judgment | null
  flashTimer: number
}

export interface NoteEvent {
  midiNote: number
  time: number
  duration: number
  lane: number
}

export interface SongData {
  id: string
  title: string
  composer: string
  bpm: number
  notes: NoteEvent[]
  duration: number
}

export type Judgment = 'perfect' | 'good' | 'bad' | 'miss'
export type Phase = 'menu' | 'songselect' | 'countdown' | 'playing' | 'gameover'

export interface GameConfig {
  scrollSpeed: number
  hitZoneY: number
  hitWindow: number
  lanes: number
}

export interface HighScore {
  songId: string
  score: number
  maxCombo: number
  date: number
}
