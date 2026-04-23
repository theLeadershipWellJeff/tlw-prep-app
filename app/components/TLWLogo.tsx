export function TLWLogo({ size = 40, light = false, onClick, style, className }: { size?: number; light?: boolean; onClick?: () => void; style?: React.CSSProperties; className?: string }) {
  const squareColor = light ? '#F2F2F0' : '#0C1940'
  const plusColor = '#8B8680'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block' }}
    >
      <polyline
        points="62,10 10,10 10,90 90,90 90,46"
        stroke={squareColor}
        strokeWidth="7"
        fill="none"
        strokeLinecap="square"
        strokeOpacity={light ? '.92' : '1'}
      />
      <line x1="76" y1="16" x2="76" y2="40" stroke={plusColor} strokeWidth="7" strokeLinecap="round" />
      <line x1="64" y1="28" x2="88" y2="28" stroke={plusColor} strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}
