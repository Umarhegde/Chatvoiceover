import type { HistoryItem, Job, StatusResponse, TTSParams, Voice } from './types'

const BASE = '/api'

async function _json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body?.detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  // ── status ──────────────────────────────────────────────────────────
  status(): Promise<StatusResponse> {
    return fetch(`${BASE}/status`).then(r => _json<StatusResponse>(r))
  },

  // ── tts ─────────────────────────────────────────────────────────────
  tts(params: TTSParams): Promise<{ job_id: string }> {
    return fetch(`${BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then(r => _json(r))
  },

  // ── jobs ────────────────────────────────────────────────────────────
  job(id: string): Promise<Job> {
    return fetch(`${BASE}/jobs/${id}`).then(r => _json<Job>(r))
  },

  // ── voices ──────────────────────────────────────────────────────────
  voices(): Promise<Voice[]> {
    return fetch(`${BASE}/voices`).then(r => _json<Voice[]>(r))
  },

  uploadVoice(file: File, name: string): Promise<Voice> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    return fetch(`${BASE}/voices`, { method: 'POST', body: fd }).then(r => _json<Voice>(r))
  },

  renameVoice(id: string, name: string): Promise<void> {
    return fetch(`${BASE}/voices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => _json(r))
  },

  deleteVoice(id: string): Promise<void> {
    return fetch(`${BASE}/voices/${id}`, { method: 'DELETE' }).then(r => _json(r))
  },

  voiceAudioUrl(id: string): string {
    return `${BASE}/voices/${id}/audio`
  },

  // ── voice conversion ────────────────────────────────────────────────
  vc(sourceFile: File, targetVoiceId: string): Promise<{ job_id: string }> {
    const fd = new FormData()
    fd.append('source', sourceFile)
    fd.append('target_voice_id', targetVoiceId)
    return fetch(`${BASE}/vc`, { method: 'POST', body: fd }).then(r => _json(r))
  },

  // ── upload text ─────────────────────────────────────────────────────
  uploadText(file: File): Promise<{ text: string; truncated: boolean }> {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`${BASE}/upload-text`, { method: 'POST', body: fd }).then(r => _json(r))
  },

  // ── audio ───────────────────────────────────────────────────────────
  audioUrl(filename: string): string {
    return `${BASE}/audio/${filename}`
  },

  audioMp3Url(filename: string): string {
    return `${BASE}/audio/${filename}/mp3`
  },

  // ── history ─────────────────────────────────────────────────────────
  history(): Promise<HistoryItem[]> {
    return fetch(`${BASE}/history`).then(r => _json<HistoryItem[]>(r))
  },

  deleteHistory(id: string): Promise<void> {
    return fetch(`${BASE}/history/${id}`, { method: 'DELETE' }).then(r => _json(r))
  },
}

// Poll a job until done/error; calls onProgress(progress, total) each poll
export async function pollJob(
  jobId: string,
  onProgress: (p: number, t: number) => void,
  intervalMs = 600,
): Promise<Job> {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const job = await api.job(jobId)
        onProgress(job.progress, job.total)
        if (job.status === 'done') {
          clearInterval(timer)
          resolve(job)
        } else if (job.status === 'error') {
          clearInterval(timer)
          reject(new Error(job.error ?? 'Generation failed'))
        }
      } catch (err) {
        clearInterval(timer)
        reject(err)
      }
    }, intervalMs)
  })
}
