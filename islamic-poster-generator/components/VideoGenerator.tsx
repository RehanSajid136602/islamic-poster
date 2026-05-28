'use client'
import { useState, useRef } from 'react'
import { searchQuranAyah } from '@/lib/quran'

const VIDEO_CATEGORIES = [
  { id: 'makkah',    label: '🕌 Makkah',     query: 'mecca mosque islamic' },
  { id: 'madinah',   label: '🕌 Madinah',    query: 'madinah mosque' },
  { id: 'mountains', label: '🏔️ Mountains',  query: 'mountains nature fog' },
  { id: 'ocean',     label: '🌊 Ocean',       query: 'ocean waves calm' },
  { id: 'sunset',    label: '🌅 Sunset',      query: 'sunset sky golden hour' },
  { id: 'rain',      label: '🌧️ Rain',        query: 'rain nature peaceful' },
  { id: 'desert',    label: '🏜️ Desert',      query: 'desert sand dunes' },
  { id: 'forest',    label: '🌿 Forest',      query: 'forest green nature' },
]

const RECITERS = [
  { id: 'Alafasy_128kbps',               name: 'Mishary Alafasy' },
  { id: 'Sudais_128kbps',                name: 'Al-Sudais' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr Al-Shatri' },
  { id: 'Ghamadi_40kbps',                name: 'Saad Al-Ghamdi' },
]

const MUSIC_OPTIONS = [
  { id: 'nasheed', label: '🎵 Soft Nasheed',    file: '/audio/nasheed-soft.mp3',   volume: 0.25 },
  { id: 'nature',  label: '🌿 Nature Sounds',   file: '/audio/nasheed-nature.mp3', volume: 0.35 },
  { id: 'none',    label: '🔇 Recitation Only', file: null,                        volume: 0 },
]

const TOPIC_VIDEO_MAP: Record<string, string> = {
  hajj:      'kaaba mecca pilgrimage',
  namaz:     'mosque prayer islamic',
  salah:     'mosque prayer peaceful',
  quran:     'quran book islamic light',
  ramadan:   'ramadan moon crescent night',
  sabr:      'calm ocean waves patience',
  tawakkul:  'sky clouds peaceful nature',
  jannah:    'garden paradise flowers river',
  dua:       'hands prayer supplication',
  zakat:     'helping hands charity giving',
  fajr:      'sunrise dawn morning light',
  maghrib:   'sunset golden sky dusk',
  isha:      'night stars sky moon',
  madinah:   'madinah mosque green dome',
  makkah:    'mecca kaaba aerial',
}

const getVideoQueryForTopic = (topic: string): string => {
  const key = topic.toLowerCase().trim()
  return TOPIC_VIDEO_MAP[key] ?? 'mountains nature peaceful'
}

interface ContentUpdate {
  arabicText: string
  urduText: string
  surahNumber: number
  ayahNumber: number
  surahName: string
  contentType: 'quran' | 'hadith'
}

interface SearchResult {
  text: string
  surah: { number: number; name: string; englishName: string }
  numberInSurah: number
}

interface VideoGeneratorProps {
  arabicText: string
  urduText: string
  surahNumber: number
  ayahNumber: number
  surahName: string
  contentType: 'quran' | 'hadith'
  onContentUpdate: (data: ContentUpdate) => void
}

export default function VideoGenerator({
  arabicText, urduText, surahNumber,
  ayahNumber, surahName, contentType,
  onContentUpdate
}: VideoGeneratorProps) {

  const [category,      setCategory]      = useState('mountains')
  const [reciter,       setReciter]       = useState(RECITERS[0].id)
  const [musicOption,   setMusicOption]   = useState('nasheed')
  const [isGenerating,  setIsGenerating]  = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [videoUrl,      setVideoUrl]      = useState<string | null>(null)
  const [statusMsg,     setStatusMsg]     = useState('')
  const [customQuery,   setCustomQuery]   = useState<string | null>(null)

  const [searchQuery,   setSearchQuery]   = useState('')
  const [isSearching,   setIsSearching]   = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ─── Fetch Pexels video URL (highest quality portrait) ───────────────
  const fetchPexelsVideo = async (query: string): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY
    if (!apiKey) throw new Error('Missing NEXT_PUBLIC_PEXELS_API_KEY in .env.local')

    const res = await fetch(
      `https://api.pexels.com/videos/search` +
      `?query=${encodeURIComponent(query)}` +
      `&per_page=15` +
      `&orientation=portrait` +
      `&size=large`,
      { headers: { Authorization: apiKey } }
    )
    if (!res.ok) throw new Error(`Pexels API error: ${res.status}`)
    const data = await res.json()

    if (!data.videos?.length) {
      throw new Error('No videos found. Try a different category.')
    }

    // Go through all returned videos and pick best quality file
    for (const video of data.videos) {
      const files: Array<{ quality: string; width: number; height: number; link: string }> = video.video_files ?? []

      // Sort by resolution — highest first
      const sorted = [...files].sort((a, b) => {
        const resA = (a.width ?? 0) * (a.height ?? 0)
        const resB = (b.width ?? 0) * (b.height ?? 0)
        return resB - resA
      })

      // Priority 1: Full HD portrait (1080x1920 or similar)
      const fullHD = sorted.find(f =>
        f.quality === 'hd' &&
        f.height >= 1080 &&
        f.height > f.width
      )
      if (fullHD) return fullHD.link

      // Priority 2: Any HD portrait
      const anyHD = sorted.find(f =>
        f.quality === 'hd' &&
        f.height > f.width
      )
      if (anyHD) return anyHD.link

      // Priority 3: Highest resolution portrait regardless of label
      const highestPortrait = sorted.find(f =>
        f.height > f.width && f.height >= 720
      )
      if (highestPortrait) return highestPortrait.link
    }

    // Last resort: largest file from first video
    const fallbackFiles = data.videos[0].video_files ?? []
    const fallback = [...fallbackFiles].sort((a, b) =>
      (b.width * b.height) - (a.width * a.height)
    )[0]

    if (!fallback) throw new Error('No suitable video file found')
    return fallback.link
  }

  // ─── Load audio buffer from URL ──────────────────────────────────────
  const loadAudio = async (
    ctx: AudioContext,
    url: string
  ): Promise<AudioBuffer> => {
    const res = await fetch(url)
    const arr = await res.arrayBuffer()
    return ctx.decodeAudioData(arr)
  }

  // ─── Text wrap helper (RTL-safe with maxLines) ──────────────────────────
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lineH: number,
    maxLines: number = 6
  ) => {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.direction = 'rtl'

    const words = text.trim().split(/\s+/)
    const lines: string[] = []
    let current = ''

    for (const word of words) {
      const test = current ? current + ' ' + word : word
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current)
        current = word
        if (lines.length >= maxLines) break
      } else {
        current = test
      }
    }
    if (current && lines.length < maxLines) lines.push(current)

    const totalH = lines.length * lineH
    const startY = y - totalH / 2 + lineH / 2

    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * lineH, maxW)
    })

    ctx.restore()
  }

  // ─── Round rect helper ────────────────────────────────────────────────
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y,     x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x,     y + h, r)
    ctx.arcTo(x,     y + h, x,     y,     r)
    ctx.arcTo(x,     y,     x + w, y,     r)
    ctx.closePath()
  }

  // ─── Cover-fit video drawing (exact pixel math) ──────────────────────
  const drawVideoCover = (
    ctx: CanvasRenderingContext2D,
    vid: HTMLVideoElement,
    W: number,
    H: number
  ) => {
    const vW = vid.videoWidth
    const vH = vid.videoHeight

    if (!vW || !vH) {
      ctx.fillStyle = '#0a2015'
      ctx.fillRect(0, 0, W, H)
      return
    }

    // Cover-fit: scale to fill entire canvas, no letterboxing
    const scaleX = W / vW
    const scaleY = H / vH
    const scale  = Math.max(scaleX, scaleY)

    const drawW = Math.ceil(vW * scale)
    const drawH = Math.ceil(vH * scale)
    const drawX = Math.floor((W - drawW) / 2)
    const drawY = Math.floor((H - drawH) / 2)

    // Integer pixels — avoids sub-pixel blur
    ctx.drawImage(vid, drawX, drawY, drawW, drawH)
  }

  // ─── Golden corner decorations ────────────────────────────────────────
  const drawCorners = (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number
  ) => {
    const size = 70
    const pad = 40
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 6
    ctx.lineCap = 'square'

    ctx.beginPath()
    ctx.moveTo(pad, pad + size)
    ctx.lineTo(pad, pad)
    ctx.lineTo(pad + size, pad)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(W - pad - size, pad)
    ctx.lineTo(W - pad, pad)
    ctx.lineTo(W - pad, pad + size)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(pad, H - pad - size)
    ctx.lineTo(pad, H - pad)
    ctx.lineTo(pad + size, H - pad)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(W - pad - size, H - pad)
    ctx.lineTo(W - pad, H - pad)
    ctx.lineTo(W - pad, H - pad - size)
    ctx.stroke()
  }

  // ─── Draw one frame on canvas (dynamic duration) ─────────────────────
  const drawFrame = (
    ctx2d:    CanvasRenderingContext2D,
    videoEl:  HTMLVideoElement,
    elapsed:  number,
    duration: number,
    data: { arabicText: string; urduText: string; surahName: string; ayahNumber: number; contentType: 'quran' | 'hadith' }
  ) => {
    const W = 1080, H = 1920

    // Proportional timing points
    const t = {
      bismillahFadeIn: 0,
      arabicFadeIn:    Math.min(2,   duration * 0.08),
      arabicFadeDone:  Math.min(3.5, duration * 0.15),
      dividerAppear:   Math.min(4,   duration * 0.2),
      urduFadeIn:      Math.min(5,   duration * 0.28),
      urduFadeDone:    Math.min(6.5, duration * 0.38),
      refPillAppear:   Math.min(8,   duration * 0.5),
      refPillFadeDone: Math.min(9.5, duration * 0.58),
      fadeOutStart:    duration - 1.5,
    }

    // Global fade out near end
    const fadeOutAlpha = elapsed > t.fadeOutStart
      ? Math.max(0, 1 - (elapsed - t.fadeOutStart) / 1.5)
      : 1

    // 1. Background video frame (cover-fit)
    ctx2d.globalAlpha = 1
    drawVideoCover(ctx2d, videoEl, W, H)

    // 2. Dark overlay
    ctx2d.globalAlpha = 1
    ctx2d.fillStyle = `rgba(0, 0, 0, ${0.52 * fadeOutAlpha})`
    ctx2d.fillRect(0, 0, W, H)

    // 3. Golden border + corners
    ctx2d.globalAlpha = 0.6 * fadeOutAlpha
    ctx2d.strokeStyle = '#d4af37'
    ctx2d.lineWidth   = 3
    ctx2d.strokeRect(40, 40, W - 80, H - 80)
    drawCorners(ctx2d, W, H)
    ctx2d.globalAlpha = 1

    // Clip to safe area — prevents any text overflow
    ctx2d.save()
    ctx2d.rect(60, 60, W - 120, H - 120)
    ctx2d.clip()

    // 4. Bismillah — fades in immediately
    const bismillahAlpha = Math.min(1, elapsed / Math.max(0.8, duration * 0.05)) * fadeOutAlpha
    ctx2d.globalAlpha = bismillahAlpha
    ctx2d.fillStyle   = 'rgba(212, 175, 55, 0.85)'
    ctx2d.font        = '52px KFGQPCHafs, serif'
    ctx2d.textAlign   = 'center'
    ctx2d.direction   = 'rtl'
    ctx2d.fillText('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ', W / 2, 180, W - 120)
    ctx2d.globalAlpha = 1

    // 5. Arabic text — fades in after intro
    const arabicFadeDur = Math.max(0.5, t.arabicFadeDone - t.arabicFadeIn)
    const arabicAlpha = elapsed < t.arabicFadeIn
      ? 0
      : Math.min(1, (elapsed - t.arabicFadeIn) / arabicFadeDur) * fadeOutAlpha
    ctx2d.globalAlpha = arabicAlpha
    ctx2d.fillStyle   = '#f5e6c0'
    ctx2d.font        = '68px KFGQPCHafs, serif'
    ctx2d.textAlign   = 'center'
    ctx2d.direction   = 'rtl'
    wrapText(ctx2d, data.arabicText, W / 2, H * 0.36, W - 200, 115, 5)
    ctx2d.globalAlpha = 1

    // 6. Gold divider
    if (elapsed > t.dividerAppear) {
      const divFadeDur = Math.max(0.3, duration * 0.04)
      const divAlpha = Math.min(1, (elapsed - t.dividerAppear) / divFadeDur) * fadeOutAlpha
      ctx2d.globalAlpha = divAlpha
      const grad = ctx2d.createLinearGradient(200, 0, W - 200, 0)
      grad.addColorStop(0,   'transparent')
      grad.addColorStop(0.5, '#d4af37')
      grad.addColorStop(1,   'transparent')
      ctx2d.fillStyle = grad as CanvasGradient
      ctx2d.fillRect(200, H * 0.58, W - 400, 2)
      ctx2d.globalAlpha = 1
    }

    // 7. Urdu text
    if (elapsed > t.urduFadeIn) {
      const urduFadeDur = Math.max(0.5, t.urduFadeDone - t.urduFadeIn)
      const urduAlpha = Math.min(1, (elapsed - t.urduFadeIn) / urduFadeDur) * fadeOutAlpha
      ctx2d.globalAlpha = urduAlpha
      ctx2d.fillStyle   = '#c8dab8'
      ctx2d.font        = '52px JameelNoori, serif'
      ctx2d.textAlign   = 'center'
      ctx2d.direction   = 'rtl'
      wrapText(ctx2d, data.urduText, W / 2, H * 0.64, W - 200, 95, 5)
      ctx2d.globalAlpha = 1
    }

    // 8. Reference pill
    if (elapsed > t.refPillAppear) {
      const refFadeDur = Math.max(0.4, t.refPillFadeDone - t.refPillAppear)
      const refAlpha = Math.min(1, (elapsed - t.refPillAppear) / refFadeDur) * fadeOutAlpha
      ctx2d.globalAlpha = refAlpha
      const refText = data.contentType === 'quran'
        ? `سورۃ ${data.surahName} — آیت ${data.ayahNumber}`
        : `حدیث نمبر ${data.ayahNumber}`
      const pillW = 520, pillH = 70
      const pillX = (W - pillW) / 2
      const pillY = H * 0.85
      ctx2d.fillStyle = '#d4af37'
      roundRect(ctx2d, pillX, pillY, pillW, pillH, 35)
      ctx2d.fill()
      ctx2d.fillStyle = '#1a2e1a'
      ctx2d.font      = '36px KFGQPCHafs, serif'
      ctx2d.textAlign = 'center'
      ctx2d.direction = 'rtl'
      ctx2d.fillText(refText, W / 2, pillY + 46)
      ctx2d.globalAlpha = 1
    }

    // 9. Watermark
    ctx2d.globalAlpha = 0.5 * fadeOutAlpha
    ctx2d.fillStyle   = '#d4af37'
    ctx2d.font        = '32px KFGQPCHafs, serif'
    ctx2d.textAlign   = 'center'
    ctx2d.direction   = 'rtl'
    ctx2d.fillText('نور الإسلام', W / 2, H - 80)
    ctx2d.globalAlpha = 1

    // Restore clip region
    ctx2d.restore()

    // 10. Progress bar (outside clip)
    ctx2d.fillStyle = 'rgba(212, 175, 55, 0.5)'
    ctx2d.fillRect(0, H - 8, W * (elapsed / duration), 8)
  }

  // ─── Islamic topic search ─────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const result = await searchQuranAyah(searchQuery)
      if (result) {
        const videoQ = getVideoQueryForTopic(searchQuery)
        setCustomQuery(videoQ)
        onContentUpdate({
          arabicText:  result.arabic,
          urduText:    result.urdu,
          surahNumber: result.surahNumber,
          ayahNumber:  result.ayahNumber,
          surahName:   result.surahArabic,
          contentType: 'quran',
        })
        setSearchResults([])
        setSearchQuery('')
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // ─── Main generate function ───────────────────────────────────────────
  const generateVideo = async () => {
    if (!arabicText) return

    setIsGenerating(true)
    setProgress(0)
    setVideoUrl(null)
    setStatusMsg('Fetching background video...')

    try {
      await Promise.all([
        document.fonts.load('normal 72px KFGQPCHafs'),
        document.fonts.load('normal 54px JameelNoori'),
      ])
      await document.fonts.ready

      // Fetch Pexels video — use custom query from search or category
      const pexelsQuery = customQuery ?? VIDEO_CATEGORIES.find(c => c.id === category)!.query
      const videoSrc = await fetchPexelsVideo(pexelsQuery)
      setCustomQuery(null)
      setStatusMsg('Loading background video...')

      const bgVideo         = document.createElement('video')
      bgVideo.crossOrigin   = 'anonymous'
      bgVideo.muted         = true
      bgVideo.loop          = true
      bgVideo.playsInline   = true
      bgVideo.preload       = 'auto'
      bgVideo.src           = videoSrc
      bgVideo.load()

      await new Promise<void>((res, rej) => {
        if (bgVideo.readyState >= 4) { res(); return }
        bgVideo.oncanplaythrough = () => res()
        bgVideo.onerror          = () => rej(new Error('Failed to load background video'))
        setTimeout(() => rej(new Error('Video load timeout')), 15000)
      })

      // Seek past first frame to get a good starting point
      bgVideo.currentTime = 0.5
      await new Promise<void>(resolve => {
        bgVideo.onseeked = () => resolve()
        setTimeout(resolve, 500)
      })

      setStatusMsg('Loading recitation audio...')

      // ─ Audio setup ───────────────────────────────────────────────────
      const audioCtx = new AudioContext()
      const dest     = audioCtx.createMediaStreamDestination()

      // Recitation audio
      const surahPad = String(surahNumber).padStart(3, '0')
      const ayahPad  = String(ayahNumber).padStart(3, '0')
      const recitUrl = `https://everyayah.com/data/${reciter}/${surahPad}${ayahPad}.mp3`
      const recitBuf = await loadAudio(audioCtx, recitUrl)

      // Dynamic duration from recitation length
      const INTRO = 2
      const OUTRO = 1.5
      const DURATION = Math.max(8, recitBuf.duration + INTRO + OUTRO)

      setStatusMsg(`Recitation: ${Math.ceil(recitBuf.duration)}s — total video: ${Math.ceil(DURATION)}s`)

      const recitSrc  = audioCtx.createBufferSource()
      recitSrc.buffer = recitBuf
      const recitGain = audioCtx.createGain()
      recitGain.gain.value = 1.0
      recitSrc.connect(recitGain)
      recitGain.connect(dest)

      // Background nasheed with fade-out
      const music = MUSIC_OPTIONS.find(m => m.id === musicOption)!
      let nasheedSrc: AudioBufferSourceNode | null = null
      let nasheedGain: GainNode | null = null
      if (music.file) {
        try {
          const nasheedBuf  = await loadAudio(audioCtx, music.file)
          nasheedSrc        = audioCtx.createBufferSource()
          nasheedSrc.buffer = nasheedBuf
          nasheedSrc.loop   = true
          nasheedGain       = audioCtx.createGain()
          nasheedGain.gain.value = music.volume
          nasheedSrc.connect(nasheedGain)
          nasheedGain.connect(dest)
        } catch {
          nasheedSrc = null
        }
      }

      // ─ Canvas setup ─────────────────────────────────────────────────
      const canvas = canvasRef.current!
      canvas.width  = 1080
      canvas.height = 1920
      const ctx2d   = canvas.getContext('2d', {
        alpha:              false,
        desynchronized:     false,
        willReadFrequently: false,
      })!
      ctx2d.imageSmoothingEnabled = true
      ctx2d.imageSmoothingQuality = 'high'

      // ─ MediaRecorder setup ───────────────────────────────────────────
      const videoStream = canvas.captureStream(30)
      dest.stream.getAudioTracks().forEach(t => videoStream.addTrack(t))

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm'

      const recorder = new MediaRecorder(videoStream, {
        mimeType,
        videoBitsPerSecond: 12_000_000,
        audioBitsPerSecond:  192_000,
      })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      // ─ Start everything ──────────────────────────────────────────────
      setStatusMsg(`Recording ${Math.ceil(DURATION)}s video...`)
      const startTime = performance.now()
      const drawData = { arabicText, urduText, surahName, ayahNumber, contentType }

      await bgVideo.play()
      // Give browser 3 frames to buffer before recording
      await new Promise(r => setTimeout(r, 100))
      recorder.start(33)
      recitSrc.start(audioCtx.currentTime + INTRO)
      nasheedSrc?.start(0)
      audioCtx.resume()

      // Schedule nasheed fade-out 2 seconds before end
      if (nasheedGain && nasheedSrc) {
        const fadeStart = Math.max(0, DURATION - 2)
        nasheedGain.gain.setValueAtTime(music.volume, audioCtx.currentTime + fadeStart)
        nasheedGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + DURATION)
      }

      // ─ Render loop (locked 30fps) ───────────────────────────────────
      const FPS = 30
      const FRAME_MS = 1000 / FPS

      const renderFrame = () => {
        const elapsed = (performance.now() - startTime) / 1000
        const pct = Math.min(elapsed / DURATION, 1)
        const remaining = Math.max(0, Math.ceil(DURATION - elapsed))

        drawFrame(ctx2d, bgVideo, elapsed, DURATION, drawData)
        setProgress(Math.floor(pct * 100))
        setStatusMsg(`Recording... ${Math.floor(pct * 100)}% (${remaining}s left)`)
      }

      const renderInterval = setInterval(renderFrame, FRAME_MS)

      await new Promise<void>(resolve => {
        setTimeout(() => {
          clearInterval(renderInterval)
          resolve()
        }, DURATION * 1000)
      })

      // ─ Stop and finalize ─────────────────────────────────────────────
      bgVideo.pause()
      try { recitSrc.stop() } catch { /* already stopped */ }
      try { nasheedSrc?.stop() } catch { /* already stopped */ }
      recorder.stop()

      const blob = await new Promise<Blob>(res => {
        recorder.onstop = () => res(new Blob(chunks, { type: mimeType }))
      })

      const url = URL.createObjectURL(blob)
      setVideoUrl(url)
      setStatusMsg(`Video ready! (${Math.ceil(DURATION)}s)`)
      setProgress(100)

      audioCtx.close()

    } catch (err) {
      console.error('Video generation failed:', err)
      setStatusMsg(`Error: ${(err as Error).message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Download video ───────────────────────────────────────────────────
  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href     = videoUrl
    a.download = `islamic-video-${Date.now()}.webm`
    a.click()
  }

  // ─── Share to WhatsApp ────────────────────────────────────────────────
  const shareToWhatsApp = async () => {
    if (!videoUrl) return
    const res  = await fetch(videoUrl)
    const blob = await res.blob()
    const file = new File([blob], 'islamic-video.webm', { type: blob.type })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Islamic Video' })
    } else {
      downloadVideo()
      setTimeout(() => window.open('https://web.whatsapp.com', '_blank'), 800)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Hidden canvas used for recording */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Islamic Topic Search */}
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          🔍 Search Islamic Topic
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="hajj, namaz, sabr, tawakkul..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            dir="ltr"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 rounded-lg bg-[#1a4a2e] text-[#d4af37] text-sm font-medium disabled:opacity-50"
          >
            {isSearching ? '...' : '🔍'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['hajj','namaz','sabr','quran','ramadan','dua','fajr','jannah'].map(topic => (
            <button
              key={topic}
              onClick={() => setSearchQuery(topic)}
              className="px-3 py-1 rounded-full text-xs border border-[#d4af37]/40 text-[#d4af37]/80 hover:bg-[#1a4a2e] hover:text-[#d4af37] transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Category picker */}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Background Video
        </p>
        <div className="grid grid-cols-4 gap-2">
          {VIDEO_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setCustomQuery(null); }}
              className={`p-2 rounded-lg text-xs border transition-all ${
                category === cat.id && !customQuery
                  ? 'bg-[#1a4a2e] text-[#d4af37] border-[#d4af37]'
                  : 'bg-background border-border text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {customQuery && (
          <p className="text-[10px] text-[#d4af37] mt-1">
            ✨ Auto-matched background from search
          </p>
        )}
      </div>

      {/* Reciter picker */}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Reciter (قاری)
        </p>
        <select
          value={reciter}
          onChange={e => setReciter(e.target.value)}
          className="w-full p-2 rounded-lg border text-sm bg-background"
        >
          {RECITERS.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Music picker */}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Background Music
        </p>
        <div className="flex gap-2">
          {MUSIC_OPTIONS.map(m => (
            <button
              key={m.id}
              onClick={() => setMusicOption(m.id)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs border transition-all ${
                musicOption === m.id
                  ? 'bg-[#1a4a2e] text-[#d4af37] border-[#d4af37]'
                  : 'bg-background border-border'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generateVideo}
        disabled={isGenerating || !arabicText}
        className="w-full py-3 rounded-xl font-medium bg-[#1a4a2e] text-[#d4af37] disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#0d2e1b] transition-colors"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⏳</span>
            {statusMsg}
          </>
        ) : '🎬 Create Video'}
      </button>

      <p className="text-[10px] text-center text-muted-foreground -mt-2">
        Video length auto-matches recitation (min 8s)
      </p>

      {/* Progress bar */}
      {isGenerating && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-[#d4af37] h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status message when not generating */}
      {!isGenerating && statusMsg && (
        <p className="text-xs text-center text-muted-foreground">{statusMsg}</p>
      )}

      {/* Video preview + actions */}
      {videoUrl && (
        <div className="flex flex-col gap-3">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl"
            style={{ aspectRatio: '9/16', objectFit: 'cover' }}
          />
          <button
            onClick={downloadVideo}
            className="w-full py-3 rounded-xl bg-[#1a4a2e] text-white font-medium hover:bg-[#0d2e1b] transition-colors"
          >
            ⬇️ Download Video (WebM)
          </button>
          <button
            onClick={shareToWhatsApp}
            className="w-full py-3 rounded-xl bg-[#128c3e] text-white font-medium hover:bg-[#0f7034] transition-colors"
          >
            📲 Share to WhatsApp
          </button>
        </div>
      )}

    </div>
  )
}
