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
            e, i, π, sine, and cosine — plus what kind of number each one is.
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

        {/* Number types primer */}
        <section className="panel content-panel id-card id-card--wide">
          <div className="panel-header">
            <span className="panel-title">What kind of number is that?</span>
            <span className="panel-hint">Rational · irrational · imaginary · complex</span>
          </div>
          <div className="id-body">
            <p>
              On this page you will see decimals that never settle down (π, φ, √2), a “unit” for
              rotating into a second dimension (i), and ordinary fractions. They are not all the
              same kind of number. Here is the map in plain language.
            </p>

            <div className="num-type-grid">
              <article className="num-type-card">
                <h3 className="num-type-title">Counting &amp; whole numbers</h3>
                <p className="num-type-examples">1, 2, 3… · 0 · −1, −2…</p>
                <p>
                  The numbers you use to count, plus zero and negatives. These are the{' '}
                  <strong>integers</strong>. Nothing fractional or “between” yet.
                </p>
              </article>

              <article className="num-type-card">
                <h3 className="num-type-title">Rational numbers</h3>
                <p className="num-type-examples">½ · ¾ · −7 · 0.25 · 0.333… = ⅓</p>
                <p>
                  Any number that can be written as a <strong>fraction of two integers</strong>{' '}
                  (denominator not zero). As a decimal, a rational either <em>stops</em> (0.25) or{' '}
                  <em>repeats forever in a loop</em> (0.333…, 0.142857 repeating). Integers count as
                  rational too (7 = 7/1).
                </p>
              </article>

              <article className="num-type-card num-type-card--accent">
                <h3 className="num-type-title">Irrational numbers</h3>
                <p className="num-type-examples">π · φ · e · √2 · √5 · most √n</p>
                <p>
                  Real numbers that <strong>cannot</strong> be written as a simple fraction of
                  integers. Their decimals go on forever <em>without</em> a repeating block. You can
                  approximate them (3.14159…, 1.61803…) but you never “finish” the digits. That does{' '}
                  <em>not</em> make them imaginary — they still sit on the ordinary number line.
                </p>
              </article>

              <article className="num-type-card">
                <h3 className="num-type-title">Real numbers</h3>
                <p className="num-type-examples">All rationals + all irrationals</p>
                <p>
                  Everything on the continuous number line: positives, negatives, zero, fractions,
                  and irrationals. If you can mark it as a distance left or right from 0, it is real.
                </p>
              </article>

              <article className="num-type-card num-type-card--warn">
                <h3 className="num-type-title">Imaginary numbers</h3>
                <p className="num-type-examples">
                  i · 2i · −i · √−1 · √−4 = 2i
                </p>
                <p>
                  Built from the unit <strong>i</strong> defined by <strong>i² = −1</strong>. There
                  is no real number whose square is negative, so we invent a new direction off the
                  real line. “Imaginary” is a historical name — they are as precise as any other
                  number, just not on the usual line by themselves.
                </p>
              </article>

              <article className="num-type-card num-type-card--accent">
                <h3 className="num-type-title">Complex numbers</h3>
                <p className="num-type-examples">3 + 2i · cos θ + i sin θ · e^{'{iθ}'}</p>
                <p>
                  Numbers of the form <strong>a + bi</strong> (real part a, imaginary part b). The
                  unit circle in this site is the set of complex numbers with length 1. Euler’s
                  formula writes points on that circle as e^{'{iθ}'}.
                </p>
              </article>
            </div>

            <h3 className="id-subhead" style={{ marginTop: '1.25rem' }}>
              How this shows up on the chalkboard
            </h3>
            <ul className="id-list id-list--types">
              <li>
                <strong>π (pi)</strong> — circumference ÷ diameter. <em>Irrational</em> (and
                transcendental: not the root of a simple whole-number polynomial). Decimals never
                repeat; 22/7 is only an approximation.
              </li>
              <li>
                <strong>φ (golden ratio)</strong> — (1 + √5)/2 ≈ 1.61803… <em>Irrational</em>{' '}
                because √5 is irrational. The related <strong>golden angle</strong> ≈ 137.5° is just
                360°/φ² — still built from irrationals, still a real angle on the circle.
              </li>
              <li>
                <strong>e</strong> — base of natural growth ≈ 2.71828… <em>Irrational</em> (and
                transcendental), like π.
              </li>
              <li>
                <strong>√2, √3, √5, …</strong> — square roots of non-perfect squares are{' '}
                <em>irrational</em>. They look like “messy decimals” (1.41421…, 2.23606…) for the
                same reason as π: the digit string never becomes a repeating cycle and never ends.
                By contrast √4 = 2 and √9 = 3 are ordinary integers (rational).
              </li>
              <li>
                <strong>√−1 = i</strong> — <em>imaginary unit</em>, not irrational. Irrationals are
                still real; i is not real. You need it for √(negative) and for rotating the plane
                (the “i” in e^{'{iθ}'} and in cos θ + i sin θ).
              </li>
              <li>
                <strong>Decimals that look long</strong> — length alone does not decide the type.
                ⅓ = 0.333… is rational (repeating). √2 = 1.414213… is irrational (non-repeating). A
                calculator’s rounded display can hide which is which.
              </li>
            </ul>

            <div className="num-type-ladder" aria-label="Nesting of number systems">
              <span className="num-ladder-step">Integers</span>
              <span className="num-ladder-arrow">⊂</span>
              <span className="num-ladder-step">Rationals</span>
              <span className="num-ladder-arrow">⊂</span>
              <span className="num-ladder-step">Reals</span>
              <span className="num-ladder-arrow">⊂</span>
              <span className="num-ladder-step">Complex (a + bi)</span>
            </div>
            <p className="id-caption" style={{ marginTop: '0.75rem' }}>
              Irrationals live inside the reals (beside the rationals). Imaginaries and complexes
              extend sideways off that line — that is how the unit circle gets an “up” direction for
              sine.
            </p>
          </div>
        </section>

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
                <div
                  className="id-formula id-formula--sm id-formula--ratio"
                  aria-label={`F sub n plus 1 over F sub n approaches phi approximately ${PHI.toFixed(6)}`}
                >
                  <span className="id-frac">
                    <span className="id-num">
                      F<sub>n+1</sub>
                    </span>
                    <span className="id-bar" />
                    <span className="id-den">
                      F<sub>n</sub>
                    </span>
                  </span>
                  <span className="id-eq">→</span>
                  <span className="id-big">φ</span>
                  <span className="id-eq">≈</span>
                  <span className="id-num-plain">{PHI.toFixed(6)}…</span>
                </div>
                <ul className="id-list id-list--ratios">
                  <li>
                    <span className="id-ratio-pair">2 / 1</span>
                    <span className="id-eq">=</span>
                    <span>2</span>
                  </li>
                  <li>
                    <span className="id-ratio-pair">3 / 2</span>
                    <span className="id-eq">=</span>
                    <span>1.5</span>
                  </li>
                  <li>
                    <span className="id-ratio-pair">5 / 3</span>
                    <span className="id-eq">≈</span>
                    <span>1.666…</span>
                  </li>
                  <li>
                    <span className="id-ratio-pair">8 / 5</span>
                    <span className="id-eq">=</span>
                    <span>1.6</span>
                  </li>
                  <li>
                    <span className="id-ratio-pair">13 / 8</span>
                    <span className="id-eq">=</span>
                    <span>1.625</span>
                  </li>
                  <li>
                    <span className="id-ratio-pair">…</span>
                    <span className="id-eq">→</span>
                    <span>
                      φ = (1 + √5) / 2
                    </span>
                  </li>
                </ul>
                <p>
                  Each square in the diagram is labeled with its Fibonacci side length.
                </p>
              </div>
              <FibonacciSpiral />
            </div>

            <div className="id-body id-body--phi-angle">
              <h3 className="id-subhead">The golden angle · φ on the circle</h3>
              <div
                className="id-formula id-formula--sm id-formula--ratio"
                aria-label="Golden angle equals 360 degrees over phi squared, approximately 137.5 degrees"
              >
                <span className="id-big">ψ</span>
                <span className="id-eq">=</span>
                <span className="id-frac">
                  <span className="id-num">360°</span>
                  <span className="id-bar" />
                  <span className="id-den">φ²</span>
                </span>
                <span className="id-eq">=</span>
                <span className="id-frac">
                  <span className="id-num">360°</span>
                  <span className="id-bar" />
                  <span className="id-den">φ + 1</span>
                </span>
                <span className="id-eq">≈</span>
                <span className="id-num-plain">137.508°</span>
              </div>
              <p>
                Cut a full turn of a circle in the <strong>golden ratio</strong>: the two arcs stand in
                the same proportion as whole ∶ longer = longer ∶ shorter — exactly the rule that
                defines φ. Because 1/φ = φ − 1 ≈ 0.618, the smaller arc is a fraction 1/φ² of the
                circle (since 1/φ² = 1 − 1/φ). That smaller arc is the <strong>golden angle</strong>{' '}
                ψ ≈ 137.5°.
              </p>
              <ul className="id-list">
                <li>
                  Full circle = 360° · split so the parts obey the golden ratio
                </li>
                <li>
                  Larger arc ≈ 360° / φ ≈ 222.5° · smaller arc ≈ 360° / φ² ≈ 137.5°
                </li>
                <li>
                  Using φ² = φ + 1, the golden angle is also 360° / (φ + 1)
                </li>
              </ul>
              <p>
                In nature this angle packs successive leaves, seeds, or florets around a stem so that
                no two land on the same ray — the most even covering of a circle you get from a fixed
                turn. The same φ that makes F<sub>n+1</sub> / F<sub>n</sub> → φ in the Fibonacci spiral
                therefore appears as a <em>rotation</em> on the unit circle: the golden angle is the
                golden ratio written in degrees.
              </p>
              <div className="id-formula id-formula--sm id-formula--ratio id-formula--phi-rad">
                <span className="id-eq">in radians:</span>
                <span className="id-frac">
                  <span className="id-num">2π</span>
                  <span className="id-bar" />
                  <span className="id-den">φ²</span>
                </span>
                <span className="id-eq">≈</span>
                <span className="id-num-plain">{( (2 * Math.PI) / (PHI * PHI) ).toFixed(4)}…</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
