<script lang="ts">
  import type { SongData } from '$lib/game/types'

  let {
    song,
    best,
    onclick,
  }: {
    song: SongData
    best: number | null
    onclick: () => void
  } = $props()

  let diff = $derived.by(() => {
    const nps = song.notes.length / song.duration
    if (nps < 1.5) return 'Easy'
    if (nps < 2.5) return 'Medium'
    return 'Hard'
  })

  let diffColor = $derived.by(() => {
    if (diff === 'Easy') return '#4CAF50'
    if (diff === 'Medium') return '#FF9800'
    return '#f44336'
  })

  let composerInitials = $derived(
    song.composer.split(' ').map(t => t[0]).join('')
  )
</script>

<button class="card" onclick={onclick}>
  <div class="card-badge">{composerInitials}</div>
  <div class="card-body">
    <div class="card-title">{song.title}</div>
    <div class="card-composer">{song.composer}</div>
    <div class="card-meta">
      <span class="difficulty" style="color: {diffColor}">
        {diff}
      </span>
      <span class="duration">{Math.round(song.duration)}s</span>
      <span class="bpm">{song.bpm} BPM</span>
    </div>
    {#if best !== null}
      <div class="best">Best: {best}</div>
    {/if}
  </div>
</button>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    text-align: left;
    color: #fff;
    font-family: inherit;
    font-size: inherit;
  }

  .card:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.1);
  }

  .card-badge {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .card-body {
    flex: 1;
    min-width: 0;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-composer {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 1px;
  }

  .card-meta {
    display: flex;
    gap: 10px;
    margin-top: 6px;
    font-size: 11px;
  }

  .difficulty {
    font-weight: 600;
  }

  .duration,
  .bpm {
    color: rgba(255, 255, 255, 0.35);
  }

  .best {
    font-size: 11px;
    color: rgba(255, 215, 0, 0.7);
    margin-top: 4px;
  }
</style>
