<script lang="ts">
  import { GameEngine } from '$lib/game/game.svelte.js'
  import type { AudioEngine } from '$lib/audio/AudioEngine'

  let { engine, audio }: { engine: GameEngine; audio: AudioEngine } = $props()
  let loading = $state(false)

  async function handlePlay() {
    if (loading) return
    loading = true
    audio.resumeIfNeeded()
    if (!audio.isReady) {
      await audio.init()
    }
    loading = false
    engine.goToSongSelect()
  }
</script>

<div class="menu">
  <div class="title-wrap">
    <div class="icon">🎹</div>
    <h1 class="title">Piano Tiles</h1>
    <p class="subtitle">Tap the tiles to the rhythm</p>
  </div>

  <button class="play-btn" onclick={handlePlay} disabled={loading}>
    {#if loading}
      <span class="loader"></span>
      Loading...
    {:else}
      <span class="play-icon">▶</span>
      Play
    {/if}
  </button>

  <div class="volume-wrap">
    <label class="vol-label">
      <span>Volume</span>
      <input
        type="range"
        min="0"
        max="100"
        value={audio.getVolume() * 100}
        oninput={(e) => audio.setVolume(Number(e.currentTarget.value) / 100)}
      />
    </label>
  </div>

  <div class="footer">
    <span>v0.1</span>
  </div>
</div>

<style>
  .menu {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100svh;
    width: 100%;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    padding: 32px;
    box-sizing: border-box;
    gap: 48px;
  }

  .title-wrap {
    text-align: center;
  }

  .icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .title {
    font-size: 42px;
    font-weight: 700;
    color: #fff;
    margin: 0;
    letter-spacing: -0.5px;
  }

  .subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.5);
    margin: 8px 0 0;
    font-weight: 400;
  }

  .play-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border: none;
    border-radius: 16px;
    padding: 18px 64px;
    font-size: 20px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4);
    min-width: 200px;
    justify-content: center;
  }

  .play-btn:active:not(:disabled) {
    transform: scale(0.96);
    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
  }

  .play-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .play-icon {
    font-size: 18px;
  }

  .loader {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .volume-wrap {
    width: 200px;
  }

  .vol-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    text-align: center;
  }

  .vol-label input[type="range"] {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
    outline: none;
  }

  .vol-label input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .footer {
    position: absolute;
    bottom: 24px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 13px;
  }
</style>
