import { useEffect, useRef, useState } from 'react'
import { Trash2, Play, Pause, Download, History } from 'lucide-react'
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
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  async function del() {
    if (!confirm('Delete this history entry?')) return
    try {
      await api.deleteHistory(item.id)
      onDeleted(item.id)
      toast.success('Deleted')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 shrink-0 flex items-center justify-center bg-forge-accent/15 hover:bg-forge-accent/30 rounded-full transition-colors mt-0.5"
        >
          {playing
            ? <Pause className="w-3.5 h-3.5 text-forge-accent" />
            : <Play className="w-4 h-4 text-forge-accent ml-0.5" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-forge-text line-clamp-2 mb-1">{item.text}</p>
          <div className="flex items-center gap-3 text-xs text-forge-muted">
            <span className={`px-2 py-0.5 rounded-full font-medium
              ${item.engine === 'turbo'
                ? 'bg-amber-900/40 text-amber-300'
                : 'bg-purple-900/40 text-purple-300'
              }`}
            >
              {item.engine}
            </span>
            <span>{new Date(item.created_at * 1000).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={audioUrl}
            download
            className="p-1.5 text-forge-muted hover:text-forge-text rounded-lg hover:bg-forge-surface transition-colors"
            title="Download WAV"
          >
            <Download className="w-4 h-4" />
          </a>
          {ffmpegAvailable && (
            <a
              href={`/api/audio/${filename}/mp3`}
              download
              className="p-1.5 text-forge-muted hover:text-forge-text rounded-lg hover:bg-forge-surface transition-colors text-xs font-medium"
              title="Download MP3"
            >
              MP3
            </a>
          )}
          <button
            onClick={del}
            className="p-1.5 text-red-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false)

  useEffect(() => {
    Promise.all([api.history(), api.status()]).then(([h, s]) => {
      setItems(h)
      setFfmpegAvailable(s.ffmpeg_available)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-forge-text mb-1">History</h1>
      <p className="text-forge-muted text-sm mb-6">Past generations — play, download, or delete.</p>

      {loading ? (
        <p className="text-forge-muted text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-forge-muted">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No history yet — generate some speech first.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <HistoryCard
              key={item.id}
              item={item}
              ffmpegAvailable={ffmpegAvailable}
              onDeleted={id => setItems(prev => prev.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
