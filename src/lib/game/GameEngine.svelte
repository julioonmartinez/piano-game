<script lang="ts">
  import { onMount } from 'svelte'
  import { GameEngine } from './game.svelte.js'
  import { InputHandler } from './input.js'

  let { engine }: { engine: GameEngine } = $props()

  let canvas: HTMLCanvasElement

  function handleTap(lane: number) {
    engine.tapLane(lane)
  }

  function setupCanvas() {
    const parent = canvas.parentElement!
    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    engine.setCanvas(ctx, rect.width, rect.height)
    const input = new InputHandler(canvas, handleTap)

    const ro = new ResizeObserver(() => {
      const r = parent.getBoundingClientRect()
      canvas.width = r.width * dpr
      canvas.height = r.height * dpr
      canvas.style.width = `${r.width}px`
      canvas.style.height = `${r.height}px`
      ctx.scale(dpr, dpr)
      engine.resize(r.width, r.height)
    })
    ro.observe(parent)

    return () => {
      ro.disconnect()
      input.destroy()
    }
  }

  onMount(() => {
    const cleanup = setupCanvas()
    return cleanup
  })
</script>

<canvas
  bind:this={canvas}
  aria-label="Piano Tiles game area"
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
