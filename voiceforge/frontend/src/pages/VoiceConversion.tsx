import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, Repeat2, FileAudio } from 'lucide-react'
import { api, pollJob } from '../api'
import type { Voice } from '../types'
import { AudioPlayer } from '../components/AudioPlayer'
import { useToast } from '../components/Toast'

export function VoiceConversion() {
  const toast = useToast()
  const [voices, setVoices] = useState<Voice[]>([])
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [targetVoiceId, setTargetVoiceId] = useState('')
  const [converting, setConverting] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const sourceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.voices().then(setVoices).catch(() => {})
    api.status().then(s => setFfmpegAvailable(s.ffmpeg_available)).catch(() => {})
  }, [])

  async function convert() {
    if (!sourceFile) { toast.error('Choose a source audio file'); return }
    if (!targetVoiceId) { toast.error('Select a target voice'); return }
    setConverting(true); setResultUrl(null)
    try {
      const { job_id } = await api.vc(sourceFile, targetVoiceId)
      const job = await pollJob(job_id, () => {})
      if (job.result_url) { setResultUrl(job.result_url); toast.success('Voice conversion complete!') }
    } catch (err: any) {
      toast.error(err.message ?? 'Conversion failed')
    } finally { setConverting(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setSourceFile(file)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Voice Conversion</h1>
        <p className="page-subtitle">Transfer a saved voice onto any speech audio — language agnostic</p>
      </div>

      {/* Source audio drop zone */}
      <div className="card p-4 mb-4">
        <label className="label">Source audio</label>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => sourceInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mt-2
            ${dragOver
              ? 'border-vf-accent bg-vf-accent-dim'
              : sourceFile
                ? 'border-vf-accent/40 bg-vf-accent-dim/50'
                : 'border-vf-border hover:border-vf-accent/50 hover:bg-vf-surface/50'
            }`}
        >
          <input ref={sourceInputRef} type="file" accept=".wav,.mp3,.flac,.ogg,.m4a" className="hidden"
            onChange={e => { setSourceFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
          <div className="flex items-center justify-center gap-3">
            <FileAudio className={`w-5 h-5 shrink-0 ${sourceFile ? 'text-vf-glow' : 'text-vf-muted'}`} />
            <div className="text-left">
              {sourceFile ? (
                <>
                  <p className="text-sm font-medium text-vf-text">{sourceFile.name}</p>
                  <p className="text-xs text-vf-muted mt-0.5">Click to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-vf-text-dim">Drop audio here or click to browse</p>
                  <p className="text-xs text-vf-muted mt-0.5">WAV · MP3 · FLAC · OGG · M4A</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Target voice */}
      <div className="card p-4 mb-6">
        <label className="label">Target voice</label>
        {voices.length === 0 ? (
          <div className="mt-2 p-4 rounded-xl bg-vf-surface border border-vf-border text-center">
            <p className="text-sm text-vf-muted">No saved voices — add one on the</p>
            <a href="/voices" className="text-sm text-vf-accent hover:text-vf-glow transition-colors">Voices page</a>
          </div>
        ) : (
          <select value={targetVoiceId} onChange={e => setTargetVoiceId(e.target.value)} className="input mt-2">
            <option value="">Select a saved voice…</option>
            {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      <button
        onClick={convert}
        disabled={converting || !sourceFile || !targetVoiceId}
        className="btn-primary w-full py-3.5 text-base"
      >
        {converting
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Converting…</>
          : <><Repeat2 className="w-5 h-5" /> Convert Voice</>}
      </button>

      {resultUrl && <AudioPlayer src={resultUrl} ffmpegAvailable={ffmpegAvailable} />}
    </div>
  )
}
