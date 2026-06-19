<script lang="ts">
  import { GameEngine } from '$lib/game/game.svelte.js'
  import { AudioEngine } from '$lib/audio/AudioEngine'
  import Menu from '$lib/ui/Menu.svelte'
  import SongSelect from '$lib/ui/SongSelect.svelte'
  import GameView from '$lib/ui/GameView.svelte'

  const engine = new GameEngine()
  const audio = new AudioEngine()

  engine.setAudio(audio)
</script>

{#if engine.phase === 'menu'}
  <Menu {engine} {audio} />
{:else if engine.phase === 'songselect'}
  <SongSelect {engine} {audio} />
{:else}
  <GameView {engine} />
{/if}
