import { useEffect, useRef, useState } from 'react'
import { Trash2, Play, Pause, Download, Clock, Trash } from 'lucide-react'
import { api } from '../api'
import type { HistoryItem } from '../types'
import { useToast } from '../components/Toast'

function HistoryCard({ item, ffmpegAvailable, onDeleted }: {
  item: HistoryItem
  ffmpegAvailable: boolean
  onDeleted: (id: string) => void
}) {
  const toast = useToast()
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const filename = item.file_path.split('/').pop() ?? ''
  const audioUrl = api.audioUrl(filename)

  function togglePlay() {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
  }

  async function del() {
    if (!confirm('Delete this history entry?')) return
    try {
      await api.deleteHistory(item.id)
      onDeleted(item.id)
      toast.success('Deleted')
    } catch (err: any) { toast.error(err.message) }
  }

  const date = new Date(item.created_at * 1000)
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card p-4 hover:border-vf-border-hi transition-colors">
      <div className="flex items-start gap-3">
        {/* Play */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-vf-surface border border-vf-border hover:border-vf-accent/50 hover:bg-vf-accent-dim transition-all mt-0.5"
        >
          {playing
            ? <Pause className="w-3.5 h-3.5 text-vf-accent" />
            : <Play className="w-4 h-4 text-vf-accent ml-0.5" />}
        </button>

        {/* Text + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-vf-text leading-relaxed line-clamp-2 mb-2">{item.text}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={item.engine === 'turbo' ? 'badge-turbo' : 'badge-standard'}>
              {item.engine}
            </span>
            <span className="text-xs text-vf-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dateStr} · {timeStr}
            </span>
          </div>
        </div>

        {/* Download / delete */}
        <div className="flex items-center gap-1 shrink-0">
          <a href={audioUrl} download title="Download WAV"
            className="btn-ghost p-2">
            <Download className="w-4 h-4" />
          </a>
          {ffmpegAvailable && (
            <a href={`/api/audio/${filename}/mp3`} download title="Download MP3"
              className="btn-ghost p-2 text-xs font-semibold">
              MP3
            </a>
          )}
          <button onClick={del} className="btn-danger p-2" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const toast = useToast()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false)

  useEffect(() => {
    Promise.all([api.history(), api.status()])
      .then(([h, s]) => { setItems(h); setFfmpegAvailable(s.ffmpeg_available) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function clearAll() {
    if (!confirm(`Delete all ${items.length} history entries?`)) return
    try {
      await Promise.all(items.map(i => api.deleteHistory(i.id)))
      setItems([])
      toast.success('History cleared')
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Past generations — play, download, or delete</p>
        </div>
        {items.length > 0 && (
          <button onClick={clearAll} className="btn-danger text-xs gap-1.5 mt-1">
            <Trash className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="w-12 h-12 mx-auto mb-4 text-vf-muted opacity-30" />
          <p className="text-sm text-vf-muted">No history yet — generate some speech first</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-vf-muted mb-3">{items.length} generation{items.length !== 1 ? 's' : ''}</p>
          {items.map(item => (
            <HistoryCard
              key={item.id}
              item={item}
              ffmpegAvailable={ffmpegAvailable}
              onDeleted={id => setItems(p => p.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
