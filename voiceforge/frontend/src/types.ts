export type Engine = 'turbo' | 'standard'

export interface StatusResponse {
  device: string
  current_engine: string | null
  free_ram_gb: number
  ffmpeg_available: boolean
  slow_cpu_warning: boolean
}

export interface Voice {
  id: string
  name: string
  path: string
  created_at: number
}

export interface Job {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number
  total: number
  result_url: string | null
  error: string | null
}

export interface HistoryItem {
  id: string
  text: string
  engine: Engine
  file_path: string
  created_at: number
  params: string | null
}

export interface TTSParams {
  engine: Engine
  text: string
  voice_id?: string
  exaggeration: number
  cfg_weight: number
  min_p: number
  temperature: number
  repetition_penalty: number
  top_p: number
  top_k: number
  seed?: number
}
