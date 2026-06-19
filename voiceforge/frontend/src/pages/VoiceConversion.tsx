import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, Repeat2 } from 'lucide-react'
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
  const sourceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.voices().then(setVoices).catch(() => {})
    api.status().then(s => setFfmpegAvailable(s.ffmpeg_available)).catch(() => {})
  }, [])

  async function convert() {
    if (!sourceFile) { toast.error('Choose a source audio file'); return }
    if (!targetVoiceId) { toast.error('Select a target voice'); return }

    setConverting(true)
    setResultUrl(null)
    try {
      const { job_id } = await api.vc(sourceFile, targetVoiceId)
      const job = await pollJob(job_id, () => {})
      if (job.result_url) {
        setResultUrl(job.result_url)
        toast.success('Voice conversion complete!')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-forge-text mb-1">Voice Conversion</h1>
      <p className="text-forge-muted text-sm mb-6">
        Convert the voice in a source audio clip to match a saved target voice.
        Language-agnostic — works on any speech audio.
      </p>

      {/* Source audio */}
      <div className="card mb-4">
        <label className="label">Source audio</label>
        <label className="btn-secondary text-sm cursor-pointer flex items-center gap-2 w-fit">
          <Upload className="w-4 h-4" />
          {sourceFile ? sourceFile.name : 'Choose source audio…'}
          <input
            ref={sourceInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.m4a"
            className="hidden"
            onChange={e => setSourceFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className="text-xs text-forge-muted mt-2">WAV, MP3, FLAC, OGG · the voice in this clip will be replaced</p>
      </div>

      {/* Target voice */}
      <div className="card mb-6">
        <label className="label">Target voice</label>
        {voices.length === 0 ? (
          <p className="text-sm text-forge-muted">No saved voices — add one on the Voices page first.</p>
        ) : (
          <select
            value={targetVoiceId}
            onChange={e => setTargetVoiceId(e.target.value)}
            className="input"
          >
            <option value="">Select a saved voice…</option>
            {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      <button
        onClick={convert}
        disabled={converting || !sourceFile || !targetVoiceId}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
      >
        {converting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Converting…</>
        ) : (
          <><Repeat2 className="w-5 h-5" /> Convert Voice</>
        )}
      </button>

      {resultUrl && (
        <AudioPlayer src={resultUrl} ffmpegAvailable={ffmpegAvailable} />
      )}
    </div>
  )
}
