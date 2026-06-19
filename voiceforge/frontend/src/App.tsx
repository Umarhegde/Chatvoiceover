import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { Sidebar } from './components/Sidebar'
import { Generate } from './pages/Generate'
import { Voices } from './pages/Voices'
import { VoiceConversion } from './pages/VoiceConversion'
import { HistoryPage } from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-vf-bg">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="bg-gradient-glow min-h-full">
              <Routes>
                <Route path="/" element={<Generate />} />
                <Route path="/voices" element={<Voices />} />
                <Route path="/vc" element={<VoiceConversion />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
