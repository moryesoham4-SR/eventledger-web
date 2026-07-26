const STAMPS = {
  draft: { ink: '#5C6B62', label: 'Draft' },
  submitted: { ink: '#96692B', label: 'Submitted' },
  approved: { ink: '#195A4A', label: 'Approved' },
  rejected: { ink: '#872E2E', label: 'Rejected' },
  active: { ink: '#195A4A', label: 'Active' },
  completed: { ink: '#16231F', label: 'Finished' },
}

const SIZES = {
  xs: { box: 30, font: 6, border: 1, ring: 1.5 },
  sm: { box: 44, font: 7.5, border: 1.5, ring: 2 },
  md: { box: 60, font: 9, border: 2, ring: 3 },
  lg: { box: 84, font: 11, border: 2.5, ring: 4 },
}

/**
 * The one deliberately bold element in the design: a rotated rubber-stamp
 * badge for proposal/event status, standing in for the flat colored pill
 * every other dashboard uses. Everything else in the design stays quiet so
 * this can do the work of signaling state.
 */
export default function StampBadge({ status, size = 'md', animate = false }) {
  const stamp = STAMPS[status] || STAMPS.draft
  const s = SIZES[size] || SIZES.md

  return (
    <span
      className={`inline-flex items-center justify-center select-none shrink-0 ${animate ? 'stamp-slam' : ''}`}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: '9999px',
        border: `${s.border}px solid ${stamp.ink}`,
        boxShadow: `inset 0 0 0 ${s.ring}px ${stamp.ink}14, inset 0 0 0 ${s.ring + s.border}px ${stamp.ink}`,
        transform: 'rotate(-7deg)',
        color: stamp.ink,
      }}
      title={stamp.label}
    >
      <span
        className="font-mono font-bold uppercase text-center leading-[1.05] px-1"
        style={{ fontSize: s.font, letterSpacing: '0.04em' }}
      >
        {stamp.label}
      </span>
    </span>
  )
}
