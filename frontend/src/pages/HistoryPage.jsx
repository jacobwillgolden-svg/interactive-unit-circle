import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Horizontal history: one era per “page.”
 * Centered portrait → flat date odometer → centered story card.
 * Scroll/drag the strip or swipe cards; ticks fade by distance from present.
 */

const EVENTS = [
  {
    year: 'c. 624–546 BCE',
    tick: '624 BCE',
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
    tick: '570 BCE',
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
    tick: '300 BCE',
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
    tick: '276 BCE',
    title: 'Measuring the Earth and sieving primes',
    figure: 'Eratosthenes of Cyrene',
    centralFigure: 'Eratosthenes of Cyrene',
    portrait: '/portraits/eratosthenes.jpg',
    latex: String.raw`C = 2\pi r \quad\cdot\quad \text{sieve}`,
    formulaNote: 'Circumference · latitude · prime numbers',
    body: `Eratosthenes ran the great library at Alexandria and was nicknamed “Beta” — second-best at everything — and also “Pentathlos,” a five-event all-rounder. With a stick’s shadow in one city and a deep well in another, he estimated the size of the whole Earth, shockingly well for the age. (The geometry of that measurement lives on the Cheat Sheet.) He also invented the prime-number “sieve”: cross out multiples until only primes remain. He mixed measurement, maps, and pure number — the same mix calculus would use when rates and totals had to become precise.`,
  },
  {
    year: 'c. 250 BCE',
    tick: '250 BCE',
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
    tick: '1400s',
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
    tick: '1637',
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
    tick: '1630s',
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
    tick: '1660s',
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
    tick: '1665',
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
    tick: '1673',
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
    tick: '1690s',
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
    tick: '1700',
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
    tick: '1700s',
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
    tick: '1800s',
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
    tick: '1900s',
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

/** Opacity for major date labels by distance from the active index (no scale — keeps ruler pitch) */
function tickStyle(distance) {
  const d = Math.abs(distance)
  if (d === 0) return { opacity: 1 }
  if (d === 1) return { opacity: 0.92 }
  if (d === 2) return { opacity: 0.8 }
  if (d === 3) return { opacity: 0.68 }
  if (d === 4) return { opacity: 0.56 }
  if (d === 5) return { opacity: 0.46 }
  return { opacity: 0.38 }
}

function PortraitFace({ event, active }) {
  const [imgOk, setImgOk] = useState(true)
  const name = event.centralFigure || event.figure
  return (
    <div className={`hist-h-face${active ? ' is-active' : ''}`} aria-hidden={!active}>
      {event.portrait && imgOk ? (
        <img
          className={`hist-h-photo${event.portraitPullBack ? ' hist-h-photo--pull-back' : ''}`}
          src={event.portrait}
          alt=""
          referrerPolicy="no-referrer"
          loading={active ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="hist-h-photo hist-h-photo--placeholder" aria-hidden="true">
          <span>{name.trim().slice(0, 1)}</span>
        </div>
      )}
    </div>
  )
}

const LAST_ERA = EVENTS.length - 1
const TICK_SCRUB_PX = 40 // drag distance per era step on the odometer
/** Ruler subdivisions between major date marks: s = small, m = medium */
const RULER_MICROS = ['s', 's', 's', 'm', 's', 's', 's', 'm', 's', 's', 's', 'm', 's', 's', 's']

function clampEra(i) {
  return Math.max(0, Math.min(LAST_ERA, i))
}

/**
 * Navigation modes (mutually exclusive intent):
 *  idle         — free; card scroll may update index
 *  driving      — we are scrolling cards to match index (ignore scroll→index)
 *  scrubbing    — user dragging odometer / portrait; index updates, cards catch up on release
 */
export default function HistoryPage() {
  const [index, setIndex] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const scrollerRef = useRef(null)
  const pageRefs = useRef([])
  const stripTrackRef = useRef(null)
  const odoWindowRef = useRef(null)
  const portraitRef = useRef(null)
  const indexRef = useRef(0)
  const modeRef = useRef('idle') // 'idle' | 'driving' | 'scrubbing'
  const scrubRef = useRef(null)
  const suppressTickClickRef = useRef(false)
  const wheelAccRef = useRef(0)
  const wheelFlushTimerRef = useRef(0)
  const driveTimerRef = useRef(0)

  const setEraIndex = useCallback((i) => {
    const next = clampEra(i)
    if (next === indexRef.current) return next
    indexRef.current = next
    setIndex(next)
    return next
  }, [])

  /** Center the active tick under the present marker (geometry-based, layout-safe). */
  const centerOdoTrack = useCallback((i = indexRef.current) => {
    const track = stripTrackRef.current
    const win = odoWindowRef.current
    if (!track || !win) return
    const tick = track.querySelector(`[data-tick="${i}"]`)
    if (!tick) return
    // Use live rects + current transform so nested/decorative nodes never skew math
    const winRect = win.getBoundingClientRect()
    const tickRect = tick.getBoundingClientRect()
    let currentX = 0
    try {
      currentX = new DOMMatrix(getComputedStyle(track).transform).m41
    } catch {
      currentX = 0
    }
    const delta =
      winRect.left + winRect.width / 2 - (tickRect.left + tickRect.width / 2)
    track.style.transform = `translate3d(${currentX + delta}px, 0, 0)`
  }, [])

  /**
   * Center a card using live geometry (works with side pads; avoids “ghost” space before Thales).
   */
  const scrollCardsTo = useCallback((i, { smooth = true, fromIndex } = {}) => {
    const scroller = scrollerRef.current
    const el = pageRefs.current[i]
    if (!scroller || !el) return

    const sRect = scroller.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const delta = eRect.left + eRect.width / 2 - (sRect.left + sRect.width / 2)
    const left = scroller.scrollLeft + delta
    const dist = Math.abs(i - (fromIndex ?? indexRef.current))

    modeRef.current = 'driving'
    scroller.classList.add('is-driving')
    window.clearTimeout(driveTimerRef.current)

    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: smooth ? 'smooth' : 'auto',
    })

    const unlock = () => {
      scroller.classList.remove('is-driving')
      if (modeRef.current === 'driving') modeRef.current = 'idle'
      // Snap clamp: never rest before first / after last
      const first = pageRefs.current[0]
      const last = pageRefs.current[LAST_ERA]
      if (first && last) {
        const fr = first.getBoundingClientRect()
        const lr = last.getBoundingClientRect()
        const sr = scroller.getBoundingClientRect()
        const center = sr.left + sr.width / 2
        if (fr.left + fr.width / 2 > center + 2) {
          const d = fr.left + fr.width / 2 - center
          scroller.scrollLeft += d
        } else if (lr.left + lr.width / 2 < center - 2) {
          const d = lr.left + lr.width / 2 - center
          scroller.scrollLeft += d
        }
      }
    }

    const onEnd = () => {
      scroller.removeEventListener('scrollend', onEnd)
      window.clearTimeout(driveTimerRef.current)
      unlock()
    }
    scroller.addEventListener('scrollend', onEnd, { once: true })
    driveTimerRef.current = window.setTimeout(unlock, smooth ? Math.min(900, 220 + dist * 45) : 50)
  }, [])

  const goTo = useCallback(
    (i, { smooth = true } = {}) => {
      const fromIndex = indexRef.current
      const next = setEraIndex(i)
      scrollCardsTo(next, { smooth, fromIndex })
    },
    [setEraIndex, scrollCardsTo],
  )

  // Card strip → index only when user is free-scrolling (not while we drive / scrub)
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let raf = 0

    const nearestIndex = () => {
      const sRect = scroller.getBoundingClientRect()
      const center = sRect.left + sRect.width / 2
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        const mid = r.left + r.width / 2
        const d = Math.abs(mid - center)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      return best
    }

    const onScroll = () => {
      if (modeRef.current !== 'idle') return
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (modeRef.current !== 'idle') return
        setEraIndex(nearestIndex())
      })
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [setEraIndex])

  // Keyboard + wheel
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        goTo(indexRef.current + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goTo(indexRef.current - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goTo(0, { smooth: false })
      } else if (e.key === 'End') {
        e.preventDefault()
        goTo(LAST_ERA, { smooth: false })
      }
    }

    let stepLock = 0
    const onWheel = (e) => {
      const overOdo = e.target?.closest?.('.hist-h-odo-window, .hist-h-portrait-block')
      if (overOdo) {
        e.preventDefault()
        const dominant =
          Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        if (Math.abs(dominant) < 1) return

        modeRef.current = 'scrubbing'
        setScrubbing(true)
        wheelAccRef.current += dominant
        const steps = Math.trunc(wheelAccRef.current / 48)
        if (steps !== 0) {
          wheelAccRef.current -= steps * 48
          setEraIndex(indexRef.current + steps)
        }
        window.clearTimeout(wheelFlushTimerRef.current)
        wheelFlushTimerRef.current = window.setTimeout(() => {
          wheelAccRef.current = 0
          setScrubbing(false)
          modeRef.current = 'idle'
          scrollCardsTo(indexRef.current, { smooth: true })
        }, 140)
        return
      }

      const overCard = e.target?.closest?.('.hist-h-card')
      if (overCard && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return

      const dominant =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(dominant) < 10) return
      const now = performance.now()
      if (now < stepLock) return
      stepLock = now + 260
      e.preventDefault()
      goTo(indexRef.current + (dominant > 0 ? 1 : -1))
    }

    window.addEventListener('keydown', onKey)
    const root = document.querySelector('main.hist-h')
    root?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      root?.removeEventListener('wheel', onWheel)
      window.clearTimeout(wheelFlushTimerRef.current)
      window.clearTimeout(driveTimerRef.current)
    }
  }, [goTo, setEraIndex, scrollCardsTo])

  // Shared horizontal scrub helper (odometer + portrait faces)
  const attachScrubSurface = useCallback(
    (el, { pxPerStep = TICK_SCRUB_PX } = {}) => {
      if (!el) return () => {}

      const onPointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        scrubRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startIndex: indexRef.current,
          lastIndex: indexRef.current,
          moved: false,
          captured: false,
          surface: el,
          pxPerStep,
        }
      }

      const onPointerMove = (e) => {
        const s = scrubRef.current
        if (!s || s.pointerId !== e.pointerId || s.surface !== el) return
        const dx = e.clientX - s.startX
        if (!s.moved && Math.abs(dx) < 10) return

        if (!s.moved) {
          s.moved = true
          modeRef.current = 'scrubbing'
          setScrubbing(true)
          try {
            el.setPointerCapture(e.pointerId)
            s.captured = true
          } catch {
            /* */
          }
        }

        // Drag right → earlier eras (strip / faces follow finger)
        const delta = Math.round(-dx / s.pxPerStep)
        const next = clampEra(s.startIndex + delta)
        if (next !== s.lastIndex) {
          s.lastIndex = next
          setEraIndex(next)
        }
      }

      const endScrub = (e) => {
        const s = scrubRef.current
        if (!s || s.surface !== el || (e && s.pointerId !== e.pointerId)) return
        const wasDrag = s.moved
        const final = s.lastIndex
        if (s.captured) {
          try {
            el.releasePointerCapture(s.pointerId)
          } catch {
            /* */
          }
        }
        scrubRef.current = null
        setScrubbing(false)

        if (wasDrag) {
          suppressTickClickRef.current = true
          scrollCardsTo(final, { smooth: Math.abs(final - s.startIndex) > 1 })
        } else {
          modeRef.current = 'idle'
        }
      }

      el.addEventListener('pointerdown', onPointerDown)
      el.addEventListener('pointermove', onPointerMove)
      el.addEventListener('pointerup', endScrub)
      el.addEventListener('pointercancel', endScrub)
      return () => {
        el.removeEventListener('pointerdown', onPointerDown)
        el.removeEventListener('pointermove', onPointerMove)
        el.removeEventListener('pointerup', endScrub)
        el.removeEventListener('pointercancel', endScrub)
      }
    },
    [setEraIndex, scrollCardsTo],
  )

  useEffect(() => attachScrubSurface(odoWindowRef.current, { pxPerStep: TICK_SCRUB_PX }), [attachScrubSurface])
  useEffect(
    () => attachScrubSurface(portraitRef.current, { pxPerStep: 56 }),
    [attachScrubSurface],
  )

  // Keep active tick centered under the present marker
  useEffect(() => {
    centerOdoTrack(index)
  }, [index, centerOdoTrack])

  useEffect(() => {
    document.documentElement.classList.add('hist-page')
    return () => document.documentElement.classList.remove('hist-page')
  }, [])

  // Initial layout — always land on Thales (index 0), after layout is measurable
  useEffect(() => {
    let cancelled = false
    const settleAtThales = () => {
      if (cancelled) return
      indexRef.current = 0
      setIndex(0)
      centerOdoTrack(0)
      scrollCardsTo(0, { smooth: false, fromIndex: 0 })
    }

    // Double rAF: wait for flex/viewport layout + fonts
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(settleAtThales)
    })

    // Re-center odometer if the shell resizes (mobile URL bar, rotate, etc.)
    const scroller = scrollerRef.current
    const odo = odoWindowRef.current
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            centerOdoTrack(indexRef.current)
          })
        : null
    if (ro) {
      if (scroller) ro.observe(scroller)
      if (odo) ro.observe(odo)
    }

    // One more settle after images/fonts may shift layout
    const t = window.setTimeout(settleAtThales, 120)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(t)
      ro?.disconnect()
    }
  }, [centerOdoTrack, scrollCardsTo])

  const ev = EVENTS[index]
  const atStart = index <= 0
  const atEnd = index >= LAST_ERA

  return (
    <>
      <header className="hero hero--compact hist-h-hero">
        <div>
          <p className="hero-eyebrow">History of mathematics</p>
          <h1>
            A timeline of <em>calculus</em>
          </h1>
          <p className="tl-intro">
            Swipe the portrait or date strip · swipe cards · « » jump ends · arrows step one era.
          </p>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">Era</span>
            <div className="value" style={{ fontSize: '1.25rem' }}>
              {index + 1}
              <span style={{ opacity: 0.45, fontSize: '0.85rem' }}> / {EVENTS.length}</span>
            </div>
            <div className="sub">{ev.year}</div>
          </div>
        </div>
      </header>

      <main className={`hist-h${scrubbing ? ' is-scrubbing' : ''}`}>
        {/* Portrait + identity — swipe horizontally to change era */}
        <section
          className="hist-h-portrait-block"
          ref={portraitRef}
          aria-live="polite"
          title="Swipe left/right to change era"
        >
          <div className="hist-h-faces">
            {EVENTS.map((e, i) => (
              <PortraitFace key={e.year + e.title} event={e} active={i === index} />
            ))}
          </div>
          <p className="hist-h-name">{ev.centralFigure || ev.figure}</p>
          <div
            className="hist-h-katex"
            dangerouslySetInnerHTML={{ __html: renderLatex(ev.latex) }}
          />
          <p className="hist-h-formula-note">{ev.formulaNote}</p>
        </section>

        {/* Flat date odometer */}
        <section
          className={`hist-h-odometer${scrubbing ? ' is-scrubbing' : ''}`}
          aria-label="Timeline dates"
          role="listbox"
          aria-activedescendant={`hist-tick-${index}`}
        >
          <div
            className="hist-h-odo-window"
            ref={odoWindowRef}
            title="Drag or swipe to scrub dates"
          >
            <div className="hist-h-odo-fade hist-h-odo-fade--left" aria-hidden="true" />
            <div className="hist-h-odo-fade hist-h-odo-fade--right" aria-hidden="true" />
            <div className="hist-h-odo-present" aria-hidden="true" />
            <div className="hist-h-odo-track" ref={stripTrackRef}>
              {EVENTS.map((e, i) => {
                const st = tickStyle(i - index)
                return (
                  <Fragment key={e.year + e.tick}>
                    {/* Major date mark — same pitch as micro ticks; label floats below */}
                    <button
                      type="button"
                      id={`hist-tick-${i}`}
                      data-tick={i}
                      role="option"
                      aria-selected={i === index}
                      className={`hist-h-tick${i === index ? ' is-present' : ''}${e.highlight ? ' is-highlight' : ''}`}
                      style={{ opacity: st.opacity }}
                      onClick={(evClick) => {
                        if (suppressTickClickRef.current) {
                          suppressTickClickRef.current = false
                          evClick.preventDefault()
                          return
                        }
                        goTo(i)
                      }}
                    >
                      <span className="hist-h-tick-mark" aria-hidden="true" />
                      <span className="hist-h-tick-label">{e.tick}</span>
                    </button>
                    {/* Continuous ruler ticks between majors only */}
                    {i < LAST_ERA &&
                      RULER_MICROS.map((kind, mi) => (
                        <span
                          key={`m-${i}-${mi}`}
                          className={`hist-h-micro hist-h-micro--${kind === 'm' ? 'md' : 'sm'}`}
                          aria-hidden="true"
                        />
                      ))}
                  </Fragment>
                )
              })}
            </div>
          </div>
          <div className="hist-h-odo-nav">
            <button
              type="button"
              className="hist-h-nav-btn hist-h-nav-btn--jump"
              onClick={() => goTo(0, { smooth: false })}
              disabled={atStart}
              aria-label="First era"
              title="First era (Home)"
            >
              «
            </button>
            <button
              type="button"
              className="hist-h-nav-btn"
              onClick={() => goTo(index - 1)}
              disabled={atStart}
              aria-label="Previous era"
              title="Previous era"
            >
              ←
            </button>
            <span className="hist-h-odo-caption">{ev.year}</span>
            <button
              type="button"
              className="hist-h-nav-btn"
              onClick={() => goTo(index + 1)}
              disabled={atEnd}
              aria-label="Next era"
              title="Next era"
            >
              →
            </button>
            <button
              type="button"
              className="hist-h-nav-btn hist-h-nav-btn--jump"
              onClick={() => goTo(LAST_ERA, { smooth: false })}
              disabled={atEnd}
              aria-label="Last era"
              title="Last era (End)"
            >
              »
            </button>
          </div>
        </section>

        {/* Horizontal card pages */}
        <section
          className="hist-h-scroller"
          ref={scrollerRef}
          aria-label="Era stories"
        >
          {/* Side pads so first/last cards can sit dead-center (no empty “before Thales” zone) */}
          <div className="hist-h-scroller-pad" aria-hidden="true" />
          {EVENTS.map((e, i) => (
            <article
              key={e.year + e.title}
              ref={(el) => {
                pageRefs.current[i] = el
              }}
              className={`hist-h-page${i === index ? ' is-active' : ''}${e.highlight ? ' is-highlight' : ''}`}
              aria-hidden={i !== index}
            >
              <div className="hist-h-card">
                <h2 className="hist-h-card-title">{e.title}</h2>
                <p className="hist-h-card-body">{e.body}</p>
              </div>
            </article>
          ))}
          <div className="hist-h-scroller-pad" aria-hidden="true" />
        </section>

        <p className="hist-h-footnote">
          Further reading: St Andrews History of Mathematics; Wikipedia’s{' '}
          <em>History of calculus</em> and <em>Leibniz–Newton calculus controversy</em>. Portraits
          via Wikimedia Commons and local archive.
        </p>
      </main>
    </>
  )
}
