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
    year: 'c. 624–546 BCE',
    title: 'Thales of Miletus — geometry before proofs had a name',
    figure: 'Thales of Miletus',
    centralFigure: 'Thales of Miletus',
    portrait: '/portraits/thales.jpg',
    portraitPullBack: true,
    latex: String.raw`x^{2}=(\pi r)\cdot r=\pi r^{2}`,
    formulaNote: 'Semicircle · right angle · geometric mean',
    body: `Thales of Miletus is often called the first Greek philosopher and one of the first people history remembers for treating geometry as something you can reason about, not only measure with a rope. He lived on the Ionian coast (today’s Turkey), traded and traveled — stories say he predicted an eclipse, cornered the olive-press market after a good harvest forecast, and fell into a well while staring at the stars. In math his name sticks to Thales’ theorem: an angle inscribed in a semicircle is a right angle. From that right triangle comes the altitude rule used on the Cheat Sheet — if a diameter is split into segments a and b, the altitude x to the diameter satisfies x² = a·b. Choosing a = πr and b = r gives x² = πr², so a square of side x has the same area as a circle of radius r. Before Euclid’s axioms and long before calculus, Thales’ generation was already asking: what must be true of shapes, not just what looks true?`,
  },
  {
    year: 'c. 570–495 BCE',
    title: 'Number, ratio, and the Pythagorean school',
    figure: 'Pythagoras of Samos',
    centralFigure: 'Pythagoras',
    portrait: '/portraits/pythagoras.jpg',
    latex: String.raw`a^{2} + b^{2} = c^{2}`,
    formulaNote: 'Ratio · harmony · the right triangle',
    body: `Pythagoras ran what was basically a secret math cult: members shared property, kept vows of silence, and treated numbers as holy. Legend says they forbade eating beans, and that he discovered musical harmony by listening to blacksmiths’ hammers. The famous right-triangle theorem is only the best-known piece of a bigger idea — that ratios and proportions can describe the world. Calculus later needs that same habit: comparing changing lengths and rates, not just drawing pretty pictures. (Thales’ right angle in a semicircle is an older cousin of the same right-triangle instinct.)`,
  },
  {
    year: 'c. 300 BCE',
    title: 'Euclid’s Elements as the template',
    figure: 'Euclid of Alexandria',
    centralFigure: 'Euclid',
    portrait: '/portraits/euclid.jpg',
    portraitPullBack: true,
    latex: String.raw`\text{Elements} \;\vdash\; \text{geometry}`,
    formulaNote: 'Axioms · deduction · the classical standard',
    body: `Almost nothing is known about Euclid the person — he is mostly a name attached to a masterpiece. One old story says a student asked what geometry was “good for,” and Euclid told a servant to give the boy a coin, “since he must make a profit from learning.” His Elements built geometry from clear starting rules and careful proofs. Later calculus writers still followed that style: state what you assume, then deduce. Book XII even squeezes areas of circles with finer and finer shapes — a cousin of ideas calculus would formalize.`,
  },
  {
    year: 'c. 276–194 BCE',
    title: 'Measuring the Earth and sieving primes',
    figure: 'Eratosthenes of Cyrene',
    centralFigure: 'Eratosthenes of Cyrene',
    portrait: '/portraits/eratosthenes.jpg',
    diagram: '/portraits/eratosthenes-diagram.jpg',
    diagramAlt:
      'Eratosthenes’ measurement of Earth: sunlight at Alexandria and Syene, 7.2° shadow angle, well at Syene',
    latex: String.raw`C = 2\pi r \quad\cdot\quad \text{sieve}`,
    formulaNote: 'Circumference · latitude · prime numbers',
    body: `Eratosthenes ran the great library at Alexandria and was nicknamed “Beta” — second-best at everything — and also “Pentathlos,” a five-event all-rounder. With a stick’s shadow in one city and a deep well in another, he estimated the size of the whole Earth, shockingly well for the age. He also invented the prime-number “sieve”: cross out multiples until only primes remain. He mixed measurement, maps, and pure number — the same mix calculus would use when rates and totals had to become precise.`,
  },
  {
    year: 'c. 250 BCE',
    title: 'Archimedes & the method of exhaustion',
    figure: 'Archimedes of Syracuse',
    centralFigure: 'Archimedes',
    portrait: '/portraits/archimedes.jpg',
    portraitPullBack: true,
    latex: String.raw`A = \lim_{n \to \infty} A_n`,
    formulaNote: 'Exhaustion · areas by refinement',
    body: `Archimedes is the “Eureka!” guy who (story goes) jumped from his bath and ran naked through Syracuse after spotting a density trick for a king’s crown. He also built wild war machines and, when a Roman soldier finally killed him, was supposedly still drawing figures in the sand and snapping, “Do not disturb my circles.” Long before calculus had a name, he squeezed curved areas between shapes that got finer and finer — and in a private notebook played with “tiny bits” of area, then re-proved results carefully. That double move is pure calculus spirit: invent freely, then make it solid.`,
  },
  {
    year: '14th–16th c.',
    title: 'Medieval & Renaissance precursors',
    figure: 'Oresme · Kepler · Cavalieri',
    centralFigure: 'Johannes Kepler',
    portrait: '/portraits/kepler.jfif',
    latex: String.raw`\sum \text{indivisibles}`,
    formulaNote: 'Areas as sums of thin slices',
    body: `Kepler’s life was messy: poverty, war, and a mother accused of witchcraft whom he spent years defending in court. Between crises he tracked the planets into ellipses and even wrote a booklet on the best way to measure wine barrels. Nicole Oresme had earlier sketched how a quantity might change over time — like a hand-drawn graph. Cavalieri treated areas as stacks of infinitely thin slices, which shocked purists. Together they pushed Europe toward a freer language of change, ready for a real calculus.`,
  },
  {
    year: '1637',
    title: 'Analytic geometry',
    figure: 'René Descartes',
    centralFigure: 'René Descartes',
    portrait: '/portraits/descartes.jpg',
    latex: String.raw`y = f(x)`,
    formulaNote: 'Curves as equations · coordinates',
    body: `Descartes loved to sleep in — he claimed his best thinking happened in a warm bed until noon. As a young man he soldiered around Europe; as a philosopher he built everything on “I think, therefore I am.” He died after harsh early-morning lessons for Queen Christina of Sweden in a freezing palace. In math he glued algebra to geometry: curves became equations on a plane. Without that grid, “slope of a tangent” would be much harder to say. The Cartesian plane is still the stage where derivatives play.`,
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
    body: `By day Fermat was a lawyer and judge in Toulouse; math was his after-hours obsession. He hated publishing polished books, preferring clever letters and notes in margins — including the famous claim of a “marvelous proof” for what we now call Fermat’s Last Theorem (which took centuries to finish properly). His tricks for maxima, minima, and tangents already smelled like derivatives: compare nearby values, drop what vanishes, read off a slope. Newton’s generation studied those moves carefully.`,
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
    body: `Isaac Barrow was a preacher as well as a mathematician — known for sharp sermons and sharper geometry lectures. He held the first Lucasian chair at Cambridge, then stepped aside in 1669 so his extraordinary student Isaac Newton could take it. In class he showed that finding an area under a curve and finding a tangent are inverse jobs — the heart of the Fundamental Theorem of Calculus, drawn with diagrams before it had modern symbols. He handed Newton both a title and a pile of ripe ideas.`,
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
    body: `During the plague years Newton worked in isolation and invented his “fluxions” — calculus in motion language. A fluent is something flowing (like position); a fluxion is how fast it flows (like velocity). Off the clock he was stranger still: he poured years into alchemy and into hunting secret codes and prophecies in the Bible, filling notebooks with timelines of kingdoms and hidden meanings. He later ran the Royal Mint and hounded counterfeiters. Publicly he gave the world the Principia and a calculus of force and orbit; privately he was a restless decoder of both nature and scripture.`,
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
    body: `Leibniz was a diplomat, librarian, and professional letter-writer who never married and seemed to live on correspondence. He dreamed of a “universal language” of thought and even built early calculating machines. Working independently of Newton, he invented a calculus of differentials and gave us the symbols we still teach: dx, dy, and the long S for the integral, ∫. His 1684 paper was the first published account of differential calculus. He wanted tools anyone could learn — not a private code for one genius.`,
  },
  {
    year: '1690s–1710s',
    title: 'The priority dispute',
    figure: 'Newton · Leibniz · the Royal Society',
    centralFigure: 'Isaac Newton',
    portrait: '/portraits/newton.jpg',
    latex: String.raw`\dot{x}\;\;\longleftrightarrow\;\; \dfrac{dy}{dx}`,
    formulaNote: 'Independent invention · shared legacy',
    body: `Who invented calculus first? Newton’s ideas came earlier; Leibniz published first. The fight got ugly. Newton, as president of the Royal Society, stacked a “neutral” committee that quietly ruled in his favor. Friends on both sides traded insults for decades; British math clung to Newton’s dots while Europe used Leibniz’s d’s. Historians now say they found calculus independently. We kept the best of both: Newton’s physics instincts and Leibniz’s notation. Even geniuses can be petty.`,
  },
  {
    year: '1690s–1730s',
    title: 'The Bernoulli circle & l’Hôpital',
    figure: 'Jacob & Johann Bernoulli · Guillaume de l’Hôpital',
    centralFigure: 'Jacob Bernoulli',
    portrait: '/portraits/bernoulli.jpg',
    latex: String.raw`\lim_{x \to a}\frac{f(x)}{g(x)} = \lim_{x \to a}\frac{f'(x)}{g'(x)}`,
    formulaNote: '0/0 forms · brachistochrone',
    body: `The Bernoullis were brilliant — and famously hard to live with. Brothers Jacob and Johann fought bitterly over credit; Johann later feuded with his own son Daniel over hydrodynamics. They pushed Leibniz’s calculus hard, coined the word “integral,” and posed prize challenges like the brachistochrone (the curve of fastest descent). The Marquis de l’Hôpital paid Johann for private lessons and published a textbook; the famous 0/0 limit rule still bears l’Hôpital’s name even though the ideas were largely Bernoulli’s. Calculus left the loners’ notebooks and entered the classroom — family drama and all.`,
  },
  {
    year: '18th century',
    title: 'Analysis becomes a language',
    figure: 'Leonhard Euler',
    centralFigure: 'Leonhard Euler',
    portrait: '/portraits/euler.jpg',
    latex: String.raw`e^{ix} = \cos x + i\sin x`,
    formulaNote: 'Functions · series · e · π',
    body: `Euler was cheerfully unstoppable. He drank coffee by the pot, raised a huge family, and kept writing math even after going blind in one eye and later nearly both — dictating papers from memory while children climbed on him. Contemporaries said he could calculate as easily as other people breathe. He standardized symbols we still use (f(x), e, Σ), flooded every field with papers, and made calculus the everyday language of science. If Newton and Leibniz built the engine, Euler drove it everywhere.

One circle-constant wrinkle still echoes today: early on (for example in a 1727 essay), Euler used the letter π for the ratio of circumference to radius — about 6.28…, a full turn in radians, the number modern “tau” fans write as τ = 2π. By Mechanica (1736) and the famous Introductio (1748) he had switched to π ≈ 3.14… as half the circumference of a unit circle (our usual π). He helped popularize the symbol either way; the definition was still wobbling between 3.14… and 6.28… into the mid-1700s. So the later π vs τ debate is not inventing a new fight from nothing — Euler himself first wrote π for the full-turn constant, then settled on the half-turn value that stuck.`,
  },
  {
    year: '19th century',
    title: 'Rigorous foundations',
    figure: 'Augustin-Louis Cauchy',
    centralFigure: 'Augustin-Louis Cauchy',
    portrait:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Augustin-Louis_Cauchy_1901.jpg/440px-Augustin-Louis_Cauchy_1901.jpg',
    latex: String.raw`f'(x) = \lim_{h \to 0}\dfrac{f(x+h)-f(x)}{h}`,
    formulaNote: 'Limits · continuity · the modern derivative',
    body: `Augustin-Louis Cauchy (1789–1857) was a French mathematician, engineer, and devout Catholic royalist — brilliant, prolific, and often hard to work with. He wrote hundreds of papers, fled political upheaval more than once, and taught in a style that demanded careful definitions. Where Newton and Leibniz had invented calculus as a working tool, Cauchy helped rebuild it so that “rate of change” meant a precise limit, not a vague vanishing quantity. The difference-quotient formula on the right is the classroom legacy of that program. (How to derive and use it step by step lives on the Cheat Sheet page under Differentiation from first principles.)`,
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
    body: `Henri Lebesgue reworked integration so it could handle rougher, wilder functions — the kind that make classical derivatives sulk. Later “distribution” theory and weak derivatives stretched calculus again. Then computers arrived: automatic differentiation now sits inside physics engines and machine-learning stacks, computing rates of change billions of times a second. Lebesgue himself was a quiet academic through world wars, not a celebrity — but the idea Newton and Leibniz crystallized, measuring instantaneous change, still runs the modern world.`,
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
          className={`hist-slide-photo${event.portraitPullBack ? ' hist-slide-photo--pull-back' : ''}`}
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
          {/* Intro lives in the hero so it never sits above the first rail marker
              (that orphan block was throwing off Pythagoras’s circle). */}
          <p className="tl-intro">
            <strong>Calculus</strong> is the math of change. Think of a moving object:{' '}
            <strong>position</strong> is where it is; the <strong>first derivative</strong> of
            position is <strong>velocity</strong> (how fast that place is changing); the{' '}
            <strong>second derivative</strong> is <strong>acceleration</strong> (how fast the
            speed is changing). A <strong>third derivative</strong> would be how acceleration
            itself changes — but the main idea is already there: each derivative asks “how quickly
            is the thing before it changing?” That simple habit — tracking change, then change of
            change — is what this timeline is about.
          </p>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">Span</span>
            <div className="value" style={{ fontSize: '1.35rem' }}>
              ~2,600 yrs
            </div>
            <div className="sub">Thales → modern analysis</div>
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
