import { useEffect, useRef, useState } from 'react'
import { CloudUpload, Mic2, Play, Pause, Pencil, Check, X, Trash2 } from 'lucide-react'
import { api } from '../api'
import type { Voice } from '../types'
import { useToast } from '../components/Toast'

function VoiceCard({ voice, onDeleted, onRenamed }: {
  voice: Voice
  onDeleted: (id: string) => void
  onRenamed: (id: string, name: string) => void
}) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(voice.name)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function togglePlay() {
    if (!audioRef.current) {
      audioRef.current = new Audio(api.voiceAudioUrl(voice.id))
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
  }

  async function saveRename() {
    try {
      await api.renameVoice(voice.id, name.trim() || voice.name)
      onRenamed(voice.id, name.trim() || voice.name)
      setEditing(false)
      toast.success('Voice renamed')
    } catch (err: any) { toast.error(err.message) }
  }

  async function del() {
    if (!confirm(`Delete voice "${voice.name}"?`)) return
    try {
      await api.deleteVoice(voice.id)
      onDeleted(voice.id)
      toast.success('Voice deleted')
    } catch (err: any) { toast.error(err.message) }
  }

  const initials = voice.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="card p-4 flex items-center gap-4 hover:border-vf-border-hi transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 shrink-0 rounded-xl bg-vf-accent-dim border border-vf-accent/30 flex items-center justify-center text-sm font-bold text-vf-glow">
        {initials}
      </div>

      {/* Play button */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-vf-surface border border-vf-border hover:border-vf-accent/50 hover:bg-vf-accent-dim transition-all"
      >
        {playing
          ? <Pause className="w-3.5 h-3.5 text-vf-accent" />
          : <Play className="w-4 h-4 text-vf-accent ml-0.5" />}
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { setName(voice.name); setEditing(false) } }}
              className="input py-1 text-sm flex-1"
              autoFocus
            />
            <button onClick={saveRename} className="text-emerald-400 hover:text-emerald-300 p-1">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setName(voice.name); setEditing(false) }} className="text-vf-muted hover:text-vf-text p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="font-medium text-vf-text truncate">{voice.name}</p>
            <p className="text-xs text-vf-muted mt-0.5">
              Added {new Date(voice.created_at * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="btn-ghost p-2" title="Rename">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={del} className="btn-danger p-2" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function Voices() {
  const toast = useToast()
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.voices().then(setVoices).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function uploadFile(file: File) {
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    setUploading(true)
    try {
      const voice = await api.uploadVoice(file, name)
      setVoices(prev => [voice, ...prev])
      toast.success(`Voice "${name}" added`)
    } catch (err: any) { toast.error(err.message) }
    finally { setUploading(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Voice Library</h1>
        <p className="page-subtitle">Upload 5–20s of clean speech to clone any voice</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-8
          ${dragOver
            ? 'border-vf-accent bg-vf-accent-dim'
            : 'border-vf-border hover:border-vf-accent/50 hover:bg-vf-surface/50'
          }`}
      >
        <input ref={fileInputRef} type="file" accept=".wav,.mp3,.flac,.ogg,.m4a" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-vf-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-vf-text-dim font-medium">Processing audio…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragOver ? 'bg-gradient-accent shadow-glow-sm' : 'bg-vf-surface border border-vf-border'}`}>
              <CloudUpload className={`w-7 h-7 ${dragOver ? 'text-white' : 'text-vf-muted'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-vf-text">Drop audio here or click to browse</p>
              <p className="text-xs text-vf-muted mt-1">WAV · MP3 · FLAC · OGG · M4A · 5–20s recommended</p>
            </div>
          </div>
        )}
      </div>

      {/* Voice list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-[72px] rounded-2xl" />)}
        </div>
      ) : voices.length === 0 ? (
        <div className="text-center py-16">
          <Mic2 className="w-12 h-12 mx-auto mb-4 text-vf-muted opacity-30" />
          <p className="text-sm text-vf-muted">No voices yet — upload an audio clip above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-vf-muted mb-3">{voices.length} voice{voices.length !== 1 ? 's' : ''}</p>
          {voices.map(v => (
            <VoiceCard
              key={v.id}
              voice={v}
              onDeleted={id => setVoices(p => p.filter(x => x.id !== id))}
              onRenamed={(id, name) => setVoices(p => p.map(x => x.id === id ? { ...x, name } : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
