<script lang="ts">
  import GameEngine from '$lib/game/GameEngine.svelte'
  import { GameEngine as Engine } from '$lib/game/game.svelte.js'

  let { engine }: { engine: Engine } = $props()

  let showTapGuide = $state(true)

  $effect(() => {
    if (engine.phase === 'playing') {
      const t = setTimeout(() => showTapGuide = false, 2000)
      return () => clearTimeout(t)
    }
  })
</script>

<div class="game-view">
  <div class="canvas-container">
    <GameEngine {engine} />
    {#if showTapGuide && engine.phase === 'playing'}
      <div class="tap-guide">
        Tap the tiles as they reach the line
      </div>
    {/if}
  </div>
</div>

<style>
  .game-view {
    position: relative;
    width: 100%;
    height: 100svh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fafafa;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    min-height: 0;
  }

  .tap-guide {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    pointer-events: none;
    z-index: 10;
    white-space: nowrap;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
