import { useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Left: text timeline with a continuous rail + traveling glow playhead.
 * Right: fixed, column-centered portrait + formula slides (crossfade by era).
 *
 * Performance notes:
 * - Portrait panel position via direct DOM style (no setState on scroll)
 * - Playhead via transform on rAF
 * - Active era state only when the index changes
 */

const EVENTS = [
  {
    year: 'c. 570–495 BCE',
    title: 'Number, ratio, and the Pythagorean school',
    figure: 'Pythagoras of Samos',
    centralFigure: 'Pythagoras',
    portrait: '/portraits/pythagoras.jpg',
    latex: String.raw`a^{2} + b^{2} = c^{2}`,
    formulaNote: 'Ratio · harmony · the right triangle',
    body: `The Pythagoreans treated number as the key to nature: ratios of string lengths, harmonic intervals, and geometric figures. The theorem that still bears Pythagoras’s name — relating the sides of a right triangle — is only the most famous piece of a broader program. By insisting that magnitudes can be compared through proportion, they made continuous quantity thinkable as something structured, not merely drawn. Later calculus would need exactly that: a language for relating changing lengths, areas, and rates.`,
  },
  {
    year: 'c. 300 BCE',
    title: 'Euclid’s Elements as the template',
    figure: 'Euclid of Alexandria',
    centralFigure: 'Euclid',
    portrait: null,
    latex: String.raw`\text{Elements} \;\vdash\; \text{geometry}`,
    formulaNote: 'Axioms · deduction · the classical standard',
    body: `Euclid’s Elements organized geometry into definitions, postulates, and theorems — the gold standard of mathematical writing for centuries. Book XII preserves exhaustion arguments for circles, pyramids, and cones. Anyone who later wanted to prove a result about areas or tangents was writing in Euclid’s shadow: start from clear assumptions, proceed by deduction, and treat diagrams as controlled objects. Analytic geometry and calculus would eventually loosen the purely geometric frame, but they inherited Euclid’s demand for structure.`,
  },
  {
    year: 'c. 276–194 BCE',
    title: 'Measuring the Earth and sieving primes',
    figure: 'Eratosthenes of Cyrene',
    centralFigure: 'Eratosthenes of Cyrene',
    portrait: '/portraits/eratosthenes.png',
    diagram: '/portraits/eratosthenes-diagram.jpg',
    diagramAlt:
      'Eratosthenes’ measurement of Earth: sunlight at Alexandria and Syene, 7.2° shadow angle, well at Syene',
    latex: String.raw`C = 2\pi r \quad\cdot\quad \text{sieve}`,
    formulaNote: 'Circumference · latitude · prime numbers',
    body: `Eratosthenes of Cyrene, chief librarian at Alexandria, estimated the circumference of the Earth from the angle of the noonday sun at two cities a known distance apart — geometry applied to a curved world. He also devised the sieve that still bears his name: strike out multiples to leave the primes. His work fused measurement, astronomy, and pure number. Like the exhaustion methods of his age, it treated continuous magnitude and discrete counting as tools that could be made precise — a spirit calculus would later inherit when rates and totals became calculable.`,
  },
  {
    year: 'c. 250 BCE',
    title: 'Archimedes & the method of exhaustion',
    figure: 'Archimedes of Syracuse',
    centralFigure: 'Archimedes',
    portrait: '/portraits/archimedes.jfif',
    latex: String.raw`A = \lim_{n \to \infty} A_n`,
    formulaNote: 'Exhaustion · areas by refinement',
    body: `Long before “calculus” had a name, Archimedes computed areas and volumes by squeezing curved shapes between polygons that got finer and finer — the method of exhaustion. He found the area of a parabolic segment, bounds on π, and volumes of spheres and cylinders with astonishing precision. In a private “Method,” he also used mechanical thought-experiments with infinitesimals, then re-proved results rigorously. These ideas foreshadow integration: infinite refinement of finite approximations, plus a hunger for exact theorems about curves.`,
  },
  {
    year: '14th–16th c.',
    title: 'Medieval & Renaissance precursors',
    figure: 'Oresme · Kepler · Cavalieri',
    centralFigure: 'Johannes Kepler',
    portrait: '/portraits/kepler.jfif',
    latex: String.raw`\sum \text{indivisibles}`,
    formulaNote: 'Areas as sums of thin slices',
    body: `Nicole Oresme studied rates of change graphically, sketching how a quality might vary over time — a visual cousin of a function. Kepler estimated volumes of solids of revolution (including wine barrels) with clever slicing. Bonaventura Cavalieri’s “indivisibles” treated areas as sums of infinitely thin lines — controversial among purists, but a bold step toward integration. Across these centuries the Greek ideal of exhaustion met a more freewheeling European appetite for calculation. The stage was set for a systematic language of change.`,
  },
  {
    year: '1637',
    title: 'Analytic geometry',
    figure: 'René Descartes',
    centralFigure: 'René Descartes',
    portrait: '/portraits/descartes.jpg',
    latex: String.raw`y = f(x)`,
    formulaNote: 'Curves as equations · coordinates',
    body: `Descartes united algebra and geometry: curves became equations in coordinates, and geometric problems could be attacked with symbols. Without the Cartesian plane, the later idea of a derivative as the slope of a tangent would have been far harder to formalize. Analytic geometry is the canvas on which differentiation is painted — each point a pair of numbers, each curve a relation waiting for a rate of change. Fermat and others worked in the same spirit; together they moved mathematics from pure figure to figure-plus-formula.`,
  },
  {
    year: 'c. 1630s–1660s',
    title: 'Tangents, maxima, and “adequality”',
    figure: 'Pierre de Fermat',
    centralFigure: 'Pierre de Fermat',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Pierre_de_Fermat.jpg/320px-Pierre_de_Fermat.jpg',
    latex: String.raw`\frac{\Delta y}{\Delta x} \;\to\; \text{slope}`,
    formulaNote: 'Maxima · minima · tangents',
    body: `Fermat developed methods to find maxima, minima, and tangents by comparing nearby values of a function — close in spirit to taking a difference quotient and discarding higher-order terms. His “adequality” looked informal by later standards, yet it captured the core maneuver of differential calculus: study an increment, cancel what vanishes, and read off a slope or extremum. He did not publish a full calculus, but his techniques influenced everyone who followed, including Newton’s circle and the continental geometers.`,
  },
  {
    year: '1660s',
    title: 'Barrow and the fundamental link',
    figure: 'Isaac Barrow',
    centralFigure: 'Isaac Barrow',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Isaac_Barrow_by_Claude_Lefebvre.jpg/320px-Isaac_Barrow_by_Claude_Lefebvre.jpg',
    latex: String.raw`\displaystyle \frac{d}{dx}\int_a^x f(t)\,dt = f(x)`,
    formulaNote: 'Area and tangent as inverses',
    body: `Isaac Barrow, Newton’s teacher at Cambridge, proved results connecting the area under a curve to the tangent problem — a geometric form of what we now call the Fundamental Theorem of Calculus. In lectures and diagrams he showed that differentiation and integration are two faces of one relationship. He passed the Lucasian chair to Newton in 1669, handing on both a post and a cluster of ideas ripe for a more algebraic, algorithmic treatment.`,
  },
  {
    year: '1665–1666',
    title: 'The method of fluxions',
    figure: 'Isaac Newton',
    centralFigure: 'Isaac Newton',
    portrait: '/portraits/newton.jpg',
    highlight: true,
    latex: String.raw`\dot{x} = \dfrac{dx}{dt}`,
    formulaNote: 'Fluxions · fluents · Principia',
    body: `During the plague years, Newton developed his “method of fluxions.” A fluent is a flowing quantity (like position); a fluxion is its rate of flow (like velocity) — the derivative. He connected differentiation and integration as inverse operations and used infinite series freely. Much of this stayed in manuscripts for years; a full public fluxional account came later. Newton’s calculus powered the Principia (1687) and celestial mechanics, turning instantaneous rate into the language of force, orbit, and natural philosophy.`,
  },
  {
    year: '1673–1684',
    title: 'Differentials & modern notation',
    figure: 'Gottfried Wilhelm Leibniz',
    centralFigure: 'Gottfried Wilhelm Leibniz',
    portrait: '/portraits/leibniz.jpg',
    highlight: true,
    latex: String.raw`\dfrac{dy}{dx}\quad\cdot\quad \displaystyle\int y\,dx`,
    formulaNote: 'dx, dy, ∫ — notation we still use',
    body: `Working independently in Paris and beyond, Leibniz built a calculus of differentials. He introduced the notation still used worldwide: dx, dy, and the elongated S for the integral, ∫. His 1684 paper Nova Methodus pro Maximis et Minimis was the first published account of differential calculus. Clear rules and symbols made the subject teachable and extensible across Europe — a deliberate design for a “universal characteristic” of thought, not only a private computing trick.`,
  },
  {
    year: '1690s–1710s',
    title: 'The priority dispute',
    figure: 'Newton · Leibniz · the Royal Society',
    centralFigure: 'Isaac Newton',
    portrait: '/portraits/newton.jpg',
    latex: String.raw`\dot{x}\;\;\longleftrightarrow\;\; \dfrac{dy}{dx}`,
    formulaNote: 'Independent invention · shared legacy',
    body: `Who invented calculus first? Newton’s ideas were earlier; Leibniz published first. Accusations of plagiarism poisoned British–Continental relations for decades and pushed English mathematics toward fluxional notation while Europe adopted differentials. Modern historians conclude they developed calculus independently, from shared problems and partial precursors. Today we keep Newton’s physical intuition and Leibniz’s notation — the best of both lineages.`,
  },
  {
    year: '1690s–1730s',
    title: 'The Bernoulli circle & l’Hôpital',
    figure: 'Jacob & Johann Bernoulli · Guillaume de l’Hôpital',
    centralFigure: 'Jacob Bernoulli',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Jakob_Bernoulli.jpg/440px-Jakob_Bernoulli.jpg',
    latex: String.raw`\lim_{x \to a}\frac{f(x)}{g(x)} = \lim_{x \to a}\frac{f'(x)}{g'(x)}`,
    formulaNote: '0/0 forms · brachistochrone',
    body: `The Bernoulli brothers advanced Leibnizian calculus, coined “integral,” and solved the brachistochrone and other variational problems that linked differentials to optimization. L’Hôpital’s textbook (1696) spread the new methods through Europe; the famous limit rule for 0/0 forms bears his name (from Johann Bernoulli’s teaching). In a generation, calculus left the notebooks of a few geniuses and entered the toolkit of working mathematicians.`,
  },
  {
    year: '18th century',
    title: 'Analysis becomes a language',
    figure: 'Leonhard Euler',
    centralFigure: 'Leonhard Euler',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Leonhard_Euler.jpg/440px-Leonhard_Euler.jpg',
    latex: String.raw`e^{ix} = \cos x + i\sin x`,
    formulaNote: 'Functions · series · constant e',
    body: `Euler made calculus the universal toolkit of science: functions, series, differential equations, and the constant e. He wrote with unmatched productivity and standardized much of modern mathematical prose — f(x), Σ, and a calm confidence that formal manipulation could reveal structure. Differentiation was no longer a niche method; it was the engine of analysis, applied to mechanics, astronomy, and pure number theory alike.`,
  },
  {
    year: '19th century',
    title: 'Rigorous foundations',
    figure: 'Cauchy · Weierstrass · Riemann',
    centralFigure: 'Augustin-Louis Cauchy',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Augustin-Louis_Cauchy_1901.jpg/440px-Augustin-Louis_Cauchy_1901.jpg',
    latex: String.raw`f'(x) = \lim_{h \to 0}\dfrac{f(x+h)-f(x)}{h}`,
    formulaNote: 'ε–δ limits · rigorous derivative',
    body: `Critics had long worried about “ghosts of departed quantities” (Berkeley’s jab at infinitesimals). Cauchy, Weierstrass, and others rebuilt limits, derivatives, and continuity with ε–δ precision. Riemann refined integration. Differentiation gained a rock-solid definition: the limit of a difference quotient, when it exists. The computational power of the 17th century finally rested on foundations the Greeks might have recognized as careful exhaustion — written in modern symbols.`,
  },
  {
    year: '20th century →',
    title: 'Beyond the classical derivative',
    figure: 'Lebesgue · distributions · computers',
    centralFigure: 'Henri Lebesgue',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Lebesgue.jpg/440px-Lebesgue.jpg',
    latex: String.raw`\nabla f \;\cdot\; \text{AD}`,
    formulaNote: 'Weak derivatives · automatic differentiation',
    body: `Lebesgue integration, weak derivatives, and distribution theory extended calculus to rougher functions that classical pointwise derivatives cannot handle. Automatic differentiation and numerical methods put derivatives inside every physics engine and machine-learning stack. The idea Newton and Leibniz crystallized — measuring instantaneous change — still runs the modern world, from orbital mechanics to backprop. The Greek questions about infinity, proportion, and continuous magnitude never really left; they only changed notation.`,
  },
]

/** px of focus-line stickiness before switching eras */
const ACTIVE_HYSTERESIS_PX = 48

function renderLatex(tex) {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: true,
      output: 'html',
      strict: 'ignore',
    })
  } catch {
    return tex
  }
}

function EraSlide({ event, active }) {
  const [imgOk, setImgOk] = useState(true)
  const name = event.centralFigure || event.figure

  return (
    <div className={`hist-slide${active ? ' is-active' : ''}`} aria-hidden={!active}>
      {event.portrait && imgOk ? (
        <img
          className="hist-slide-photo"
          src={event.portrait}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="hist-slide-photo hist-slide-photo--placeholder" aria-hidden="true">
          <span>{name.trim().slice(0, 1)}</span>
        </div>
      )}
      <p className="hist-slide-name">{name}</p>
      <p className="hist-slide-year">{event.year}</p>
      <div
        className="hist-slide-katex"
        dangerouslySetInnerHTML={{ __html: renderLatex(event.latex) }}
      />
      <p className="hist-slide-note">{event.formulaNote}</p>
    </div>
  )
}

/**
 * Playhead lives on the *current* rail segment only:
 * - past markers are filled; past rail is solid (no glow)
 * - arriving at a person fills that circle; glow starts from there
 * - as you scroll that era, the glow travels down toward the next marker
 */
function computeScrollState(nodes, trackEl, currentActive, focusY) {
  if (!nodes.length || !trackEl) {
    return { active: 0, playheadY: 0, pastH: 0, glowTop: 0, glowH: 0 }
  }

  const trackRect = trackEl.getBoundingClientRect()

  // Measure actual dot centers so the playhead seats in each empty circle
  const centers = nodes.map((n) => {
    const dot = n.querySelector('.tl-dot')
    const r = (dot || n).getBoundingClientRect()
    return r.top + r.height / 2 - trackRect.top
  })

  // Active = last era whose card top has crossed the focus line
  let candidate = 0
  for (let i = 0; i < nodes.length; i++) {
    const top = nodes[i].getBoundingClientRect().top
    if (top <= focusY) candidate = i
    else break
  }

  let active = candidate
  if (candidate !== currentActive) {
    const currentNode = nodes[currentActive]
    if (currentNode) {
      const currentTop = currentNode.getBoundingClientRect().top
      if (Math.abs(currentTop - focusY) < ACTIVE_HYSTERESIS_PX) {
        active = currentActive
      }
    }
  }

  const first = centers[0]
  const a = centers[active]
  let playheadY = a

  if (active < centers.length - 1) {
    const b = centers[active + 1]
    const topA = nodes[active].getBoundingClientRect().top
    const topB = nodes[active + 1].getBoundingClientRect().top
    const span = Math.max(1, topB - topA)
    // How far through this era’s card → next era
    const t = Math.min(1, Math.max(0, (focusY - topA) / span))
    playheadY = a + t * (b - a)
  }

  // Past rail: solid *from the first marker* to the active marker only.
  // Do not paint from y=0 — that looked like a fake segment above Pythagoras
  // (intro copy is outside the track, but the first dot sits below track top).
  const pastTop = first
  const pastH = active > 0 ? Math.max(0, a - first) : 0
  // Glow only on the active segment: from filled circle down to playhead
  const glowTop = a
  const glowH = Math.max(0, playheadY - a)
  // Dim base line only spans first → last marker (no stub above Pythagoras)
  const lineTop = first
  const lineH = Math.max(0, centers[centers.length - 1] - first)

  return { active, playheadY, pastTop, pastH, glowTop, glowH, lineTop, lineH }
}

export default function HistoryPage() {
  const [active, setActive] = useState(0)
  const itemRefs = useRef([])
  const activeRef = useRef(0)
  const rafRef = useRef(0)
  const slotRef = useRef(null)
  const panelRef = useRef(null)
  const trackRef = useRef(null)
  const trackLineRef = useRef(null)
  const playheadRef = useRef(null)
  const pastRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.add('hist-page')
    return () => document.documentElement.classList.remove('hist-page')
  }, [])

  useEffect(() => {
    const sync = () => {
      const nodes = itemRefs.current.filter(Boolean)
      const track = trackRef.current
      const focusY = window.innerHeight * 0.34

      // ── Playhead + active era first (need active index for portrait align)
      let activeIdx = activeRef.current
      if (nodes.length && track) {
        const {
          active: next,
          playheadY,
          pastTop,
          pastH,
          glowTop,
          glowH,
          lineTop,
          lineH,
        } = computeScrollState(nodes, track, activeRef.current, focusY)

        activeIdx = next

        const playhead = playheadRef.current
        const past = pastRef.current
        const glow = glowRef.current
        const line = trackLineRef.current
        if (playhead) {
          playhead.style.transform = `translate3d(-50%, ${playheadY}px, 0)`
        }
        if (past) {
          past.style.top = `${pastTop}px`
          past.style.height = `${pastH}px`
        }
        if (glow) {
          glow.style.top = `${glowTop}px`
          glow.style.height = `${glowH}px`
        }
        if (line) {
          line.style.top = `${lineTop}px`
          line.style.height = `${lineH}px`
          line.style.bottom = 'auto'
        }

        if (next !== activeRef.current) {
          activeRef.current = next
          setActive(next)
        }
      }

      // ── Fixed portrait column: column-centered + vertically centered on active card
      const slot = slotRef.current
      const panel = panelRef.current
      if (slot && panel) {
        const r = slot.getBoundingClientRect()
        panel.style.position = 'fixed'
        panel.style.left = `${r.left}px`
        panel.style.width = `${r.width}px`
        panel.style.right = 'auto'

        const activeNode = nodes[activeIdx]
        const card = activeNode?.querySelector('.tl-card') || activeNode
        const panelH = panel.offsetHeight || 420
        // Stay under nav / Span card; keep fully on-screen
        const minTop = 6.5 * 16
        const maxTop = Math.max(minTop, window.innerHeight - panelH - 16)

        if (card) {
          const cardRect = card.getBoundingClientRect()
          const cardMid = cardRect.top + cardRect.height / 2
          let top = cardMid - panelH / 2
          top = Math.max(minTop, Math.min(maxTop, top))
          panel.style.top = `${top}px`
        } else {
          panel.style.top = `${minTop}px`
        }
      }
    }

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(sync)
    }

    sync()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScrollOrResize) : null
    if (ro && slotRef.current) ro.observe(slotRef.current)
    if (ro && trackRef.current) ro.observe(trackRef.current)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      ro?.disconnect()
    }
  }, [])

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">History of mathematics</p>
          <h1>
            A timeline of <em>calculus</em>
          </h1>
          <p className="hero-copy">
            Scroll the story on the left — the glow travels the rail. Portraits and formulas on the
            right stay fixed and fade with each era.
          </p>
          {/* Intro lives in the hero so it never sits above the first rail marker
              (that orphan block was throwing off Pythagoras’s circle). */}
          <p className="tl-intro">
            <strong>Differentiation</strong> asks: how fast does something change at an instant?
            The answer grew slowly — from Greek ratio and exhaustion, through coordinates, to
            systematic rules for slopes and areas. Isaac Newton and Gottfried Wilhelm Leibniz
            independently forged calculus in the 17th century; centuries of precursors and
            successors made it rigorous and universal.
          </p>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">Span</span>
            <div className="value" style={{ fontSize: '1.35rem' }}>
              ~2,300 yrs
            </div>
            <div className="sub">Pythagoras → modern analysis</div>
          </div>
        </div>
      </header>

      <main className="hist-layout">
        <div className="hist-left">
          <div className="timeline-wrap">
            <div className="tl-track" ref={trackRef} aria-hidden="true">
              <div className="tl-track-line" ref={trackLineRef} />
              {/* Solid completed rail — no glow once you’ve left a segment */}
              <div className="tl-track-past" ref={pastRef} />
              {/* Glow only on the active segment under the playhead */}
              <div className="tl-track-glow" ref={glowRef} />
              <div className="tl-playhead" ref={playheadRef} />
            </div>

            <ol className="timeline">
              {EVENTS.map((ev, i) => {
                const isPast = i < active
                const isActive = i === active
                return (
                  <li
                    key={ev.year + ev.title}
                    ref={(el) => {
                      itemRefs.current[i] = el
                    }}
                    data-index={i}
                    className={`tl-item${isActive ? ' is-active' : ''}${isPast ? ' is-past' : ''}${ev.highlight ? ' is-highlight' : ''}`}
                  >
                    <div className="tl-rail" aria-hidden="true">
                      <span className="tl-dot" />
                    </div>
                    <article className="tl-card">
                      <time className="tl-year">{ev.year}</time>
                      <h2 className="tl-title">{ev.title}</h2>
                      <p className="tl-figure">{ev.figure}</p>
                      <p className="tl-body">{ev.body}</p>
                      {ev.diagram && (
                        <figure className="tl-diagram">
                          <img
                            src={ev.diagram}
                            alt={ev.diagramAlt || ''}
                            loading="lazy"
                            decoding="async"
                          />
                        </figure>
                      )}
                    </article>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="tl-footnote">
            <p>
              Further reading: St Andrews History of Mathematics; Wikipedia’s{' '}
              <em>History of calculus</em> and <em>Leibniz–Newton calculus controversy</em>.
              Portraits via Wikimedia Commons and local archive.
            </p>
          </div>
        </div>

        {/* Spacer reserves the right grid column; panel is position:fixed over it */}
        <div className="hist-right-slot" ref={slotRef} aria-hidden="true" />

        <aside className="hist-right hist-right--slides" ref={panelRef} aria-live="polite">
          <div className="hist-slides">
            {EVENTS.map((ev, i) => (
              <EraSlide key={ev.year + ev.title} event={ev} active={i === active} />
            ))}
          </div>
        </aside>
      </main>
    </>
  )
}
