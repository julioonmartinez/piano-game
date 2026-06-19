import type { SongData, NoteEvent } from '$lib/game/types'

type RawNote = [midiNote: number, beats: number]

function buildSong(
  id: string, title: string, composer: string,
  bpm: number, rawNotes: RawNote[],
): SongData {
  const beatSec = 60 / bpm
  const minNote = Math.min(...rawNotes.map(n => n[0]))
  const maxNote = Math.max(...rawNotes.map(n => n[0]))
  const range = maxNote - minNote || 1

  const notes: NoteEvent[] = []
  let time = 0

  for (const [midi, beats] of rawNotes) {
    const dur = beats * beatSec
    const normalized = (midi - minNote) / range
    const lane = Math.min(3, Math.floor(normalized * 4))

    notes.push({ midiNote: midi, time, duration: dur * 0.8, lane })
    time += dur
  }

  return { id, title, composer, bpm, notes, duration: time }
}

const B3 = 59, C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71
const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81
const Db4 = 61, Eb4 = 63, Gb4 = 66, Ab4 = 68, Bb4 = 70
const Db5 = 73, Eb5 = 75, Gb5 = 78, Ab5 = 80, Bb5 = 82

function q(n: number): RawNote { return [n, 1] }
function e(n: number): RawNote { return [n, 0.5] }
function h(n: number): RawNote { return [n, 2] }
function w(n: number): RawNote { return [n, 4] }
function qd(n: number): RawNote { return [n, 1.5] }
function ed(n: number): RawNote { return [n, 0.75] }

export const songs: SongData[] = [
  buildSong('ode-to-joy', 'Ode to Joy', 'Beethoven', 120, [
    e(E4), e(E4), e(F4), q(G4), e(G4), e(F4), e(E4), q(D4),
    e(C4), e(C4), e(D4), q(E4), q(E4), h(D4),
    e(E4), e(E4), e(F4), q(G4), e(G4), e(F4), e(E4), q(D4),
    e(C4), e(C4), e(D4), q(E4), q(D4), h(C4),
  ]),

  buildSong('canon-d', 'Canon in D', 'Pachelbel', 110, [
    q(A4), q(G4), q(F4), q(E4), q(D4), q(F4), q(E4), q(D4),
    q(A4), q(G4), q(F4), q(E4), q(E4), q(F4), q(G4), h(A4),
    h(G4), h(F4), h(E4), q(D4), q(F4), q(E4), h(D4),
    q(A4), q(G4), q(F4), q(E4), q(E4), q(F4), q(G4), h(A4),
  ]),

  buildSong('fur-elise', 'Für Elise', 'Beethoven', 126, [
    e(E5), e(Db5), e(E5), e(Db5), e(E5), e(B4), e(D5), e(C5),
    e(A4), q(C4), e(E4), e(A4), q(B4), e(E4), e(Ab4), q(B4),
    e(C5), q(E4), e(E5), e(Db5), e(E5), e(Db5), e(E5), e(B4),
    e(D5), e(C5), e(A4), q(C4), e(E4), e(A4), q(B4), q(E4),
  ]),

  buildSong('turkish-march', 'Turkish March', 'Mozart', 138, [
    q(A4), q(B4), q(C5), q(D5), e(C5), e(B4), e(A4), e(G4),
    q(A4), e(B4), e(C5), q(A4), e(G4), e(F4), q(E4), q(E4),
    q(A4), q(B4), q(C5), q(D5), e(C5), e(B4), e(A4), e(G4),
    q(A4), e(B4), e(C5), q(A4), e(G4), e(F4), q(E4), q(E4),
  ]),

  buildSong('swan-lake', 'Swan Lake', 'Tchaikovsky', 95, [
    q(B4), q(D5), q(E5), q(D5), e(B4), e(G4), e(A4), e(B4),
    e(G4), e(E4), q(G4), q(B4), q(D5), q(E5), e(D5), e(B4),
    q(G4), h(E4), q(B4), q(D5), q(E5), q(F5),
    e(E5), e(D5), e(C5), e(B4), q(A4), h(G4),
  ]),

  buildSong('entertainer', 'The Entertainer', 'Joplin', 140, [
    e(C4), e(E4), q(G4), e(G4), e(E4), e(G4), q(A4),
    e(G4), e(E4), q(G4), e(A4), e(C5), q(D5), e(C5), e(A4),
    q(G4), e(A4), e(G4), q(E4), e(D4), e(E4), q(G4),
    e(F4), e(D4), q(C4), e(E4), e(G4), q(C5), h(C4),
    e(C4), e(E4), q(G4), e(G4), e(E4), e(G4), q(A4),
    e(G4), e(E4), q(G4), e(A4), e(C5), q(D5), e(C5), e(A4),
    q(G4), e(A4), e(G4), q(E4), e(D4), e(E4), q(G4),
    e(F4), e(D4), q(C4), e(E4), e(G4), q(C5), h(C4),
  ]),

  buildSong('kleine-nacht', 'Eine Kleine Nachtmusik', 'Mozart', 132, [
    q(G4), q(D5), q(D5), e(C5), e(B4), e(A4), e(G4),
    q(F4), q(E4), q(D4), q(C4), q(D4), q(E4), q(F4), q(G4),
    q(G4), q(D5), q(D5), e(C5), e(B4), e(A4), e(G4),
    q(F4), q(E4), q(D4), q(G4), q(G4), h(G4),
  ]),

  buildSong('moonlight', 'Moonlight Sonata', 'Beethoven', 72, [
    q(Db4), q(Gb4), q(Ab4), q(A4), q(Db4), q(Gb4), q(Ab4), q(A4),
    q(B3), q(Gb4), q(Ab4), q(A4), q(B3), q(Gb4), q(Ab4), q(A4),
    q(E4), q(G4), h(B4), q(E4), q(G4), h(B4),
    q(Db4), q(Gb4), q(Ab4), q(A4), q(Db4), q(Gb4), q(Ab4), q(A4),
  ]),

  buildSong('waltz-am', 'Waltz in A Minor', 'Chopin', 130, [
    q(A4), e(B4), e(C5), q(D5), q(E5), q(A4),
    q(G4), e(A4), e(B4), q(C5), q(D5), q(E5),
    q(F5), q(E5), q(D5), q(C5), q(B4), q(C5),
    q(D5), q(C5), q(B4), q(A4), q(G4), q(E4),
  ]),

  buildSong('clair-lune', 'Clair de Lune', 'Debussy', 72, [
    q(Db4), h(Ab4), q(Gb4), q(F4), q(Db4), q(E4), q(F4),
    q(Gb4), q(Ab4), q(Bb4), q(Db5), q(C5), q(Bb4),
    q(Ab4), q(Gb4), q(F4), q(E4), q(F4), q(Gb4), q(Ab4),
    q(Bb4), h(Ab4), q(Gb4), q(F4), q(Db4), h(Db4),
  ]),
]

export function getSongById(id: string): SongData | undefined {
  return songs.find(s => s.id === id)
}

export function getDifficulty(song: SongData): string {
  const nps = song.notes.length / song.duration
  if (nps < 1.5) return 'Easy'
  if (nps < 2.5) return 'Medium'
  return 'Hard'
}
