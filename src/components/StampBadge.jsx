const STATUSES = {
  draft: { dot: '#8B96AC', text: '#C3CADA', bg: '#1C2940', label: 'Draft' },
  submitted: { dot: '#F59E0B', text: '#FCD34D', bg: '#2E2308', label: 'Pending' },
  approved: { dot: '#10B981', text: '#6EE7B7', bg: '#0F2A22', label: 'Approved' },
  rejected: { dot: '#F43F5E', text: '#FDA4AF', bg: '#301019', label: 'Rejected' },
  in_review: { dot: '#2563EB', text: '#7FA8F8', bg: '#0E1A38', label: 'In Review' },
  active: { dot: '#10B981', text: '#6EE7B7', bg: '#0F2A22', label: 'Active' },
  completed: { dot: '#2563EB', text: '#7FA8F8', bg: '#0E1A38', label: 'Finished' },
}

const SIZES = {
  xs: { dot: 5, text: 10, pad: '2px 8px', gap: 4 },
  sm: { dot: 6, text: 11, pad: '3px 9px', gap: 5 },
  md: { dot: 7, text: 12, pad: '4px 11px', gap: 6 },
  lg: { dot: 9, text: 14, pad: '6px 14px', gap: 7 },
}

/**
 * Status pill: colored dot + label, matching the Midnight Festival spec
 * (🟢 Approved / 🟡 Pending / 🔴 Rejected / 🔵 In Review). Pops in with a
 * small bounce when `animate` is set, e.g. right after a status change.
 */
export default function StampBadge({ status, size = 'md', animate = false }) {
  const s = STATUSES[status] || STATUSES.draft
  const sz = SIZES[size] || SIZES.md

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold shrink-0 ${animate ? 'badge-pop' : ''}`}
      style={{
        gap: sz.gap,
        padding: sz.pad,
        fontSize: sz.text,
        color: s.text,
        backgroundColor: s.bg,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{ width: sz.dot, height: sz.dot, backgroundColor: s.dot, boxShadow: `0 0 6px ${s.dot}99` }}
      />
      {s.label}
    </span>
  )
}
