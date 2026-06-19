import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Play, Trash2, Pencil, Check, X, Mic2, CloudUpload } from 'lucide-react'
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
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  async function saveRename() {
    try {
      await api.renameVoice(voice.id, name)
      onRenamed(voice.id, name)
      setEditing(false)
      toast.success('Voice renamed')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function del() {
    if (!confirm(`Delete voice "${voice.name}"?`)) return
    try {
      await api.deleteVoice(voice.id)
      onDeleted(voice.id)
      toast.success('Voice deleted')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="card flex items-center gap-4">
      <button
        onClick={togglePlay}
        className="w-10 h-10 shrink-0 flex items-center justify-center bg-forge-accent/15 hover:bg-forge-accent/30 rounded-full transition-colors"
      >
        {playing
          ? <span className="w-3 h-3 bg-forge-accent rounded-sm" />
          : <Play className="w-4 h-4 text-forge-accent ml-0.5" />
        }
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input py-1 text-sm flex-1"
              onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
            />
            <button onClick={saveRename} className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
            <button onClick={() => { setName(voice.name); setEditing(false) }} className="text-forge-muted hover:text-forge-text"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="font-medium text-forge-text truncate">{voice.name}</p>
            <button onClick={() => setEditing(true)} className="text-forge-muted hover:text-forge-text-dim opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <p className="text-xs text-forge-muted mt-0.5">
          Added {new Date(voice.created_at * 1000).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-forge-muted hover:text-forge-text-dim p-1.5 rounded-lg hover:bg-forge-surface transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button onClick={del} className="text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
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
      toast.success(`Voice "${name}" added!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-forge-text mb-1">Voices</h1>
      <p className="text-forge-muted text-sm mb-6">
        Upload 5–20s of clean speech to clone a voice. The clip is used as an audio prompt for zero-shot voice cloning.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6
          ${dragOver
            ? 'border-forge-accent bg-forge-accent/10'
            : 'border-forge-border hover:border-forge-accent/50 hover:bg-forge-surface/50'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.flac,.ogg,.m4a"
          className="hidden"
          onChange={handleFileInput}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-forge-muted">Uploading and converting…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudUpload className="w-8 h-8 text-forge-muted" />
            <p className="text-sm font-medium text-forge-text">Drop audio file here or click to browse</p>
            <p className="text-xs text-forge-muted">WAV, MP3, FLAC, OGG, M4A · 5–20s of clean speech recommended</p>
          </div>
        )}
      </div>

      {/* Voices list */}
      {loading ? (
        <p className="text-forge-muted text-sm">Loading…</p>
      ) : voices.length === 0 ? (
        <div className="text-center py-12 text-forge-muted">
          <Mic2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No saved voices yet. Upload an audio clip above to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 group">
          {voices.map(v => (
            <VoiceCard
              key={v.id}
              voice={v}
              onDeleted={id => setVoices(prev => prev.filter(x => x.id !== id))}
              onRenamed={(id, name) => setVoices(prev => prev.map(x => x.id === id ? { ...x, name } : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
