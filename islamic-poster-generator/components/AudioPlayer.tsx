'use client'
import { useState, useRef, useImperativeHandle, forwardRef } from 'react'

interface AudioPlayerProps {
  surahNumber: number
  ayahNumber: number
}

export interface AudioPlayerHandle {
  stop: () => void
}

const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Alafasy', arabic: 'مشاري العفاسي' },
  { id: 'Sudais_128kbps', name: 'Abdul Rahman Al-Sudais', arabic: 'عبدالرحمن السديس' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr Al-Shatri', arabic: 'أبو بكر الشاطري' },
  { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi', arabic: 'سعد الغامدي' },
]

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ surahNumber, ayahNumber }, ref) {
    const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const stop = () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
      setIsPlaying(false)
      setIsLoading(false)
    }

    useImperativeHandle(ref, () => ({ stop }))

    const getAudioUrl = (reciterId: string) => {
      const surah = String(surahNumber).padStart(3, '0')
      const ayah = String(ayahNumber).padStart(3, '0')
      return `https://everyayah.com/data/${reciterId}/${surah}${ayah}.mp3`
    }

    const handlePlay = async () => {
      if (isPlaying && audioRef.current) {
        stop()
        return
      }

      setIsLoading(true)
      const url = getAudioUrl(selectedReciter)

      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(url)
      audioRef.current = audio

      audio.oncanplaythrough = () => setIsLoading(false)
      audio.onplay = () => { setIsPlaying(true); setIsLoading(false) }
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => {
        setIsLoading(false)
        setIsPlaying(false)
      }

      try {
        await audio.play()
      } catch {
        setIsLoading(false)
        setIsPlaying(false)
      }
    }

    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Choose Reciter (قاری)
          </label>
          <select
            value={selectedReciter}
            onChange={(e) => {
              setSelectedReciter(e.target.value)
              if (isPlaying && audioRef.current) {
                audioRef.current.pause()
                setIsPlaying(false)
              }
            }}
            className="w-full p-2 rounded-lg border text-sm bg-background"
          >
            {RECITERS.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.arabic}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePlay}
          disabled={isLoading || !surahNumber || !ayahNumber}
          className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2
                     bg-[#1a4a2e] text-[#d4af37] disabled:opacity-50 disabled:cursor-not-allowed
                     hover:bg-[#0d2e1b] transition-colors"
        >
          {isLoading ? (
            <><span className="animate-spin">⏳</span> Loading audio...</>
          ) : isPlaying ? (
            <><span>⏹</span> Stop Recitation</>
          ) : (
            <><span>🔊</span> Play Recitation — استماع</>
          )}
        </button>

        {isPlaying && (
          <div className="text-center text-xs text-[#1a4a2e] animate-pulse">
            🎵 Playing — {RECITERS.find(r => r.id === selectedReciter)?.name}
          </div>
        )}
      </div>
    )
  }
)

export default AudioPlayer
