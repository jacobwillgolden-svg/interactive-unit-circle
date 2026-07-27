/**
 * Constants & identities — informed by chalkboard concepts:
 * φ, e ≈ 2.718281828…, 1/0 undefined, 1^∞ indeterminate,
 * Euler’s formula / identity, −1 = cosπ + i sinπ.
 */

const PHI = (1 + Math.sqrt(5)) / 2
const E = Math.E

/** Reference Fibonacci golden spiral (user diagram) */
function FibonacciSpiral() {
  return (
    <figure className="fib-figure">
      <img
        src="/fibonacci-golden-spiral.png"
        alt="Fibonacci golden spiral: squares labeled 1, 1, 2, 3, 5, 8, 13 with a continuous spiral curve"
        className="fib-img"
      />
      <figcaption className="id-caption">
        Squares Fₙ = 1, 1, 2, 3, 5, 8, 13 · quarter-circle arcs form the golden spiral · ratios → φ
      </figcaption>
    </figure>
  )
}

export default function IdentitiesPage() {
  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Constants & identities</p>
          <h1>
            From the <em>chalkboard</em>
          </h1>
          <p className="hero-copy">
            Golden ratio, Euler’s number, forbidden divisions, and the formulas that sew together
            e, i, π, sine, and cosine — the ideas on the board, explained.
          </p>
        </div>
      </header>

      <main className="workspace workspace--single">
        {/* Source banner */}
        <figure className="panel id-banner">
          <img
            src="/right-banner.png"
            alt="Chalkboard: golden ratio φ, e ≈ 2.718281828…, 1/0 undefined, 1^∞ indeterminate, Euler’s formulas"
            className="id-banner-img"
          />
          <figcaption className="id-banner-cap">
            Reference board — φ, e, undefined & indeterminate forms, and Euler’s formulas explained below.
          </figcaption>
        </figure>

        <div className="id-grid">
          {/* Golden ratio */}
          <section className="panel content-panel id-card">
            <div className="panel-header">
              <span className="panel-title">The golden ratio</span>
              <span className="panel-hint">φ · three circles</span>
            </div>
            <div className="id-body">
              <div className="id-formula" aria-label="phi equals one plus square root of five over two">
                <span className="id-big">φ</span>
                <span className="id-eq">=</span>
                <span className="id-frac">
                  <span className="id-num">1 + √5</span>
                  <span className="id-bar" />
                  <span className="id-den">2</span>
                </span>
                <span className="id-eq">≈</span>
                <span className="id-num-plain">{PHI.toFixed(8)}…</span>
              </div>

              <svg viewBox="0 0 280 120" className="id-svg id-svg--inline" aria-hidden="true">
                {/* Three circles construction (as on board) */}
                <circle cx="50" cy="60" r="28" fill="none" stroke="currentColor" strokeOpacity="0.5" />
                <circle cx="50" cy="60" r="2" fill="currentColor" opacity="0.5" />
                <line x1="50" y1="32" x2="50" y2="88" stroke="#7dd3fc" strokeWidth="1.5" />
                <text x="38" y="64" fontSize="12" fill="#7dd3fc">1</text>

                <circle cx="130" cy="60" r="40" fill="none" stroke="currentColor" strokeOpacity="0.5" />
                <circle cx="130" cy="60" r="2" fill="currentColor" opacity="0.5" />
                <line x1="130" y1="20" x2="130" y2="100" stroke="#f0d9a8" strokeWidth="1.5" />
                <text x="112" y="58" fontSize="11" fill="#f0d9a8">√5</text>

                <circle cx="210" cy="60" r="28" fill="none" stroke="currentColor" strokeOpacity="0.5" />
                {/* diagonal chord across construction */}
                <line x1="22" y1="60" x2="238" y2="60" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="50" y1="88" x2="210" y2="32" stroke="#dc2626" strokeWidth="1.25" strokeOpacity="0.7" />
              </svg>
              <p className="id-caption" style={{ marginTop: 0 }}>
                Circle radii 1 and √5 appear in classical constructions of φ.
              </p>

              <p>
                A segment is cut in the <strong>golden ratio</strong> when whole ∶ longer = longer ∶
                shorter. That unique positive number is φ. It satisfies φ² = φ + 1 and is irrational.
              </p>
              <div className="id-formula id-formula--sm">φ² = φ + 1 ··· Fibonacci ratios → φ</div>
            </div>
          </section>

          {/* Euler's number + 1828 pattern */}
          <section className="panel content-panel id-card">
            <div className="panel-header">
              <span className="panel-title">Euler’s number</span>
              <span className="panel-hint">e · the 1828 pattern</span>
            </div>
            <div className="id-body">
              <div className="id-formula">
                <span className="id-big">e</span>
                <span className="id-eq">≈</span>
                <span className="id-e-digits">
                  2.7
                  <mark className="id-mark">1828</mark>
                  <mark className="id-mark">1828</mark>
                  45…
                </span>
              </div>
              <p className="id-caption" style={{ marginTop: '-0.5rem' }}>
                After 2.7, the block <strong>1828</strong> appears twice — easy to remember, then the
                digits continue without that repeat forever.
              </p>
              <p>
                More precisely e ≈ {E.toFixed(12)}… It is the base of natural growth:
              </p>
              <div className="id-formula id-formula--sm">
                e = lim<sub>n→∞</sub> (1 + 1/n)<sup>n</sup> = Σ 1/n!
              </div>
              <div className="id-formula id-formula--sm">
                d/dx [ e<sup>x</sup> ] = e<sup>x</sup>
              </div>
            </div>
          </section>

          {/* 1/0 undefined */}
          <section className="panel content-panel id-card">
            <div className="panel-header">
              <span className="panel-title">Division by zero</span>
              <span className="panel-hint">1/0 is undefined</span>
            </div>
            <div className="id-body">
              <div className="id-formula id-formula--danger">
                <span className="id-frac">
                  <span className="id-num">1</span>
                  <span className="id-bar" />
                  <span className="id-den">0</span>
                </span>
                <span className="id-eq">=</span>
                <span className="id-big id-undefined">undefined</span>
              </div>
              <p>
                Division asks for x with 0 · x = 1. No real (or complex) number works — zero times
                anything is zero. So <strong>1/0 has no value</strong> in ordinary arithmetic.
              </p>
              <p>
                Limits can diverge: as x → 0⁺, 1/x → +∞; as x → 0⁻, 1/x → −∞. “Infinity” here describes
                a limiting process, not a real number equal to 1/0.
              </p>
            </div>
          </section>

          {/* 1^∞ indeterminate */}
          <section className="panel content-panel id-card">
            <div className="panel-header">
              <span className="panel-title">Indeterminate form</span>
              <span className="panel-hint">1^∞ is not a number</span>
            </div>
            <div className="id-body">
              <div className="id-formula id-formula--warn">
                <span className="id-big">
                  1<sup>∞</sup>
                </span>
                <span className="id-eq">=</span>
                <span className="id-big id-indet">indeterminate</span>
              </div>
              <p>
                Unlike 1/0 (which is simply undefined), <strong>1<sup>∞</sup></strong> is an{' '}
                <em>indeterminate form</em>: different limits that “look like” 1<sup>∞</sup> can give
                different answers.
              </p>
              <ul className="id-list">
                <li>
                  lim (1 + 1/n)<sup>n</sup> = <strong>e</strong> ≈ 2.718… (looks like 1<sup>∞</sup>)
                </li>
                <li>
                  lim 1<sup>n</sup> = <strong>1</strong>
                </li>
                <li>
                  Other setups can yield any positive number — hence “indeterminate,” not a fixed value.
                </li>
              </ul>
              <p>
                That is why the definition of e is subtle: it is a precise limit, not “one to the power
                infinity.”
              </p>
            </div>
          </section>

          {/* Bridge: -1 = cos π + i sin π */}
          <section className="panel content-panel id-card id-card--wide">
            <div className="panel-header">
              <span className="panel-title">On the unit circle at π</span>
              <span className="panel-hint">−1 = cos π + i sin π</span>
            </div>
            <div className="id-body">
              <div className="id-formula id-formula--hero id-formula--yellow">
                <span>−1</span>
                <span className="id-eq">=</span>
                <span>cos(π)</span>
                <span className="id-eq">+</span>
                <span>i · sin(π)</span>
              </div>
              <p>
                At angle π radians (180°), cosine is −1 and sine is 0, so the complex number on the
                unit circle is exactly −1. This is the geometric stepping-stone to Euler’s identity:
              </p>
              <div className="id-formula id-formula--sm">
                e<sup>iπ</sup> = cos π + i sin π = −1
              </div>
            </div>
          </section>

          {/* Euler's identity */}
          <section className="panel content-panel id-card">
            <div className="panel-header">
              <span className="panel-title">Euler’s identity</span>
              <span className="panel-hint">Five constants, one line</span>
            </div>
            <div className="id-body">
              <div className="id-formula id-formula--hero">
                <span className="id-big">e</span>
                <sup className="id-sup">iπ</sup>
                <span className="id-eq">+</span>
                <span className="id-big">1</span>
                <span className="id-eq">=</span>
                <span className="id-big">0</span>
              </div>
              <p>
                From e<sup>iπ</sup> = −1 we add 1 and obtain 0. The constants{' '}
                <strong>0, 1, e, i, π</strong> meet in a single equation — a theorem, not a coincidence.
              </p>
              <div className="id-pills">
                <span className="id-pill">0 · additive identity</span>
                <span className="id-pill">1 · multiplicative identity</span>
                <span className="id-pill">e · analysis</span>
                <span className="id-pill">i · √−1</span>
                <span className="id-pill">π · circle</span>
              </div>
            </div>
          </section>

          {/* Euler's formula */}
          <section className="panel content-panel id-card">
            <div className="panel-header">
              <span className="panel-title">Euler’s formula</span>
              <span className="panel-hint">e^{'{iθ}'} on the circle</span>
            </div>
            <div className="id-body">
              <div className="id-formula id-formula--hero">
                <span className="id-big">e</span>
                <sup className="id-sup">iθ</sup>
                <span className="id-eq">=</span>
                <span>cos θ</span>
                <span className="id-eq">+</span>
                <span>i · sin θ</span>
              </div>
              <div className="id-euler-diagram" aria-hidden="true">
                <svg viewBox="0 0 320 220" className="id-svg">
                  <circle cx="120" cy="110" r="70" fill="none" stroke="currentColor" strokeOpacity="0.25" />
                  <line x1="30" y1="110" x2="280" y2="110" stroke="currentColor" strokeOpacity="0.2" />
                  <line x1="120" y1="20" x2="120" y2="200" stroke="currentColor" strokeOpacity="0.2" />
                  <line x1="120" y1="110" x2="165" y2="56" stroke="#7dd3fc" strokeWidth="2" />
                  <line x1="120" y1="110" x2="165" y2="110" stroke="#2563eb" strokeWidth="2.5" />
                  <line x1="165" y1="110" x2="165" y2="56" stroke="#dc2626" strokeWidth="2.5" />
                  <circle cx="165" cy="56" r="5" fill="#7dd3fc" />
                  <text x="175" y="52" fontSize="12" fill="#7dd3fc" fontFamily="JetBrains Mono, monospace">
                    e^{'iθ'}
                  </text>
                  <text x="138" y="126" fontSize="11" fill="#2563eb">
                    cos θ
                  </text>
                  <text x="170" y="88" fontSize="11" fill="#dc2626">
                    sin θ
                  </text>
                  <text x="250" y="114" fontSize="11" fill="currentColor" opacity="0.5">
                    Re
                  </text>
                  <text x="126" y="32" fontSize="11" fill="currentColor" opacity="0.5">
                    Im
                  </text>
                </svg>
              </div>
              <ul className="id-list">
                <li>
                  θ = 0 → e<sup>0</sup> = 1
                </li>
                <li>
                  θ = π/2 → e<sup>iπ/2</sup> = i
                </li>
                <li>
                  θ = π → e<sup>iπ</sup> = −1
                </li>
              </ul>
            </div>
          </section>

          {/* Fibonacci golden spiral */}
          <section className="panel content-panel id-card id-card--wide">
            <div className="panel-header">
              <span className="panel-title">Fibonacci spiral</span>
              <span className="panel-hint">Golden ratio · sequence 1, 1, 2, 3, 5, 8, 13…</span>
            </div>
            <div className="id-body id-body--split">
              <div>
                <p>
                  The <strong>Fibonacci sequence</strong> is defined by F₁ = 1, F₂ = 1, and
                  F<sub>n</sub> = F<sub>n−1</sub> + F<sub>n−2</sub>:
                </p>
                <div className="id-formula id-formula--sm">1, 1, 2, 3, 5, 8, 13, 21, 34, …</div>
                <p>
                  Tile squares whose side lengths are these numbers, and draw a quarter-circle in each
                  square: you get the <strong>golden spiral</strong> (approximate logarithmic spiral).
                  Successive ratios approach φ:
                </p>
                <div className="id-formula id-formula--sm">
                  F<sub>n+1</sub> / F<sub>n</sub> → φ ≈ {PHI.toFixed(6)}…
                </div>
                <ul className="id-list">
                  <li>2/1 = 2</li>
                  <li>3/2 = 1.5</li>
                  <li>5/3 ≈ 1.666…</li>
                  <li>8/5 = 1.6</li>
                  <li>13/8 = 1.625</li>
                  <li>… → φ = (1+√5)/2</li>
                </ul>
                <p>
                  Each square in the diagram is labeled with its Fibonacci side length.
                </p>
              </div>
              <FibonacciSpiral />
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
