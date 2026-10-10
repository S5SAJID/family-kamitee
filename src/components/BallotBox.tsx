import {forwardRef, useImperativeHandle, useMemo, useRef} from 'react';

export interface BallotBoxHandle {
  /** Shake the box and jumble the parchis. Resolves when done. */
  shuffle: (ms: number) => Promise<void>;
  /** A folded parchi rises out of the slot. */
  rise: () => Promise<void>;
  reset: () => void;
}

// Parchi paper colours come from the theme's categorical tokens.
const PAPER = [
  'var(--color-background-yellow)',
  'var(--color-background-green)',
  'var(--color-background-blue)',
  'var(--color-background-pink)',
  'var(--color-background-orange)',
  'var(--color-background-purple)',
  'var(--color-background-teal)',
];

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Glass ballot box with folded parchis. Pure SVG; every colour is a token so
 * it follows the active theme.
 */
export const BallotBox = forwardRef<BallotBoxHandle, {count: number; label: string}>(function BallotBox(
  {count, label},
  ref,
) {
  const boxRef = useRef<SVGGElement>(null);
  const parchiRefs = useRef<(SVGGElement | null)[]>([]);
  const winnerRef = useRef<SVGGElement>(null);

  const papers = useMemo(() => {
    const n = Math.min(Math.max(count, 0), 16);
    // deterministic pseudo-random layout so it doesn't jump between renders
    return Array.from({length: n}, (_, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        x: 92 + col * 36 + ((i * 7) % 11) - 5,
        y: 212 - row * 16 + ((i * 5) % 7) - 3,
        rot: ((i * 37) % 50) - 25,
        fill: PAPER[i % PAPER.length],
      };
    });
  }, [count]);

  useImperativeHandle(ref, () => ({
    shuffle: async ms => {
      const dur = reduceMotion() ? Math.min(ms, 400) : ms;
      const anims: Animation[] = [];
      if (boxRef.current) {
        anims.push(
          boxRef.current.animate(
            [
              {transform: 'translate(0,0) rotate(0deg)'},
              {transform: 'translate(-7px,-2px) rotate(-2.5deg)'},
              {transform: 'translate(6px,1px) rotate(2deg)'},
              {transform: 'translate(-4px,-1px) rotate(-1.5deg)'},
              {transform: 'translate(0,0) rotate(0deg)'},
            ],
            {duration: 320, iterations: Math.max(1, Math.round(dur / 320)), easing: 'ease-in-out'},
          ),
        );
      }
      parchiRefs.current.forEach((el, i) => {
        if (!el) return;
        const dx = ((i * 29) % 40) - 20;
        const dy = -20 - ((i * 13) % 50);
        anims.push(
          el.animate(
            [
              {transform: 'translate(0,0) rotate(0deg)'},
              {transform: `translate(${dx}px,${dy}px) rotate(${(i % 2 ? 1 : -1) * 160}deg)`},
              {transform: `translate(${-dx / 2}px,${dy / 3}px) rotate(${(i % 2 ? -1 : 1) * 90}deg)`},
              {transform: 'translate(0,0) rotate(0deg)'},
            ],
            {duration: 520 + (i % 4) * 90, iterations: Math.max(1, Math.round(dur / 600)), easing: 'ease-in-out', delay: (i % 5) * 30},
          ),
        );
      });
      await Promise.all(anims.map(a => a.finished.catch(() => undefined)));
    },
    rise: async () => {
      const el = winnerRef.current;
      if (!el) return;
      const a = el.animate(
        [
          {transform: 'translate(0px, 40px) scale(0.6) rotate(-8deg)', opacity: 0},
          {transform: 'translate(0px, -10px) scale(0.9) rotate(4deg)', opacity: 1, offset: 0.45},
          {transform: 'translate(0px, -70px) scale(1.5) rotate(0deg)', opacity: 1},
        ],
        {duration: reduceMotion() ? 200 : 1000, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards'},
      );
      await a.finished.catch(() => undefined);
    },
    reset: () => {
      winnerRef.current?.getAnimations().forEach(a => a.cancel());
    },
  }));

  return (
    <svg viewBox="0 0 320 300" width="100%" height="100%" role="img" aria-label={label}>
      <ellipse cx="160" cy="276" rx="118" ry="12" style={{fill: 'var(--color-shadow)'}} />
      {/* winner parchi (behind lid, rises out of slot) */}
      <g ref={winnerRef} style={{opacity: 0, transformBox: 'fill-box', transformOrigin: 'center'}}>
        <rect x="128" y="56" width="64" height="34" rx="4" style={{fill: 'var(--color-background-yellow)', stroke: 'var(--color-border-yellow)', strokeWidth: 1.5}} />
        <path d="M128 73 H192" style={{stroke: 'var(--color-border-yellow)', strokeWidth: 1.2, strokeDasharray: '3 3'}} />
        <path d="M150 56 L160 66 L170 56" style={{fill: 'none', stroke: 'var(--color-border-yellow)', strokeWidth: 1.2}} />
      </g>
      <g ref={boxRef} style={{transformBox: 'fill-box', transformOrigin: 'center bottom'}}>
        {/* glass body */}
        <rect x="60" y="96" width="200" height="170" rx="10" style={{fill: 'var(--color-background-muted)', stroke: 'var(--color-border-emphasized)', strokeWidth: 3}} />
        {/* parchis */}
        {papers.map((p, i) => (
          <g
            key={i}
            ref={el => {
              parchiRefs.current[i] = el;
            }}
            style={{transformBox: 'fill-box', transformOrigin: 'center'}}>
            <g transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <rect x="-15" y="-8" width="30" height="16" rx="2.5" style={{fill: p.fill, stroke: 'var(--color-border-emphasized)', strokeWidth: 1}} />
              <path d="M-15 0 H15" style={{stroke: 'var(--color-border-emphasized)', strokeWidth: 0.8, strokeDasharray: '2 2'}} />
            </g>
          </g>
        ))}
        {/* glass shine */}
        <path d="M78 112 L78 200" style={{stroke: 'var(--color-background-surface)', strokeWidth: 6, strokeLinecap: 'round', opacity: 0.8}} />
        {/* label band */}
        <rect x="60" y="128" width="200" height="34" style={{fill: 'var(--color-background-surface)', stroke: 'var(--color-border-emphasized)', strokeWidth: 2}} />
        <text x="160" y="151" textAnchor="middle" style={{fill: 'var(--color-text-primary)', font: '700 15px var(--font-family-heading)', letterSpacing: 3}}>
          QUR'ANDAZI
        </text>
        {/* lid with slot */}
        <rect x="48" y="80" width="224" height="22" rx="6" style={{fill: 'var(--color-background-inverted)'}} />
        <rect x="124" y="87" width="72" height="8" rx="4" style={{fill: 'var(--color-background-body)'}} />
      </g>
    </svg>
  );
});
