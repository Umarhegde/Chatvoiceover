import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Zap, Cpu, ChevronDown, ChevronUp, Upload, Mic2,
  AlertTriangle, Info, Loader2,
} from 'lucide-react'
import { api, pollJob } from '../api'
import type { Engine, StatusResponse, Voice } from '../types'
import { AudioPlayer } from '../components/AudioPlayer'
import { useToast } from '../components/Toast'

const PARALINGUISTIC_TAGS = [
  '[laugh]', '[chuckle]', '[sigh]', '[cough]', '[gasp]',
  '[clear throat]', '[groan]', '[sniff]', '[shush]',
]

const DEFAULT_PARAMS = {
  temperature: 0.8,
  repetition_penalty: 1.2,
  top_p: 1.0,
  top_k: 1000,
  exaggeration: 0.5,
  cfg_weight: 0.5,
  min_p: 0.05,
}

type VoiceSource = 'default' | 'saved' | 'upload'

function Slider({
  label, tooltip, value, onChange, min, max, step,
}: {
  label: string; tooltip: string; value: number
  onChange: (v: number) => void; min: number; max: number; step: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label flex items-center gap-1">
          {label}
          <span title={tooltip} className="cursor-help">
            <Info className="w-3 h-3 text-forge-muted" />
          </span>
        </label>
        <span className="text-xs text-forge-muted tabular-nums">{value.toFixed(step < 0.01 ? 3 : 2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-forge-accent h-1.5 rounded-full bg-forge-border appearance-none cursor-pointer"
      />
    </div>
  )
}

export function Generate() {
  const toast = useToast()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])

  // Text
  const [text, setText] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Engine
  const [engine, setEngine] = useState<Engine>('turbo')

  // Voice source
  const [voiceSource, setVoiceSource] = useState<VoiceSource>('default')
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [uploadedRefFile, setUploadedRefFile] = useState<File | null>(null)
  const refUploadRef = useRef<HTMLInputElement>(null)

  // Params
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [seed, setSeed] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Job / result
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultFile, setResultFile] = useState<string | null>(null)

  useEffect(() => {
    api.status().then(setStatus).catch(() => {})
    api.voices().then(setVoices).catch(() => {})
  }, [])

  function insertTag(tag: string) {
    const el = textRef.current
    if (!el) { setText(t => t + ' ' + tag); return }
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = text.slice(0, start)
    const after = text.slice(end)
    const pad = before.length > 0 && !before.endsWith(' ') ? ' ' : ''
    setText(before + pad + tag + ' ' + after)
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + pad.length + tag.length + 1
      el.focus()
    }, 0)
  }

  async function handleUploadTxt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await api.uploadText(file)
      setText(res.text)
      if (res.truncated) toast.error('File truncated to 8000 chars')
    } catch (err: any) {
      toast.error(err.message)
    }
    e.target.value = ''
  }

  async function generate() {
    if (!text.trim()) { toast.error('Enter some text first'); return }
    setGenerating(true)
    setResultUrl(null)
    setResultFile(null)
    setProgress(0)
    setTotal(0)

    // Build voice_id if using saved voice; ref file handled via upload-then-use not supported
    // (chatterbox takes a file path, so we use voice_id which the backend resolves to a path)
    const params_payload = {
      engine,
      text,
      ...(voiceSource === 'saved' && selectedVoiceId ? { voice_id: selectedVoiceId } : {}),
      ...params,
      ...(seed ? { seed: parseInt(seed) } : {}),
    }

    try {
      let job_id: string

      let tempVoiceId: string | null = null
      if (voiceSource === 'upload' && uploadedRefFile) {
        const v = await api.uploadVoice(uploadedRefFile, `__tmp_ref_${Date.now()}__`)
        tempVoiceId = v.id
        job_id = (await api.tts({ ...params_payload as any, voice_id: v.id })).job_id
      } else {
        job_id = (await api.tts(params_payload as any)).job_id
      }

      const job = await pollJob(job_id, (p, t) => {
        setProgress(p)
        setTotal(t)
      })

      // Clean up one-off reference voice
      if (tempVoiceId) {
        api.deleteVoice(tempVoiceId).catch(() => {})
      }

      if (job.result_url) {
        setResultUrl(job.result_url)
        const fname = job.result_url.split('/').pop() ?? ''
        setResultFile(fname)
        toast.success('Audio generated!')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length
  const isTurbo = engine === 'turbo'

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-forge-text mb-1">Generate Speech</h1>
      <p className="text-forge-muted text-sm mb-6">English text-to-speech with optional voice cloning</p>

      {/* First-run banner */}
      {status?.slow_cpu_warning && (
        <div className="flex gap-3 p-4 bg-amber-950/40 border border-amber-700/40 rounded-xl mb-6 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-amber-200">
            <p className="font-semibold mb-0.5">First time? A few things to know:</p>
            <p className="text-amber-300/80">
              The first generation downloads ~2–3 GB of model weights from HuggingFace (cached locally after that).
              Running on <strong>CPU only</strong> — generation takes
              <strong> tens of seconds to minutes</strong> per sentence. Please be patient!
            </p>
          </div>
        </div>
      )}

      {/* Engine selector */}
      <div className="card mb-4">
        <p className="label mb-2">Engine</p>
        <div className="flex gap-3">
          {(['turbo', 'standard'] as Engine[]).map(e => (
            <button
              key={e}
              onClick={() => setEngine(e)}
              className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium
                ${engine === e
                  ? 'border-forge-accent bg-forge-accent/10 text-forge-accent-hover'
                  : 'border-forge-border text-forge-muted hover:border-forge-accent/40 hover:text-forge-text'
                }`}
            >
              {e === 'turbo' ? <Zap className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
              <div className="text-left">
                <p className="font-semibold capitalize">{e}</p>
                <p className="text-xs opacity-70">
                  {e === 'turbo' ? 'Faster · 350M params' : 'Higher quality · 500M params · slower on CPU'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text editor */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="label">Text</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-forge-muted">{wordCount} words · {charCount}/8000 chars</span>
            <label className="btn-secondary text-xs cursor-pointer flex items-center gap-1 px-2.5 py-1.5">
              <Upload className="w-3.5 h-3.5" />
              Upload .txt
              <input type="file" accept=".txt" className="hidden" onChange={handleUploadTxt} />
            </label>
          </div>
        </div>

        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter English text to synthesize… You can use paralinguistic tags like [laugh] with the Turbo engine."
          rows={6}
          maxLength={8000}
          className="input resize-none font-mono text-sm"
        />

        {/* Paralinguistic tag buttons (turbo) */}
        {isTurbo && (
          <div className="flex flex-wrap gap-2 mt-2">
            {PARALINGUISTIC_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => insertTag(tag)}
                className="text-xs px-2.5 py-1 bg-forge-surface border border-forge-border rounded-md text-forge-text-dim hover:border-forge-accent/50 hover:text-forge-text transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice source */}
      <div className="card mb-4">
        <p className="label mb-2">Voice</p>
        <div className="flex gap-2 mb-3">
          {(['default', 'saved', 'upload'] as VoiceSource[]).map(s => (
            <button
              key={s}
              onClick={() => setVoiceSource(s)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                ${voiceSource === s
                  ? 'border-forge-accent bg-forge-accent/10 text-forge-accent-hover'
                  : 'border-forge-border text-forge-muted hover:text-forge-text'
                }`}
            >
              {s === 'default' ? 'Default voice' : s === 'saved' ? 'Saved voice' : 'Upload reference'}
            </button>
          ))}
        </div>

        {voiceSource === 'saved' && (
          voices.length === 0 ? (
            <p className="text-sm text-forge-muted">No saved voices yet — go to the Voices page to add one.</p>
          ) : (
            <select
              value={selectedVoiceId}
              onChange={e => setSelectedVoiceId(e.target.value)}
              className="input"
            >
              <option value="">Select a voice…</option>
              {voices.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )
        )}

        {voiceSource === 'upload' && (
          <div>
            <p className="text-xs text-forge-muted mb-2">Upload 5–20s of clean speech in the target voice (WAV/MP3).</p>
            <label className="btn-secondary text-sm cursor-pointer flex items-center gap-2 w-fit">
              <Mic2 className="w-4 h-4" />
              {uploadedRefFile ? uploadedRefFile.name : 'Choose audio file…'}
              <input
                ref={refUploadRef}
                type="file"
                accept=".wav,.mp3,.flac,.ogg"
                className="hidden"
                onChange={e => setUploadedRefFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}
      </div>

      {/* Advanced controls */}
      <div className="card mb-6">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-forge-text-dim hover:text-forge-text w-full"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced controls
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Slider label="Temperature" tooltip="Randomness of token sampling (higher = more varied)"
              value={params.temperature} onChange={v => setParams(p => ({ ...p, temperature: v }))}
              min={0.05} max={5} step={0.05} />
            <Slider label="Repetition penalty" tooltip="Penalise repeated tokens (1.0 = off)"
              value={params.repetition_penalty} onChange={v => setParams(p => ({ ...p, repetition_penalty: v }))}
              min={1.0} max={2.0} step={0.05} />
            <Slider label="Top P" tooltip="Nucleus sampling threshold (1.0 = off)"
              value={params.top_p} onChange={v => setParams(p => ({ ...p, top_p: v }))}
              min={0} max={1} step={0.01} />

            {!isTurbo && (
              <>
                <Slider label="Exaggeration" tooltip="Emotional exaggeration (0.5 = neutral)"
                  value={params.exaggeration} onChange={v => setParams(p => ({ ...p, exaggeration: v }))}
                  min={0.25} max={2.0} step={0.05} />
                <Slider label="CFG weight / Pace" tooltip="Classifier-free guidance strength; lower = slower/more deliberate"
                  value={params.cfg_weight} onChange={v => setParams(p => ({ ...p, cfg_weight: v }))}
                  min={0} max={1} step={0.05} />
                <Slider label="Min P" tooltip="Min-P sampler (0 = off; try 0.02–0.1 for stability)"
                  value={params.min_p} onChange={v => setParams(p => ({ ...p, min_p: v }))}
                  min={0} max={1} step={0.01} />
              </>
            )}

            <div>
              <label className="label">Seed (optional)</label>
              <input
                type="number" min={0} placeholder="Random"
                value={seed} onChange={e => setSeed(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating || !text.trim()}
        className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating… {total > 0 ? `(${progress}/${total} chunks)` : ''}
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Generate
          </>
        )}
      </button>

      {/* Progress bar */}
      {generating && total > 1 && (
        <div className="mt-3 bg-forge-surface rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-forge-accent transition-all duration-300 rounded-full"
            style={{ width: `${total ? (progress / total) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Result */}
      {resultUrl && (
        <AudioPlayer
          src={resultUrl}
          ffmpegAvailable={status?.ffmpeg_available ?? false}
        />
      )}
    </div>
  )
}
