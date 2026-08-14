import katex from 'katex'
import 'katex/dist/katex.min.css'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderTex(src, display) {
  try {
    return katex.renderToString(src, {
      throwOnError: false,
      displayMode: display,
      output: 'html',
      strict: 'ignore',
    })
  } catch {
    return escapeHtml(src)
  }
}

function inlineMd(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
}

/**
 * Turn tutor markdown + TeX into HTML for the chat panel.
 * Speech still uses the raw string.
 */
export function tutorToHtml(raw) {
  if (!raw) return ''
  const slots = []
  const hold = (html) => {
    const i = slots.length
    slots.push(html)
    return `\u0000${i}\u0000`
  }

  let text = String(raw).replace(/\r\n/g, '\n')
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    hold(`<div class="tutor-tex tutor-tex--display">${renderTex(tex.trim(), true)}</div>`),
  )
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) =>
    hold(`<div class="tutor-tex tutor-tex--display">${renderTex(tex.trim(), true)}</div>`),
  )
  text = text.replace(/\$([^$\n]+?)\$/g, (_, tex) =>
    hold(`<span class="tutor-tex">${renderTex(tex.trim(), false)}</span>`),
  )
  text = text.replace(/\\\((.+?)\\\)/g, (_, tex) =>
    hold(`<span class="tutor-tex">${renderTex(tex.trim(), false)}</span>`),
  )

  text = escapeHtml(text)

  const lines = text.split('\n')
  const out = []
  let list = []

  const flushList = () => {
    if (!list.length) return
    out.push(`<ul>${list.map((item) => `<li>${inlineMd(item)}</li>`).join('')}</ul>`)
    list = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\u0000\d+\u0000$/.test(trimmed)) {
      flushList()
      out.push(trimmed)
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (heading) {
      flushList()
      const level = Math.min(3, heading[1].length) + 2
      out.push(`<h${level} class="tutor-h">${inlineMd(heading[2])}</h${level}>`)
      continue
    }
    const item = /^\s*(?:\*|-)(?:\s+)(.+)$/.exec(line)
    if (item) {
      list.push(item[1])
      continue
    }
    flushList()
    if (!trimmed) continue
    out.push(`<p>${inlineMd(trimmed)}</p>`)
  }
  flushList()

  return out.join('').replace(/\u0000(\d+)\u0000/g, (_, i) => slots[Number(i)] || '')
}
