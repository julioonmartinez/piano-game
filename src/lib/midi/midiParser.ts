import type { SongData, NoteEvent } from '$lib/game/types'

function readU16(data: Uint8Array, off: number): number {
  return (data[off] << 8) | data[off + 1]
}

function readU32(data: Uint8Array, off: number): number {
  return (data[off] << 24) | (data[off + 1] << 16) | (data[off + 2] << 8) | data[off + 3]
}

function readVarLen(data: Uint8Array, off: number): [number, number] {
  let value = 0
  let bytes = 0
  while (true) {
    const b = data[off + bytes]
    value = (value << 7) | (b & 0x7f)
    bytes++
    if (!(b & 0x80)) break
  }
  return [value, bytes]
}

interface MidiEvent {
  delta: number
  type: string
  channel: number
  note?: number
  velocity?: number
  tempo?: number
}

export function parseMidi(buffer: ArrayBuffer): SongData | null {
  const data = new Uint8Array(buffer)

  if (data[0] !== 0x4d || data[1] !== 0x54 || data[2] !== 0x68 || data[3] !== 0x64) {
    return null
  }

  const headerLen = readU32(data, 4)
  const format = readU16(data, 8 + 4)
  const numTracks = readU16(data, 8 + 6)
  const division = readU16(data, 8 + 8)
  const ticksPerBeat = division & 0x8000 ? 480 : division

  const trackEvents: { delta: number; type: string; note?: number; velocity?: number; tempo?: number }[][] = []
  let ptr = 8 + headerLen

  for (let t = 0; t < numTracks; t++) {
    if (ptr + 8 > data.length) break
    if (data[ptr] !== 0x4d || data[ptr + 1] !== 0x54 || data[ptr + 2] !== 0x72 || data[ptr + 3] !== 0x6b) {
      ptr += 4
      const len = readU32(data, ptr)
      ptr += 4 + len
      continue
    }
    const trkLen = readU32(data, ptr + 4)
    ptr += 8
    const end = ptr + trkLen
    const events: MidiEvent[] = []
    let runningStatus = 0

    while (ptr < end) {
      const [delta, dbytes] = readVarLen(data, ptr)
      ptr += dbytes

      let status = data[ptr]
      if (status & 0x80) {
        runningStatus = status
        ptr++
      } else {
        status = runningStatus
      }

      const statusHi = status >> 4
      const channel = status & 0x0f

      if (statusHi === 0x8 || statusHi === 0x9) {
        const note = data[ptr]
        const velocity = data[ptr + 1]
        ptr += 2
        if (statusHi === 0x9 && velocity > 0) {
          events.push({ delta, type: 'noteOn', channel, note, velocity })
        } else {
          events.push({ delta, type: 'noteOff', channel, note, velocity })
        }
      } else if (status === 0xff) {
        const type = data[ptr]
        const [len, lbytes] = readVarLen(data, ptr + 1)
        ptr += 1 + lbytes + len
        if (type === 0x51 && len >= 3) {
          const tempo = readU32(new Uint8Array([0, data[ptr - len], data[ptr - len + 1], data[ptr - len + 2]]), 0)
          events.push({ delta, type: 'tempo', channel: 0, tempo })
        }
      } else {
        const metaLen = data[ptr]
        ptr += 1 + metaLen
      }
    }
    trackEvents.push(events)
  }

  let bpm = 120
  const noteOns: { tick: number; note: number; channel: number }[] = []
  const noteOffs: { tick: number; note: number; channel: number }[] = []
  let absTick = 0

  for (const events of trackEvents) {
    absTick = 0
    for (const raw of events) {
      const ev = raw as MidiEvent
      absTick += ev.delta
      if (ev.type === 'tempo' && ev.tempo) {
        bpm = Math.round(60_000_000 / ev.tempo)
      }
      if (ev.type === 'noteOn' && ev.note !== undefined && ev.velocity !== undefined) {
        noteOns.push({ tick: absTick, note: ev.note, channel: ev.channel })
      }
    }
  }

  if (noteOns.length < 5) return null

  const beatSec = 60 / bpm

  const melodyChannel = findMelodyChannel(noteOns)
  const melodyNotes = noteOns.filter(n => n.channel === melodyChannel)

  if (melodyNotes.length < 5) {
    return null
  }

  const notes: { tick: number; midiNote: number }[] = []
  const seen = new Set<string>()
  for (const n of melodyNotes) {
    const key = `${n.tick}_${n.note}`
    if (seen.has(key)) continue
    seen.add(key)
    notes.push({ tick: n.tick, midiNote: n.note })
  }

  const minNote = notes.length > 0 ? Math.min(...notes.map(n => n.midiNote)) : 60
  const maxNote = notes.length > 0 ? Math.max(...notes.map(n => n.midiNote)) : 72
  const noteRange = maxNote - minNote || 1

  const minTick = notes[0]?.tick ?? 0
  const tileNotes: NoteEvent[] = notes.map((n) => {
    const time = ((n.tick - minTick) / ticksPerBeat) * beatSec
    const normalized = (n.midiNote - minNote) / noteRange
    const lane = Math.min(3, Math.floor(normalized * 4))
    return { midiNote: n.midiNote, time, duration: beatSec * 0.4, lane }
  })

  const totalTime = tileNotes.length > 0 ? tileNotes[tileNotes.length - 1].time + beatSec : 30

  return {
    id: `user-${Date.now()}`,
    title: 'Imported Song',
    composer: 'Unknown',
    bpm,
    notes: tileNotes,
    duration: totalTime,
  }
}

function findMelodyChannel(notes: { channel: number }[]): number {
  const counts = new Map<number, number>()
  for (const n of notes) {
    counts.set(n.channel, (counts.get(n.channel) ?? 0) + 1)
  }
  let bestChan = 0
  let bestCount = 0
  for (const [ch, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestChan = ch
    }
  }
  return bestChan
}
