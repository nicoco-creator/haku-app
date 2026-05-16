// ── Preset metadata ───────────────────────────────────────────────────────────

export interface BGMPreset {
  id:          string
  name:        string
  emoji:       string
  description: string
}

export const BGM_PRESETS: readonly BGMPreset[] = [
  { id: 'rain',       name: '雨音',       emoji: '🌧️', description: 'やさしい雨粒の音' },
  { id: 'waves',      name: '波音',       emoji: '🌊', description: '繰り返す波のうねり' },
  { id: 'space',      name: '宇宙の海',   emoji: '🪐', description: '深宇宙のドローン音' },
  { id: 'lullaby',    name: '子守唄',     emoji: '🎹', description: 'ゆっくりとした旋律' },
  { id: 'whitenoise', name: 'ホワイトノイズ', emoji: '📻', description: '集中のための白色雑音' },
]

// ── Noise buffer ──────────────────────────────────────────────────────────────

function makeNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d   = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// ── Generator interface ───────────────────────────────────────────────────────

interface Generator {
  start(ctx: AudioContext, out: GainNode): void
  stop(): void
}

// ── Rain ──────────────────────────────────────────────────────────────────────

function rainGen(): Generator {
  let nodes: (AudioBufferSourceNode | AudioNode)[] = []
  return {
    start(ctx, out) {
      const src  = ctx.createBufferSource()
      src.buffer = makeNoiseBuffer(ctx, 4)
      src.loop   = true

      const hi = ctx.createBiquadFilter()
      hi.type  = 'bandpass'; hi.frequency.value = 2000; hi.Q.value = 0.6

      const lo = ctx.createBiquadFilter()
      lo.type  = 'bandpass'; lo.frequency.value = 400; lo.Q.value = 0.8

      const g = ctx.createGain(); g.gain.value = 0.35
      src.connect(hi); src.connect(lo)
      hi.connect(g);  lo.connect(g); g.connect(out)
      src.start()
      nodes = [src, hi, lo, g]
    },
    stop() {
      nodes.forEach(n => { try { (n as AudioBufferSourceNode).stop() } catch { /* already stopped */ } })
      nodes.forEach(n => n.disconnect())
      nodes = []
    },
  }
}

// ── Waves ─────────────────────────────────────────────────────────────────────

function wavesGen(): Generator {
  let nodes: AudioNode[] = []
  return {
    start(ctx, out) {
      const src  = ctx.createBufferSource()
      src.buffer = makeNoiseBuffer(ctx, 4)
      src.loop   = true

      const filt = ctx.createBiquadFilter()
      filt.type  = 'lowpass'; filt.frequency.value = 800

      const lfo     = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.1
      const lfoG    = ctx.createGain();       lfoG.gain.value = 500
      lfo.connect(lfoG); lfoG.connect(filt.frequency)

      const g = ctx.createGain(); g.gain.value = 0.4
      const volLfo  = ctx.createOscillator(); volLfo.frequency.value = 0.08
      const volLfoG = ctx.createGain();       volLfoG.gain.value = 0.18
      volLfo.connect(volLfoG); volLfoG.connect(g.gain)

      src.connect(filt); filt.connect(g); g.connect(out)
      src.start(); lfo.start(); volLfo.start()
      nodes = [src, filt, lfo, lfoG, g, volLfo, volLfoG]
    },
    stop() {
      nodes.forEach(n => {
        try { (n as OscillatorNode | AudioBufferSourceNode).stop() } catch { /* ok */ }
        n.disconnect()
      })
      nodes = []
    },
  }
}

// ── Space drone ───────────────────────────────────────────────────────────────

function spaceGen(): Generator {
  let nodes: AudioNode[] = []
  return {
    start(ctx, out) {
      ;[40, 60, 80].forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.04 + i * 0.015
        const lfoG = ctx.createGain();      lfoG.gain.value = 8
        lfo.connect(lfoG); lfoG.connect(osc.frequency)
        const g = ctx.createGain(); g.gain.value = 0.14
        osc.connect(g); g.connect(out)
        osc.start(); lfo.start()
        nodes.push(osc, lfo, lfoG, g)
      })
    },
    stop() {
      nodes.forEach(n => {
        try { (n as OscillatorNode).stop() } catch { /* ok */ }
        n.disconnect()
      })
      nodes = []
    },
  }
}

// ── Lullaby (pentatonic note scheduler) ───────────────────────────────────────

function lullabyGen(): Generator {
  let tid: ReturnType<typeof setInterval> | null = null
  let ctx: AudioContext | null = null
  let out: GainNode | null = null
  let next = 0
  let ni   = 0

  const NOTES  = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
  const AHEAD  = 0.35

  function schedule() {
    if (!ctx || !out) return
    while (next < ctx.currentTime + AHEAD) {
      const osc = ctx.createOscillator(); osc.type = 'triangle'
      osc.frequency.value = NOTES[ni % NOTES.length]

      const env = ctx.createGain()
      env.gain.setValueAtTime(0, next)
      env.gain.linearRampToValueAtTime(0.13, next + 0.06)
      env.gain.exponentialRampToValueAtTime(0.001, next + 1.4)

      osc.connect(env); env.connect(out)
      osc.start(next); osc.stop(next + 1.4)

      const step = Math.floor(Math.random() * 3) - 1
      ni = Math.max(0, Math.min(NOTES.length - 1, ni + step))
      next += 0.55 + Math.random() * 0.7
    }
  }

  return {
    start(c, o) {
      ctx = c; out = o; next = c.currentTime + 0.05
      schedule()
      tid = setInterval(schedule, 300)
    },
    stop() {
      if (tid) clearInterval(tid)
      tid = null; ctx = null; out = null
    },
  }
}

// ── White noise ───────────────────────────────────────────────────────────────

function whitenoiseGen(): Generator {
  let nodes: AudioNode[] = []
  return {
    start(ctx, out) {
      const src = ctx.createBufferSource()
      src.buffer = makeNoiseBuffer(ctx, 2); src.loop = true
      const g = ctx.createGain(); g.gain.value = 0.4
      src.connect(g); g.connect(out); src.start()
      nodes = [src, g]
    },
    stop() {
      nodes.forEach(n => {
        try { (n as AudioBufferSourceNode).stop() } catch { /* ok */ }
        n.disconnect()
      })
      nodes = []
    },
  }
}

const GENERATORS: Record<string, () => Generator> = {
  rain:       rainGen,
  waves:      wavesGen,
  space:      spaceGen,
  lullaby:    lullabyGen,
  whitenoise: whitenoiseGen,
}

// ── BGMEngine singleton ───────────────────────────────────────────────────────

class BGMEngine {
  private actx:        AudioContext | null = null
  private masterGain:  GainNode    | null = null
  private activeGen:   Generator   | null = null
  private importedEl:  HTMLAudioElement | null = null
  private activeType:  'generated' | 'imported' | null = null
  private _volume      = 0.6

  private getCtx(): { ctx: AudioContext; gain: GainNode } {
    if (!this.actx) {
      this.actx       = new AudioContext()
      this.masterGain = this.actx.createGain()
      this.masterGain.gain.value = this._volume
      this.masterGain.connect(this.actx.destination)
    }
    if (this.actx.state === 'suspended') void this.actx.resume()
    return { ctx: this.actx, gain: this.masterGain! }
  }

  playGenerated(id: string): void {
    this.stopCurrent()
    const factory = GENERATORS[id]
    if (!factory) return
    const { ctx, gain } = this.getCtx()
    const gen = factory()
    gen.start(ctx, gain)
    this.activeGen  = gen
    this.activeType = 'generated'
  }

  async playImported(blob: Blob): Promise<void> {
    this.stopCurrent()
    const url          = URL.createObjectURL(blob)
    this.importedEl    = new Audio(url)
    this.importedEl.loop   = true
    this.importedEl.volume = this._volume
    await this.importedEl.play()
    this.activeType = 'imported'
  }

  pause(): void {
    if (this.activeType === 'generated' && this.actx) {
      void this.actx.suspend()
    } else if (this.activeType === 'imported' && this.importedEl) {
      this.importedEl.pause()
    }
  }

  async resume(): Promise<void> {
    if (this.activeType === 'generated' && this.actx) {
      await this.actx.resume()
    } else if (this.activeType === 'imported' && this.importedEl) {
      await this.importedEl.play()
    }
  }

  setVolume(v: number): void {
    this._volume = v
    if (this.masterGain) this.masterGain.gain.value = v
    if (this.importedEl) this.importedEl.volume = v
  }

  private stopCurrent(): void {
    this.activeGen?.stop()
    this.activeGen = null
    if (this.importedEl) {
      this.importedEl.pause()
      this.importedEl.src = ''
      this.importedEl = null
    }
    this.activeType = null
  }

  stopAll(): void {
    this.stopCurrent()
    if (this.actx) void this.actx.suspend()
  }
}

export const bgmEngine = new BGMEngine()
