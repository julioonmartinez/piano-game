import type { Tile, TileData, Judgment, Phase, GameConfig, SongData, NoteEvent, HighScore } from './types'
import type { AudioEngine } from '$lib/audio/AudioEngine'
import { saveHighScore } from '$lib/storage/db'

const CONFIG: GameConfig = {
  scrollSpeed: 280,
  hitZoneY: 0.82,
  hitWindow: 0.25,
  lanes: 4,
}

export class GameEngine {
  score = $state(0)
  combo = $state(0)
  maxCombo = $state(0)
  phase = $state<Phase>('menu')
  lastJudgment = $state<Judgment | null>(null)
  currentSong = $state<SongData | null>(null)

  tiles: Tile[] = []
  countdownStep = $state(3)
  private config: GameConfig
  private animFrameId: number | null = null
  private lastTime: number = 0
  private elapsed: number = 0
  private tileIdCounter: number = 0
  private ctx: CanvasRenderingContext2D | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private animTime: number = 0
  private audio: AudioEngine | null = null
  private countdownTimer: number = 0
  private countdownToPlaying: boolean = false
  private countdownClicks: number = 0
  private goTime: number = 0

  constructor() {
    this.config = { ...CONFIG }
  }

  setAudio(audio: AudioEngine): void {
    this.audio = audio
  }

  setCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.canvasWidth = width
    this.canvasHeight = height
  }

  resize(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  startGame(song?: SongData) {
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.lastJudgment = null
    this.elapsed = 0
    this.tileIdCounter = 0
    this.animTime = 0
    this.currentSong = song ?? null
    this.tiles = song ? this.songToTiles(song) : this.generateLevel()
    this.countdownStep = 3
    this.countdownTimer = 0
    this.countdownToPlaying = false
    this.countdownClicks = 0
    this.goTime = 0
    this.phase = 'countdown'
    this.lastTime = performance.now()

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId)
    this.loop(this.lastTime)
  }

  restartGame() {
    this.startGame(this.currentSong ?? undefined)
  }

  goToMenu() {
    this.phase = 'menu'
  }

  goToSongSelect() {
    this.phase = 'songselect'
  }

  tapLane(lane: number) {
    if (this.phase !== 'playing') {
      if (this.phase === 'gameover') {
        this.goToMenu()
      }
      return
    }

    const nextTile = this.getNextTile()
    if (!nextTile) return

    const hitZoneY = this.canvasHeight * this.config.hitZoneY
    const dist = Math.abs(nextTile.y - hitZoneY)

    if (dist > this.config.scrollSpeed * this.config.hitWindow + 20) {
      return
    }

    if (nextTile.lane !== lane) {
      this.missTile(nextTile, 'miss')
      return
    }

    const error = dist / this.config.scrollSpeed
    let judgment: Judgment
    let points: number

    if (error < 0.05) {
      judgment = 'perfect'
      points = 10
    } else if (error < 0.12) {
      judgment = 'good'
      points = 5
    } else {
      judgment = 'bad'
      points = 2
    }

    nextTile.tapped = true
    nextTile.judgment = judgment
    nextTile.flashTimer = 0.3

    this.combo++
    if (this.combo > this.maxCombo) this.maxCombo = this.combo
    this.score += Math.floor(points * (1 + this.combo * 0.1))
    this.lastJudgment = judgment

    this.audio?.playEffect(judgment === 'perfect' ? 'perfect' : judgment === 'good' ? 'good' : 'tap')
    this.audio?.playNote(nextTile.midiNote, undefined, Math.min(nextTile.duration, 0.5))
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId)
  }

  private songToTiles(song: SongData): Tile[] {
    return song.notes.map((n, i) => ({
      id: this.tileIdCounter++,
      lane: n.lane,
      time: n.time,
      duration: n.duration,
      midiNote: n.midiNote,
      y: -60,
      tapped: false,
      missed: false,
      judgment: null,
      flashTimer: 0,
    }))
  }

  private generateLevel(): Tile[] {
    const tiles: Tile[] = []
    let time = 0.6
    let lastLane = -1

    for (let i = 0; i < 40; i++) {
      let lane = Math.floor(Math.random() * 4)
      while (lane === lastLane) {
        lane = Math.floor(Math.random() * 4)
      }
      lastLane = lane

      const gap = 0.3 + Math.random() * 0.4 - (i / 150)
      time += Math.max(gap, 0.22)

      tiles.push(this.createTile(lane, time, 0.2))
    }
    return tiles
  }

  private createTile(lane: number, time: number, duration: number): Tile {
    return {
      id: this.tileIdCounter++,
      lane,
      time,
      duration,
      midiNote: this.audio ? this.audio.laneToNote(lane) : 60 + lane * 2,
      y: -60,
      tapped: false,
      missed: false,
      judgment: null,
      flashTimer: 0,
    }
  }

  private getNextTile(): Tile | null {
    for (const t of this.tiles) {
      if (!t.tapped && !t.missed) return t
    }
    return null
  }

  private missTile(tile: Tile, judgment: Judgment) {
    tile.missed = true
    tile.judgment = judgment
    tile.flashTimer = 0.4
    this.combo = 0
    this.lastJudgment = judgment
    this.audio?.playEffect('miss')
    this.endGame()
  }

  private endGame() {
    this.phase = 'gameover'
    if (this.currentSong) {
      saveHighScore({
        songId: this.currentSong.id,
        score: this.score,
        maxCombo: this.maxCombo,
        date: Date.now(),
      })
    }
  }

  private loop = (now: number) => {
    const rawDt = (now - this.lastTime) / 1000
    this.lastTime = now

    if (this.ctx) {
      const dt = Math.min(rawDt, 0.05)
      this.animTime += dt

      if (this.phase === 'countdown') {
        this.updateCountdown(dt)
      } else if (this.phase === 'playing') {
        this.update(dt)
      }
      this.render()
    }
    this.animFrameId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    this.elapsed += dt
    const scrollSpeed = this.config.scrollSpeed
    const hitZoneY = this.canvasHeight * this.config.hitZoneY
    const hitWindowPx = scrollSpeed * this.config.hitWindow

    for (const tile of this.tiles) {
      if (tile.flashTimer > 0) {
        tile.flashTimer -= dt
      }

      if (tile.tapped || tile.missed) continue

      const targetY = hitZoneY - (tile.time - this.elapsed) * scrollSpeed
      tile.y = targetY

      if (tile.y > hitZoneY + hitWindowPx + 30) {
        if (!tile.tapped && !tile.missed) {
          this.missTile(tile, 'miss')
        }
      }
    }

    const remaining = this.tiles.filter(t => !t.tapped && !t.missed).length
    if (remaining === 0 && this.phase === 'playing') {
      this.endGame()
    }
  }

  private updateCountdown(dt: number) {
    this.countdownTimer += dt

    if (this.countdownStep > 0) {
      const stepDur = 0.8
      if (this.countdownTimer >= stepDur * (4 - this.countdownStep)) {
        if (this.countdownClicks < 4 - this.countdownStep) {
          this.playMetronomeClick()
          this.countdownClicks++
        }
        this.countdownStep = Math.max(0, 3 - Math.floor(this.countdownTimer / stepDur))
      }
    }

    if (this.countdownStep <= 0 && !this.countdownToPlaying) {
      this.countdownToPlaying = true
      this.goTime = this.countdownTimer
      this.countdownStep = 0
    }

    if (this.countdownToPlaying && this.countdownTimer - this.goTime > 0.6) {
      const firstTile = this.tiles[0]
      const hitZoneY = this.canvasHeight * this.config.hitZoneY
      const firstTileTime = firstTile ? firstTile.time : 0
      this.elapsed = firstTileTime - (hitZoneY + 60) / this.config.scrollSpeed
      this.phase = 'playing'
    }
  }

  private playMetronomeClick() {
    this.audio?.playMetronome()
  }

  private render() {
    if (!this.ctx) return
    const ctx = this.ctx

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

    const laneW = this.canvasWidth / 4
    const hitZoneY = this.canvasHeight * this.config.hitZoneY

    this.drawBackground(ctx)
    this.drawLanes(ctx, laneW)
    this.drawHitZone(ctx, laneW * 4, hitZoneY)
    this.drawTiles(ctx, hitZoneY)
    this.drawHUD(ctx, this.canvasWidth)

    if (this.phase === 'countdown') {
      this.drawCountdown(ctx)
    } else if (this.phase === 'gameover') {
      this.drawGameOver(ctx)
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.3, '#fafafa')
    grad.addColorStop(1, '#f5f5f5')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  private drawLanes(ctx: CanvasRenderingContext2D, laneW: number) {
    ctx.strokeStyle = '#eaeaea'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const x = i * laneW
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.canvasHeight)
      ctx.stroke()
    }
  }

  private drawHitZone(ctx: CanvasRenderingContext2D, w: number, y: number) {
    const grad = ctx.createLinearGradient(0, y - 25, 0, y + 25)
    grad.addColorStop(0, 'rgba(200, 200, 200, 0)')
    grad.addColorStop(0.5, 'rgba(200, 200, 200, 0.2)')
    grad.addColorStop(1, 'rgba(200, 200, 200, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, y - 25, w, 50)

    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 1.5
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  private drawTiles(ctx: CanvasRenderingContext2D, hitZoneY: number) {
    const laneW = this.canvasWidth / 4
    const tileW = laneW * 0.86
    const tileH = 48
    const pad = (laneW - tileW) / 2

    for (const tile of this.tiles) {
      const x = tile.lane * laneW + pad
      const vy = tile.y
      if (vy < -tileH - 20 || vy > this.canvasHeight + 20) continue

      if (tile.tapped || tile.missed) {
        if (tile.flashTimer > 0) {
          this.drawFlash(ctx, x, vy, tileW, tileH, tile)
        }
        continue
      }

      ctx.fillStyle = '#1a1a1a'
      this.roundRect(ctx, x, vy - tileH, tileW, tileH, 5)
      ctx.fill()
    }
  }

  private drawFlash(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, tile: Tile,
  ) {
    let color = '#4CAF50'
    if (tile.judgment === 'good') color = '#2196F3'
    else if (tile.judgment === 'bad') color = '#FF9800'
    else if (tile.judgment === 'miss') color = '#f44336'

    const alpha = Math.max(0, tile.flashTimer / 0.3)
    ctx.globalAlpha = alpha * 0.7
    ctx.fillStyle = color
    this.roundRect(ctx, x, y - h, w, h, 5)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  private drawHUD(ctx: CanvasRenderingContext2D, w: number) {
    if (this.currentSong) {
      ctx.fillStyle = '#888'
      ctx.font = '12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(this.currentSong.title, w / 2, 18)
    }

    ctx.fillStyle = '#333'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${this.score}`, 16, 36)

    if (this.combo > 1) {
      ctx.fillStyle = '#666'
      ctx.font = '14px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${this.combo}x combo`, w - 16, 34)
    }

    if (this.lastJudgment) {
      const judgmentColors: Record<string, string> = {
        perfect: '#4CAF50',
        good: '#2196F3',
        bad: '#FF9800',
        miss: '#f44336',
      }
      ctx.fillStyle = judgmentColors[this.lastJudgment] || '#999'
      ctx.font = 'bold 14px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(this.lastJudgment.toUpperCase(), w / 2, 36)
    }
  }

  private drawCountdown(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(this.animTime * 6) * 0.15 + 0.65

    ctx.fillStyle = '#0d0d1a'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    const cx = this.canvasWidth / 2
    const cy = this.canvasHeight / 2

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (this.countdownStep > 0) {
      ctx.globalAlpha = pulse
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 72px system-ui, sans-serif'
      ctx.fillText(String(this.countdownStep), cx, cy - 20)

      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillText('Ready...', cx, cy + 50)
    } else {
      ctx.fillStyle = '#667eea'
      ctx.font = 'bold 48px system-ui, sans-serif'
      const fade = Math.max(0, 1 - (this.countdownTimer - this.goTime) / 0.6)
      ctx.globalAlpha = fade * 0.6 + 0.4
      ctx.fillText('Go!', cx, cy - 10)
      ctx.globalAlpha = 1
    }

    if (this.currentSong) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '15px system-ui, sans-serif'
      ctx.fillText(this.currentSong.title, cx, cy + 90)
    }
  }

  private drawGameOver(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(this.animTime * 3) * 0.15 + 0.7
    ctx.fillStyle = `rgba(0, 0, 0, ${pulse * 0.55})`
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    const cx = this.canvasWidth / 2
    const cy = this.canvasHeight / 2

    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = 'bold 36px system-ui, sans-serif'
    ctx.fillText('Game Over', cx, cy * 0.6)

    if (this.currentSong) {
      ctx.font = '16px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(this.currentSong.title, cx, cy * 0.72)
    }

    ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.fillText(`${this.score}`, cx, cy * 0.88)

    ctx.font = '13px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('SCORE', cx, cy * 0.96)

    if (this.maxCombo > 1) {
      ctx.font = '15px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(`Best combo: ${this.maxCombo}`, cx, cy * 1.06)
    }

    ctx.font = '15px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('Tap to continue', cx, cy * 1.22)
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
