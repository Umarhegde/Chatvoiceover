import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, Download } from 'lucide-react'
import { api } from '../api'

interface AudioPlayerProps {
  /** Either a full URL or just the filename (e.g. "abc123.wav") */
  src: string
  ffmpegAvailable?: boolean
}

export function AudioPlayer({ src, ffmpegAvailable = false }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  // Derive the full audio URL
  const audioUrl = src.startsWith('/') || src.startsWith('http') ? src : api.audioUrl(src)
  // Derive the filename for download URLs
  const filename = src.split('/').pop() ?? src

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      cursorColor: '#c7d2fe',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 56,
      normalize: true,
      backend: 'WebAudio',
    })

    ws.load(audioUrl)

    ws.on('ready', () => {
      setReady(true)
      setDuration(ws.getDuration())
    })

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime())
    })

    ws.on('finish', () => setPlaying(false))
    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))

    wsRef.current = ws

    return () => {
      ws.destroy()
    }
  }, [audioUrl])

  function togglePlay() {
    wsRef.current?.playPause()
  }

  function fmt(s: number): string {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={togglePlay}
          disabled={!ready}
          className="w-9 h-9 flex items-center justify-center bg-forge-accent hover:bg-forge-accent-hover rounded-full transition-colors disabled:opacity-40 shrink-0"
        >
          {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="w-full" />
        </div>
        <span className="text-xs text-forge-muted shrink-0 tabular-nums">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      <div className="flex gap-2 mt-3">
        <a
          href={audioUrl}
          download
          className="flex items-center gap-1.5 text-sm btn-secondary"
        >
          <Download className="w-3.5 h-3.5" />
          Download WAV
        </a>
        {ffmpegAvailable && (
          <a
            href={`/api/audio/${filename}/mp3`}
            download
            className="flex items-center gap-1.5 text-sm btn-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            Download MP3
          </a>
        )}
        {!ffmpegAvailable && (
          <span className="text-xs text-forge-muted self-center">
            MP3: install ffmpeg-free for MP3 downloads
          </span>
        )}
      </div>
    </div>
  )
}
