import React, { useEffect, useRef, useState } from 'react'

const COLORS = ['#4ec9b0', '#569cd6', '#e5c07b', '#c586c0']

export const SerialPlotter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [series, setSeries] = useState<number[][]>([])
  const pendingLine = useRef('')
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const rowsToAdd = (chunk: string) => {
      const combined = pendingLine.current + chunk
      const lines = combined.split(/\r?\n/)
      pendingLine.current = lines.pop() || ''
      if (pendingLine.current.includes(',') && !/[,\s]$/.test(pendingLine.current)) {
        lines.push(pendingLine.current)
        pendingLine.current = ''
      }
      return lines.map((line) => line.trim()).filter(Boolean).map((line) => {
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:\s*[,;\s]\s*[+-]?(?:\d+\.?\d*|\.\d+))*$/.test(line)) return []
        return line.split(/[\s,;]+/).map(Number).filter(Number.isFinite).slice(0, 4)
      }).filter((values) => values.length > 0)
    }
    const unsubscribe = (window as any).cavallo?.onSerialData?.((chunk: string) => {
      const rows = rowsToAdd(chunk)
      if (!rows.length) return
      setSeries((current) => {
        const count = Math.min(4, Math.max(current.length, ...rows.map((row) => row.length)))
        const next = Array.from({ length: count }, (_, index) => [...(current[index] || [])])
        for (const row of rows) row.slice(0, 4).forEach((value, index) => next[index].push(value))
        return next.map((values) => values.slice(-100))
      })
    })
    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const { width, height } = canvas.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.max(1, width * scale)
    canvas.height = Math.max(1, height * scale)
    context.scale(scale, scale)
    context.clearRect(0, 0, width, height)
    context.fillStyle = '#1e1e1e'
    context.fillRect(0, 0, width, height)

    const values = series.flat()
    const min = values.length ? Math.min(...values) : 0
    const max = values.length ? Math.max(...values) : 1
    const range = max - min || 1
    context.strokeStyle = '#3c3c3c'
    context.lineWidth = 1
    for (let row = 1; row < 5; row++) {
      const y = (height * row) / 5
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke()
    }
    series.forEach((line, index) => {
      if (line.length < 2) return
      context.strokeStyle = COLORS[index]
      context.lineWidth = 2
      context.beginPath()
      line.forEach((value, point) => {
        const x = (point / 99) * width
        const y = height - ((value - min) / range) * (height - 12) - 6
        if (point === 0) context.moveTo(x, y); else context.lineTo(x, y)
      })
      context.stroke()
    })
  }, [series, canvasSize])

  return <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#1e1e1e', color: '#ccc' }}>
    <div style={{ display: 'flex', gap: 14, padding: '6px 10px', background: '#252526', fontSize: 11 }}>
      {series.map((_, index) => <span key={index} style={{ color: COLORS[index] }}>● Value {index + 1}</span>)}
      {!series.length && <span style={{ color: '#888' }}>Waiting for comma or newline separated numeric serial data…</span>}
    </div>
    <canvas ref={canvasRef} style={{ flex: 1, width: '100%', minHeight: 0 }} />
  </div>
}
