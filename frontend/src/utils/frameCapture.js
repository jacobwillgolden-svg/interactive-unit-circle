/**
 * Capture an SVG or canvas node as a JPEG data URL for Grok 4.6 image input.
 */

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.82

function dataUrlSize(url) {
  return url ? url.length : 0
}

export function captureNode(node, { maxEdge = MAX_EDGE } = {}) {
  if (!node) return Promise.resolve(null)
  if (node.tagName === 'CANVAS') {
    return Promise.resolve(canvasToJpeg(node, maxEdge))
  }
  if (node.tagName === 'svg' || node.ownerSVGElement || node.namespaceURI?.includes('svg')) {
    return svgToJpeg(node.tagName === 'svg' ? node : node.ownerSVGElement || node, maxEdge)
  }
  return Promise.resolve(null)
}

export function captureFirst(selectors) {
  if (typeof document === 'undefined') return Promise.resolve(null)
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) return captureNode(el)
  }
  return Promise.resolve(null)
}

function canvasToJpeg(canvas, maxEdge) {
  const w = canvas.width || canvas.clientWidth
  const h = canvas.height || canvas.clientHeight
  if (!w || !h) return null
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const ctx = out.getContext('2d')
  ctx.fillStyle = readBg()
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(canvas, 0, 0, cw, ch)
  return out.toDataURL('image/jpeg', JPEG_QUALITY)
}

function readBg() {
  if (typeof document === 'undefined') return '#07080c'
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'light' ? '#f4f1ea' : '#07080c'
}

function svgToJpeg(svg, maxEdge) {
  return new Promise((resolve) => {
    try {
      const clone = svg.cloneNode(true)
      if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }
      const vb = svg.viewBox?.baseVal
      const w = vb?.width || svg.clientWidth || 720
      const h = vb?.height || svg.clientHeight || 520
      clone.setAttribute('width', String(w))
      clone.setAttribute('height', String(h))
      const xml = new XMLSerializer().serializeToString(clone)
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(w, h))
        const cw = Math.max(1, Math.round(w * scale))
        const ch = Math.max(1, Math.round(h * scale))
        const canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = readBg()
        ctx.fillRect(0, 0, cw, ch)
        ctx.drawImage(img, 0, 0, cw, ch)
        URL.revokeObjectURL(url)
        const data = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(dataUrlSize(data) > 80 ? data : null)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    } catch {
      resolve(null)
    }
  })
}

export async function fileToDataUrl(file, { maxEdge = MAX_EDGE } = {}) {
  if (!file) return null
  const raw = await readFileAsDataUrl(file)
  if (!raw) return null
  if (!raw.startsWith('data:image')) return raw
  return downscaleDataUrl(raw, maxEdge)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

function downscaleDataUrl(dataUrl, maxEdge) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      if (scale >= 0.98 && dataUrl.length < 900_000) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
