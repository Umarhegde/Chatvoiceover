import { useCallback, useEffect, useRef, useState } from 'react'
import { Zap, Cpu, ChevronDown, ChevronUp, Upload, Mic2, AlertTriangle, Info, Loader2, RotateCcw } from 'lucide-react'
import { api, pollJob } from '../api'
import type { Engine, StatusResponse, Voice } from '../types'
import { AudioPlayer } from '../components/AudioPlayer'
import { useToast } from '../components/Toast'

const TAGS = ['[laugh]', '[chuckle]', '[sigh]', '[cough]', '[gasp]', '[clear throat]', '[groan]', '[sniff]', '[shush]']

const DEFAULTS = {
  temperature: 0.8,
  repetition_penalty: 1.2,
  top_p: 1.0,
  top_k: 1000,
  exaggeration: 0.5,
  cfg_weight: 0.5,
  min_p: 0.05,
}

function loadSaved<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

type VoiceSource = 'default' | 'saved' | 'upload'

function Slider({ label, tooltip, value, onChange, min, max, step }: {
  label: string; tooltip: string; value: number
  onChange: (v: number) => void; min: number; max: number; step: number
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label flex items-center gap-1.5">
          {label}
          <span title={tooltip} className="cursor-help opacity-60 hover:opacity-100 transition-opacity">
            <Info className="w-3 h-3 text-vf-muted" />
          </span>
        </label>
        <span className="text-xs text-vf-text-dim tabular-nums font-mono bg-vf-surface px-2 py-0.5 rounded-md">
          {value.toFixed(step < 0.01 ? 3 : 2)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

function estTime(text: string, engine: Engine): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return ''
  // ~14x real-time on Ryzen 5 (turbo). Standard ~20% slower.
  const audioSec = words * 0.4
  const wallSec = engine === 'turbo' ? audioSec * 14 : audioSec * 17
  if (wallSec < 60) return `~${Math.round(wallSec)}s`
  return `~${Math.round(wallSec / 60)}m`
}

export function Generate() {
  const toast = useToast()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])

  const [text, setText] = useState(() => loadSaved('vf:text', ''))
  const textRef = useRef<HTMLTextAreaElement>(null)

  const [engine, setEngine] = useState<Engine>(() => loadSaved('vf:engine', 'turbo'))
  const [voiceSource, setVoiceSource] = useState<VoiceSource>('default')
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [uploadedRefFile, setUploadedRefFile] = useState<File | null>(null)
  const refUploadRef = useRef<HTMLInputElement>(null)

  const [params, setParams] = useState(() => loadSaved('vf:params', DEFAULTS))
  const [seed, setSeed] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  useEffect(() => {
    api.status().then(setStatus).catch(() => {})
    api.voices().then(setVoices).catch(() => {})
  }, [])

  // Persist text + engine + params
  useEffect(() => { localStorage.setItem('vf:text', JSON.stringify(text)) }, [text])
  useEffect(() => { localStorage.setItem('vf:engine', JSON.stringify(engine)) }, [engine])
  useEffect(() => { localStorage.setItem('vf:params', JSON.stringify(params)) }, [params])

  // Ctrl+Enter to generate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !generating && text.trim()) generate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [generating, text, engine, voiceSource, selectedVoiceId, uploadedRefFile, params, seed])

  function insertTag(tag: string) {
    const el = textRef.current
    if (!el) { setText(t => t + ' ' + tag); return }
    const start = el.selectionStart
    const pad = text.slice(0, start).length > 0 && !text.slice(0, start).endsWith(' ') ? ' ' : ''
    const next = text.slice(0, start) + pad + tag + ' ' + text.slice(el.selectionEnd)
    setText(next)
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + pad.length + tag.length + 1; el.focus() }, 0)
  }

  async function handleUploadTxt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await api.uploadText(file)
      setText(res.text)
      if (res.truncated) toast.info('File truncated to 8000 characters')
    } catch (err: any) { toast.error(err.message) }
    e.target.value = ''
  }

  async function generate() {
    if (!text.trim()) { toast.error('Enter some text first'); return }
    setGenerating(true); setResultUrl(null); setProgress(0); setTotal(0)

    const payload: any = {
      engine, text, ...params,
      ...(voiceSource === 'saved' && selectedVoiceId ? { voice_id: selectedVoiceId } : {}),
      ...(seed ? { seed: parseInt(seed) } : {}),
    }

    try {
      let job_id: string
      let tempVoiceId: string | null = null

      if (voiceSource === 'upload' && uploadedRefFile) {
        const v = await api.uploadVoice(uploadedRefFile, `__tmp_${Date.now()}__`)
        tempVoiceId = v.id
        job_id = (await api.tts({ ...payload, voice_id: v.id })).job_id
      } else {
        job_id = (await api.tts(payload)).job_id
      }

      const job = await pollJob(job_id, (p, t) => { setProgress(p); setTotal(t) })
      if (tempVoiceId) api.deleteVoice(tempVoiceId).catch(() => {})

      if (job.result_url) {
        setResultUrl(job.result_url)
        toast.success('Audio ready!')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const isTurbo = engine === 'turbo'
  const timeEst = estTime(text, engine)
  const progressPct = total > 0 ? (progress / total) * 100 : 0

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Generate Speech</h1>
        <p className="page-subtitle">English text-to-speech with optional voice cloning · <kbd className="text-[10px] bg-vf-card border border-vf-border px-1.5 py-0.5 rounded-md font-mono">Ctrl+Enter</kbd> to generate</p>
      </div>

      {/* First-run warning */}
      {status?.slow_cpu_warning && (
        <div className="flex gap-3 p-4 bg-amber-950/30 border border-amber-600/30 rounded-2xl mb-6 animate-fade-up">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-300 mb-0.5">First generation downloads ~2–3 GB of model weights</p>
            <p className="text-amber-400/80">CPU-only inference takes tens of seconds to minutes per sentence. Model is cached after first download.</p>
          </div>
        </div>
      )}

      {/* Engine selector */}
      <div className="card p-4 mb-4">
        <p className="label">Engine</p>
        <div className="flex gap-3 mt-2">
          {(['turbo', 'standard'] as Engine[]).map(e => (
            <button
              key={e}
              onClick={() => setEngine(e)}
              className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left
                ${engine === e
                  ? 'border-vf-accent bg-vf-accent-dim text-vf-text shadow-accent'
                  : 'border-vf-border text-vf-muted hover:border-vf-border-hi hover:text-vf-text-dim'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${engine === e ? 'bg-gradient-accent shadow-glow-sm' : 'bg-vf-surface'}`}>
                {e === 'turbo' ? <Zap className={`w-4 h-4 ${engine === e ? 'text-white' : 'text-vf-muted'}`} /> : <Cpu className={`w-4 h-4 ${engine === e ? 'text-white' : 'text-vf-muted'}`} />}
              </div>
              <div>
                <p className={`text-sm font-semibold capitalize ${engine === e ? 'text-vf-glow' : ''}`}>{e}</p>
                <p className="text-[11px] opacity-60 mt-0.5">
                  {e === 'turbo' ? 'Faster · supports emotion tags' : 'Richer prosody · slower on CPU'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text editor */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="label">Text</label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-vf-muted tabular-nums">{wordCount} words · {text.length}/8000</span>
            <label className="btn-secondary text-xs cursor-pointer px-2.5 py-1.5">
              <Upload className="w-3.5 h-3.5" />
              .txt
              <input type="file" accept=".txt" className="hidden" onChange={handleUploadTxt} />
            </label>
            {text && (
              <button onClick={() => setText('')} className="btn-ghost text-xs px-2 py-1.5" title="Clear text">
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!generating && text.trim()) generate() } }}
          placeholder="Type or paste English text… Use emotion tags like [laugh] with the Turbo engine."
          rows={6}
          maxLength={8000}
          className="input resize-none font-mono text-sm leading-relaxed"
        />

        {isTurbo && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TAGS.map(tag => (
              <button key={tag} onClick={() => insertTag(tag)}
                className="text-xs px-2 py-0.5 bg-vf-surface border border-vf-border rounded-lg
                           text-vf-muted hover:text-vf-glow hover:border-vf-accent/50 transition-all">
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice source */}
      <div className="card p-4 mb-4">
        <p className="label">Voice</p>
        <div className="flex gap-2 mt-2 mb-3">
          {(['default', 'saved', 'upload'] as VoiceSource[]).map(s => (
            <button
              key={s}
              onClick={() => setVoiceSource(s)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                ${voiceSource === s
                  ? 'border-vf-accent bg-vf-accent-dim text-vf-glow'
                  : 'border-vf-border text-vf-muted hover:border-vf-border-hi hover:text-vf-text-dim'
                }`}
            >
              {s === 'default' ? 'Default' : s === 'saved' ? 'Saved voice' : 'Upload reference'}
            </button>
          ))}
        </div>

        {voiceSource === 'saved' && (
          voices.length === 0
            ? <p className="text-sm text-vf-muted">No saved voices — go to the Voices page to add one.</p>
            : <select value={selectedVoiceId} onChange={e => setSelectedVoiceId(e.target.value)} className="input">
                <option value="">Select a voice…</option>
                {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
        )}

        {voiceSource === 'upload' && (
          <label className="btn-secondary text-sm cursor-pointer flex items-center gap-2 w-fit">
            <Mic2 className="w-4 h-4" />
            {uploadedRefFile ? uploadedRefFile.name : 'Choose audio file (5–20s WAV/MP3)'}
            <input ref={refUploadRef} type="file" accept=".wav,.mp3,.flac,.ogg" className="hidden"
              onChange={e => setUploadedRefFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      {/* Advanced controls */}
      <div className="card p-4 mb-6">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 w-full text-sm font-medium text-vf-text-dim hover:text-vf-text transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced controls
          {showAdvanced && (
            <button
              onClick={e => { e.stopPropagation(); setParams(DEFAULTS) }}
              className="ml-auto text-xs text-vf-muted hover:text-vf-text-dim flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Slider label="Temperature" tooltip="Sampling randomness (higher = more expressive variation)"
              value={params.temperature} onChange={v => setParams(p => ({ ...p, temperature: v }))}
              min={0.05} max={5} step={0.05} />
            <Slider label="Repetition penalty" tooltip="Penalise repeated tokens (1.0 = off)"
              value={params.repetition_penalty} onChange={v => setParams(p => ({ ...p, repetition_penalty: v }))}
              min={1.0} max={2.0} step={0.05} />
            <Slider label="Top P" tooltip="Nucleus sampling cutoff (1.0 = off)"
              value={params.top_p} onChange={v => setParams(p => ({ ...p, top_p: v }))}
              min={0} max={1} step={0.01} />

            {!isTurbo && <>
              <Slider label="Exaggeration" tooltip="Emotional expressiveness (0.5 = neutral)"
                value={params.exaggeration} onChange={v => setParams(p => ({ ...p, exaggeration: v }))}
                min={0.25} max={2.0} step={0.05} />
              <Slider label="CFG / Pace" tooltip="Lower = slower, more deliberate delivery"
                value={params.cfg_weight} onChange={v => setParams(p => ({ ...p, cfg_weight: v }))}
                min={0} max={1} step={0.05} />
              <Slider label="Min P" tooltip="Min-P sampler stability (0 = off)"
                value={params.min_p} onChange={v => setParams(p => ({ ...p, min_p: v }))}
                min={0} max={1} step={0.01} />
            </>}

            <div>
              <label className="label">Seed (optional)</label>
              <input type="number" min={0} placeholder="Random" value={seed}
                onChange={e => setSeed(e.target.value)} className="input" />
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating || !text.trim()}
        className="btn-primary w-full py-3.5 text-base"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating… {total > 0 ? `(chunk ${progress}/${total})` : ''}
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Generate{timeEst ? ` · ${timeEst}` : ''}
          </>
        )}
      </button>

      {/* Progress bar */}
      {generating && total > 1 && (
        <div className="mt-3 progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Result */}
      {resultUrl && (
        <AudioPlayer src={resultUrl} ffmpegAvailable={status?.ffmpeg_available ?? false} />
      )}
    </div>
  )
}
