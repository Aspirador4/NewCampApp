'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Download,
  Share2,
  Trophy,
  Users,
  Loader2,
} from 'lucide-react'
import { LiveMatchTeam } from './LiveMatchTrackerModal'

interface MatchGraphicModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  eventDate?: string
  eventLocation?: string
  clubName?: string
  clubLogo?: string | null
  teams: LiveMatchTeam[]
  resultRecorded?: boolean
}

type GraphicMode = 'nomina' | 'resultado'
type GraphicFormat = 'story' | 'feed' // story: 1080x1920, feed: 1080x1080

export function MatchGraphicModal({
  isOpen,
  onClose,
  eventTitle,
  eventDate,
  eventLocation,
  clubName = "CAMPANARIO'S OLD BOYS",
  clubLogo,
  teams,
  resultRecorded = false,
}: MatchGraphicModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [mode, setMode] = useState<GraphicMode>(() =>
    resultRecorded || (teams[0]?.score !== null && teams[1]?.score !== null)
      ? 'resultado'
      : 'nomina'
  )
  const [format, setFormat] = useState<GraphicFormat>('story')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const team1 = teams[0]
  const team2 = teams[1]

  const drawGraphic = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsGenerating(true)

    const isStory = format === 'story'
    const W = 1080
    const H = isStory ? 1920 : 1080

    canvas.width = W
    canvas.height = H

    // Wait for fonts if available
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready
      } catch {}
    }

    // 1. Background Gradient (Campanario Deep Wine / Gold aesthetic)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0, '#2d0c15')
    bgGrad.addColorStop(0.4, '#17060b')
    bgGrad.addColorStop(1, '#0e0306')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // Subtle tactical field grid lines
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.06)'
    ctx.lineWidth = 1.5
    const gridSize = 60
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Outer framing border
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.35)'
    ctx.lineWidth = 4
    ctx.strokeRect(36, 36, W - 72, H - 72)

    // Corner decorative accents
    const cornerSize = 24
    ctx.strokeStyle = '#C9A84C'
    ctx.lineWidth = 6
    // Top-left
    ctx.beginPath()
    ctx.moveTo(36, 36 + cornerSize)
    ctx.lineTo(36, 36)
    ctx.lineTo(36 + cornerSize, 36)
    ctx.stroke()
    // Top-right
    ctx.beginPath()
    ctx.moveTo(W - 36 - cornerSize, 36)
    ctx.lineTo(W - 36, 36)
    ctx.lineTo(W - 36, 36 + cornerSize)
    ctx.stroke()
    // Bottom-left
    ctx.beginPath()
    ctx.moveTo(36, H - 36 - cornerSize)
    ctx.lineTo(36, H - 36)
    ctx.lineTo(36 + cornerSize, H - 36)
    ctx.stroke()
    // Bottom-right
    ctx.beginPath()
    ctx.moveTo(W - 36 - cornerSize, H - 36)
    ctx.lineTo(W - 36, H - 36)
    ctx.lineTo(W - 36, H - 36 - cornerSize)
    ctx.stroke()

    // 2. Club Header
    let curY = isStory ? 120 : 80
    ctx.textAlign = 'center'

    if (clubLogo) {
      try {
        const logoImg = new window.Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.src = clubLogo
        await new Promise((resolve) => {
          logoImg.onload = resolve
          logoImg.onerror = resolve
        })
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const logoSize = 64
          ctx.drawImage(logoImg, W / 2 - logoSize / 2, curY, logoSize, logoSize)
          curY += 75
        }
      } catch {}
    }

    // Club Name
    ctx.font = 'bold 38px "Barlow", sans-serif'
    ctx.fillStyle = '#C9A84C'
    ctx.fillText(clubName.toUpperCase(), W / 2, curY)

    curY += 46
    ctx.font = '800 52px "Bebas Neue", "Barlow Condensed", sans-serif'
    ctx.fillStyle = '#ffffff'
    const mainTitle = mode === 'nomina' ? 'CONVOCATORIA OFICIAL' : 'RESULTADO FINAL'
    ctx.fillText(mainTitle, W / 2, curY)

    // Event title / info pill
    curY += 44
    ctx.font = '600 24px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(240, 230, 208, 0.75)'
    const detailsText = [
      eventTitle,
      eventDate ? `• ${eventDate}` : null,
      eventLocation ? `• ${eventLocation}` : null,
    ]
      .filter(Boolean)
      .join(' ')
    ctx.fillText(detailsText, W / 2, curY)

    // Divider bar
    curY += 30
    const divGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0)
    divGrad.addColorStop(0, 'rgba(201, 168, 76, 0)')
    divGrad.addColorStop(0.5, '#C9A84C')
    divGrad.addColorStop(1, 'rgba(201, 168, 76, 0)')
    ctx.fillStyle = divGrad
    ctx.fillRect(W / 2 - 220, curY, 440, 3)

    // 3. Render specific mode content
    if (mode === 'resultado') {
      // --- RESULT MODE ---
      curY += isStory ? 90 : 60

      const score1 = team1?.score ?? 0
      const score2 = team2?.score ?? 0

      // Match Scoreboard Center Box
      const boxW = 860
      const boxH = isStory ? 230 : 190
      const boxX = (W - boxW) / 2
      const boxY = curY

      ctx.fillStyle = 'rgba(34, 14, 21, 0.85)'
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxW, boxH, 24)
      ctx.fill()
      ctx.stroke()

      // Team 1 Name & Score
      ctx.textAlign = 'center'
      ctx.font = 'bold 36px "Barlow", sans-serif'
      ctx.fillStyle = '#f0e6d0'
      ctx.fillText(team1?.name?.toUpperCase() || 'EQUIPO A', boxX + boxW * 0.25, boxY + 65)

      ctx.font = '900 110px "Bebas Neue", sans-serif'
      ctx.fillStyle = '#C9A84C'
      ctx.fillText(String(score1), boxX + boxW * 0.25, boxY + boxH - 45)

      // VS
      ctx.font = 'bold 30px "Barlow Condensed", sans-serif'
      ctx.fillStyle = 'rgba(201, 168, 76, 0.6)'
      ctx.fillText('VS', W / 2, boxY + boxH / 2 + 10)

      // Team 2 Name & Score
      ctx.font = 'bold 36px "Barlow", sans-serif'
      ctx.fillStyle = '#f0e6d0'
      ctx.fillText(team2?.name?.toUpperCase() || 'EQUIPO B', boxX + boxW * 0.75, boxY + 65)

      ctx.font = '900 110px "Bebas Neue", sans-serif'
      ctx.fillStyle = '#C9A84C'
      ctx.fillText(String(score2), boxX + boxW * 0.75, boxY + boxH - 45)

      // Goals Breakdown Card
      curY += boxH + (isStory ? 60 : 35)

      const scorersT1 = (team1?.players || []).filter((p) => (p.goals || 0) > 0)
      const scorersT2 = (team2?.players || []).filter((p) => (p.goals || 0) > 0)

      const scorCardW = 860
      const scorCardH = isStory ? 600 : 380
      const scorCardX = (W - scorCardW) / 2

      ctx.fillStyle = 'rgba(20, 7, 12, 0.75)'
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(scorCardX, curY, scorCardW, scorCardH, 20)
      ctx.fill()
      ctx.stroke()

      // Header inside card
      ctx.font = 'bold 24px "Barlow Condensed", sans-serif'
      ctx.fillStyle = '#C9A84C'
      ctx.fillText('⚽ GOLEADORES DEL PARTIDO', W / 2, curY + 45)

      let listY = curY + 95

      // Left Column: Team 1 Scorers
      ctx.textAlign = 'left'
      ctx.font = '600 22px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(240, 230, 208, 0.9)'

      if (scorersT1.length > 0) {
        scorersT1.forEach((p) => {
          ctx.fillText(`• ${p.fullName}: ${p.goals} gol(es)`, scorCardX + 45, listY)
          listY += 36
        })
      } else {
        ctx.fillStyle = 'rgba(240, 230, 208, 0.4)'
        ctx.fillText(`• ${team1?.name}: Sin goles`, scorCardX + 45, listY)
      }

      // Right Column: Team 2 Scorers
      listY = curY + 95
      ctx.fillStyle = 'rgba(240, 230, 208, 0.9)'
      if (scorersT2.length > 0) {
        scorersT2.forEach((p) => {
          ctx.fillText(`• ${p.fullName}: ${p.goals} gol(es)`, scorCardX + scorCardW / 2 + 30, listY)
          listY += 36
        })
      } else {
        ctx.fillStyle = 'rgba(240, 230, 208, 0.4)'
        ctx.fillText(`• ${team2?.name}: Sin goles`, scorCardX + scorCardW / 2 + 30, listY)
      }
    } else {
      // --- NOMINA (LINEUP) MODE ---
      curY += isStory ? 60 : 35

      const colW = 440
      const colH = isStory ? 1220 : 660
      const gap = 36
      const startX = (W - (colW * 2 + gap)) / 2

      // Team 1 Column
      ctx.fillStyle = 'rgba(34, 14, 21, 0.8)'
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(startX, curY, colW, colH, 20)
      ctx.fill()
      ctx.stroke()

      // Header Team 1
      ctx.textAlign = 'center'
      ctx.font = 'bold 30px "Barlow", sans-serif'
      ctx.fillStyle = '#C9A84C'
      ctx.fillText(team1?.name?.toUpperCase() || 'EQUIPO 1', startX + colW / 2, curY + 50)

      let pY = curY + 100
      ctx.textAlign = 'left'
      ;(team1?.players || []).forEach((p, i) => {
        if (pY > curY + colH - 40) return
        ctx.font = 'bold 22px "Barlow Condensed", sans-serif'
        ctx.fillStyle = 'rgba(201, 168, 76, 0.8)'
        ctx.fillText(`${i + 1}.`, startX + 30, pY)

        ctx.font = '600 22px "Barlow", sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(p.fullName, startX + 65, pY)

        ctx.font = 'italic 16px "Barlow", sans-serif'
        ctx.fillStyle = 'rgba(240, 230, 208, 0.5)'
        ctx.fillText(p.position || 'Jugador', startX + colW - 130, pY)

        pY += isStory ? 52 : 38
      })

      // Team 2 Column
      const startX2 = startX + colW + gap
      ctx.fillStyle = 'rgba(34, 14, 21, 0.8)'
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(startX2, curY, colW, colH, 20)
      ctx.fill()
      ctx.stroke()

      // Header Team 2
      ctx.textAlign = 'center'
      ctx.font = 'bold 30px "Barlow", sans-serif'
      ctx.fillStyle = '#C9A84C'
      ctx.fillText(team2?.name?.toUpperCase() || 'EQUIPO 2', startX2 + colW / 2, curY + 50)

      pY = curY + 100
      ctx.textAlign = 'left'
      ;(team2?.players || []).forEach((p, i) => {
        if (pY > curY + colH - 40) return
        ctx.font = 'bold 22px "Barlow Condensed", sans-serif'
        ctx.fillStyle = 'rgba(201, 168, 76, 0.8)'
        ctx.fillText(`${i + 1}.`, startX2 + 30, pY)

        ctx.font = '600 22px "Barlow", sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(p.fullName, startX2 + 65, pY)

        ctx.font = 'italic 16px "Barlow", sans-serif'
        ctx.fillStyle = 'rgba(240, 230, 208, 0.5)'
        ctx.fillText(p.position || 'Jugador', startX2 + colW - 130, pY)

        pY += isStory ? 52 : 38
      })
    }

    // 4. Footer Branding & Mantra
    ctx.textAlign = 'center'
    ctx.font = 'bold 22px "Barlow Condensed", sans-serif'
    ctx.fillStyle = 'rgba(201, 168, 76, 0.7)'
    ctx.fillText('★ NADIE ES MÁS QUE EL CLUB ★', W / 2, H - 75)

    ctx.font = '14px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(240, 230, 208, 0.35)'
    ctx.fillText('CampApp • Gestión Oficial de Clubes', W / 2, H - 50)

    setIsGenerating(false)
  }, [clubLogo, clubName, eventDate, eventLocation, eventTitle, format, mode, team1, team2])

  // Re-draw when options change or modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        drawGraphic()
      }, 80)
    }
  }, [isOpen, drawGraphic])

  // Download image
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const safeTitle = eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')
    link.download = `${mode}-${safeTitle}-${format}.png`
    link.href = dataUrl
    link.click()
  }

  // Web Share API
  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `${mode}-${format}.png`, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: eventTitle,
            text: `${clubName} — ${mode === 'nomina' ? 'Convocatoria Oficial' : 'Resultado Final'}`,
            files: [file],
          })
          return
        } catch {}
      }

      // Fallback: download
      handleDownload()
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center sm:p-4">
      <div className="bg-neutral-950 border-2 border-neutral-800 text-white w-full sm:max-w-2xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl shadow-tactile flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
              📸
            </span>
            <div>
              <h2 className="font-display font-bold text-base uppercase tracking-tight text-white">
                Generador de Gráficas
              </h2>
              <p className="font-mono text-[10px] text-neutral-400">
                Instagram Stories & Feed PNG
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option Toggles */}
        <div className="p-3 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setMode('nomina')}
              className={`py-1 px-3 rounded-lg font-display font-bold text-xs uppercase flex items-center gap-1.5 transition ${
                mode === 'nomina'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Nómina</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('resultado')}
              className={`py-1 px-3 rounded-lg font-display font-bold text-xs uppercase flex items-center gap-1.5 transition ${
                mode === 'resultado'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Resultado</span>
            </button>
          </div>

          {/* Format Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setFormat('story')}
              className={`py-1 px-3 rounded-lg font-mono text-[11px] font-bold uppercase transition ${
                format === 'story'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Story 9:16
            </button>
            <button
              type="button"
              onClick={() => setFormat('feed')}
              className={`py-1 px-3 rounded-lg font-mono text-[11px] font-bold uppercase transition ${
                format === 'feed'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Post 1:1
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-neutral-950/80 min-h-[300px]">
          <div className="relative max-h-[50vh] sm:max-h-[58vh] flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-neutral-800">
            <canvas
              ref={canvasRef}
              className="max-h-[50vh] sm:max-h-[58vh] w-auto h-auto object-contain block rounded-2xl"
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-neutral-400 hidden sm:block">
            Resolución: {format === 'story' ? '1080 × 1920 px' : '1080 × 1080 px'}
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-neutral-700 transition active:scale-95"
            >
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition active:scale-95 shadow-tactile-sm"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
