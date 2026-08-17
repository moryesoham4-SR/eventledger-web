import { useTheme } from '../context/ThemeContext'

// Dot color stays the same across themes (a small saturated accent reads
// fine on either background) — only the pill's tint background and text
// need to flip between a dark tint (dark mode) and a pale tint (light mode).
const DOTS = {
  draft: '#8B96AC',
  submitted: '#F59E0B',
  approved: '#10B981',
  rejected: '#F43F5E',
  in_review: '#2563EB',
  active: '#10B981',
  completed: '#2563EB',
}

const LABELS = {
  draft: 'Draft',
  submitted: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  in_review: 'In Review',
  active: 'Active',
  completed: 'Finished',
}

const DARK_TINTS = {
  draft: { bg: '#1C2940', text: '#C3CADA' },
  submitted: { bg: '#2E2308', text: '#FCD34D' },
  approved: { bg: '#0F2A22', text: '#6EE7B7' },
  rejected: { bg: '#301019', text: '#FDA4AF' },
  in_review: { bg: '#0E1A38', text: '#7FA8F8' },
  active: { bg: '#0F2A22', text: '#6EE7B7' },
  completed: { bg: '#0E1A38', text: '#7FA8F8' },
}

const LIGHT_TINTS = {
  draft: { bg: '#EEF1F6', text: '#475569' },
  submitted: { bg: '#FEF3C7', text: '#92400E' },
  approved: { bg: '#D1FAE5', text: '#065F46' },
  rejected: { bg: '#FFE1E5', text: '#9F1239' },
  in_review: { bg: '#DBEAFE', text: '#1E40AF' },
  active: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#DBEAFE', text: '#1E40AF' },
}

const SIZES = {
  xs: { dot: 5, text: 10, pad: '2px 8px', gap: 4 },
  sm: { dot: 6, text: 11, pad: '3px 9px', gap: 5 },
  md: { dot: 7, text: 12, pad: '4px 11px', gap: 6 },
  lg: { dot: 9, text: 14, pad: '6px 14px', gap: 7 },
}

/**
 * Status pill: colored dot + label. Pops in with a small bounce when
 * `animate` is set, e.g. right after a status change. Colors adapt to the
 * current light/dark theme (see ThemeContext).
 */
export default function StampBadge({ status, size = 'md', animate = false }) {
  const { theme } = useTheme()
  const key = DOTS[status] ? status : 'draft'
  const tint = (theme === 'light' ? LIGHT_TINTS : DARK_TINTS)[key]
  const dot = DOTS[key]
  const label = LABELS[key]
  const sz = SIZES[size] || SIZES.md

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold shrink-0 ${animate ? 'badge-pop' : ''}`}
      style={{
        gap: sz.gap,
        padding: sz.pad,
        fontSize: sz.text,
        color: tint.text,
        backgroundColor: tint.bg,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{ width: sz.dot, height: sz.dot, backgroundColor: dot, boxShadow: `0 0 6px ${dot}99` }}
      />
      {label}
    </span>
  )
}
