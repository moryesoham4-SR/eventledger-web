/**
 * The EventLedger AI mark: a clean vector bolt instead of an emoji glyph
 * (emoji rendering varies by device/font and looks muddy at small sizes).
 * `size` sets the tile's pixel dimensions.
 */
export default function Logo({ size = 56 }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #FF7A00, #FF9B40)',
        boxShadow: '0 0 24px #FF7A0055',
      }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 2 L4 14 H11 L10 22 L20 9 H13 L13 2 Z"
          fill="#0B1220"
          stroke="#0B1220"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
