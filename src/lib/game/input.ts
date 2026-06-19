export type InputCallback = (lane: number) => void

interface InputState {
  active: boolean
  startY: number
  startX: number
}

export class InputHandler {
  private canvas: HTMLCanvasElement
  private callback: InputCallback
  private state: InputState = { active: false, startY: 0, startX: 0 }
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void

  constructor(canvas: HTMLCanvasElement, callback: InputCallback) {
    this.canvas = canvas
    this.callback = callback

    this.boundTouchStart = this.onTouchStart.bind(this)
    this.boundTouchEnd = this.onTouchEnd.bind(this)
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)

    canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false })
    canvas.addEventListener('mousedown', this.boundMouseDown)
    canvas.addEventListener('mouseup', this.boundMouseUp)

    canvas.style.touchAction = 'none'
  }

  destroy() {
    this.canvas.removeEventListener('touchstart', this.boundTouchStart)
    this.canvas.removeEventListener('touchend', this.boundTouchEnd)
    this.canvas.removeEventListener('mousedown', this.boundMouseDown)
    this.canvas.removeEventListener('mouseup', this.boundMouseUp)
  }

  private getLane(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const laneW = rect.width / 4
    const lane = Math.floor(x / laneW)
    return Math.max(0, Math.min(3, lane))
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault()
    const t = e.touches[0]
    this.state.active = true
    this.state.startX = t.clientX
    this.state.startY = t.clientY
  }

  private onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    if (!this.state.active) return
    this.state.active = false
    const t = e.changedTouches[0]
    const dy = Math.abs(t.clientY - this.state.startY)
    const dx = Math.abs(t.clientX - this.state.startX)
    if (dx < 30 && dy < 30) {
      this.callback(this.getLane(t.clientX))
    }
  }

  private onMouseDown(e: MouseEvent) {
    this.state.active = true
    this.state.startX = e.clientX
    this.state.startY = e.clientY
  }

  private onMouseUp(e: MouseEvent) {
    if (!this.state.active) return
    this.state.active = false
    const dy = Math.abs(e.clientY - this.state.startY)
    const dx = Math.abs(e.clientX - this.state.startX)
    if (dx < 10 && dy < 10) {
      this.callback(this.getLane(e.clientX))
    }
  }
}
