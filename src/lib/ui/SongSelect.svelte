<script lang="ts">
  import SongCard from './SongCard.svelte'
  import { songs as preloadedSongs } from '$lib/songs/songs'
  import { parseMidi } from '$lib/midi/midiParser'
  import { GameEngine } from '$lib/game/game.svelte.js'
  import type { AudioEngine } from '$lib/audio/AudioEngine'
  import type { SongData } from '$lib/game/types'
  import { loadHighScores, type HighScoreMap } from '$lib/storage/db'

  let {
    engine,
    audio,
  }: {
    engine: GameEngine
    audio: AudioEngine
  } = $props()

  let songList = $state<SongData[]>([...preloadedSongs])
  let highScores = $state<HighScoreMap>({})
  let importError = $state('')
  let importSuccess = $state('')

  async function handlePlay(songId: string) {
    const song = songList.find(s => s.id === songId)
    if (!song) return

    audio.resumeIfNeeded()
    if (!audio.isReady) {
      await audio.init()
    }

    engine.startGame(song)
  }

  function handleMidiImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    importError = ''
    importSuccess = ''

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const song = parseMidi(reader.result as ArrayBuffer)
        if (!song) {
          importError = 'Could not parse MIDI file'
          return
        }
        song.title = file.name.replace(/\.midi?$/i, '')
        song.id = `user-${Date.now()}`
        song.composer = 'Imported'
        songList = [song, ...songList]
        importSuccess = `"${song.title}" loaded`
      } catch {
        importError = 'Invalid MIDI file'
      }
    }
    reader.readAsArrayBuffer(file)
    input.value = ''
  }

  $effect(() => {
    loadHighScores().then(scores => {
      highScores = scores
    })
  })
</script>

<div class="screen">
  <header class="header">
    <button class="back" onclick={() => engine.goToMenu()}>
      ← Back
    </button>
    <h1 class="title">Select Song</h1>
    <div class="spacer"></div>
  </header>

  <div class="list">
    {#each songList as song (song.id)}
      <SongCard
        song={song}
        best={highScores[song.id]?.score ?? null}
        onclick={() => handlePlay(song.id)}
      />
    {/each}
  </div>

  <div class="import-area">
    {#if importError}
      <div class="import-status error">{importError}</div>
    {/if}
    {#if importSuccess}
      <div class="import-status success">{importSuccess}</div>
    {/if}
    <label class="import-label">
      Import MIDI file
      <input
        type="file"
        accept=".mid,.midi"
        class="file-input"
        onchange={handleMidiImport}
      />
    </label>
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100svh;
    width: 100%;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    padding: 16px;
    gap: 12px;
    flex-shrink: 0;
  }

  .back {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }

  .back:active {
    background: rgba(255, 255, 255, 0.15);
  }

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin: 0;
    flex: 1;
    text-align: center;
  }

  .spacer {
    width: 64px;
    flex-shrink: 0;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 16px 16px;
  }

  .import-area {
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .import-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.15);
    transition: border-color 0.15s;
  }

  .import-label:active {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .file-input {
    display: none;
  }

  .import-status {
    text-align: center;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .import-status.error {
    color: #f44336;
    background: rgba(244, 67, 54, 0.1);
  }

  .import-status.success {
    color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
  }
</style>
