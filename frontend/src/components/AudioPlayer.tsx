import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, Download } from 'lucide-react'
import { api } from '../api'

interface AudioPlayerProps {
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

  const audioUrl = src.startsWith('/') || src.startsWith('http') ? src : api.audioUrl(src)
  const filename = src.split('/').pop() ?? src

  useEffect(() => {
    if (!containerRef.current) return
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(124,58,237,0.4)',
      progressColor: '#a78bfa',
      cursorColor: '#7c3aed',
      barWidth: 2,
      barGap: 1,
      barRadius: 3,
      height: 52,
      normalize: true,
      backend: 'WebAudio',
    })
    ws.load(audioUrl)
    ws.on('ready', () => { setReady(true); setDuration(ws.getDuration()) })
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()))
    ws.on('finish', () => setPlaying(false))
    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))
    wsRef.current = ws
    return () => ws.destroy()
  }, [audioUrl])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="card p-4 mt-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-accent
                     shadow-glow-sm hover:brightness-110 active:scale-95 transition-all
                     disabled:opacity-40 shrink-0"
        >
          {playing
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          {ready
            ? <div ref={containerRef} className="w-full" />
            : <div className="skeleton h-8 rounded-lg w-full" />}
        </div>

        <span className="text-xs text-vf-muted tabular-nums shrink-0 font-mono">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-vf-border">
        <a href={audioUrl} download className="btn-secondary text-xs gap-1.5 px-3 py-1.5">
          <Download className="w-3.5 h-3.5" />
          WAV
        </a>
        {ffmpegAvailable && (
          <a href={`/api/audio/${filename}/mp3`} download className="btn-secondary text-xs gap-1.5 px-3 py-1.5">
            <Download className="w-3.5 h-3.5" />
            MP3
          </a>
        )}
        {!ffmpegAvailable && (
          <p className="text-[11px] text-vf-muted">
            Install <code className="text-vf-text-dim">ffmpeg</code> to enable MP3 downloads
          </p>
        )}
      </div>
    </div>
  )
}
