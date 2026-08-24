/**
 * CustomIcons.jsx
 *
 * Iconos custom SVG para el sistema de licencias. Más distintivos que
 * los íconos genéricos de Lucide, con la identidad visual de SamaPos.
 *
 * Cada ícono acepta { className, size } y devuelve un SVG inline.
 * Los gradientes se referencian por id (definidos en <defs>) para que
 * se vean bien tanto en fondo claro como oscuro.
 */

// IDs únicos por ícono para evitar colisiones de gradiente en el DOM
const GRAD_IDS = {
  amber: 'li-ic-grad-amber',
  red: 'li-ic-grad-red',
  blue: 'li-ic-grad-blue',
  green: 'li-ic-grad-green',
  slate: 'li-ic-grad-slate',
};

function Defs() {
  return (
    <defs>
      <linearGradient id={GRAD_IDS.amber} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id={GRAD_IDS.red} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <linearGradient id={GRAD_IDS.blue} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id={GRAD_IDS.green} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id={GRAD_IDS.slate} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
    </defs>
  );
}

function SvgWrap({ children, className = '', size = 64, viewBox = '0 0 64 64' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// ─── Ícono principal según status ──────────────────────────────
export function CustomIcon({ status, size = 80 }) {
  switch (status) {
    case 'pending':
      return <PendingIcon size={size} />;
    case 'revoked':
      return <RevokedIcon size={size} />;
    case 'expired':
    case 'license_expired':
      return <ExpiredIcon size={size} />;
    case 'license_inactive':
      return <InactiveIcon size={size} />;
    case 'offline':
      return <OfflineIcon size={size} />;
    case 'unknown':
    default:
      return <UnknownIcon size={size} />;
  }
}

// ─── Pendiente: hourglass estilizado con arena cayendo ─────────
function PendingIcon({ size }) {
  return (
    <SvgWrap size={size}>
      <Defs />
      {/* Glow ring */}
      <circle cx="32" cy="32" r="30" fill={`url(#${GRAD_IDS.amber})`} opacity="0.1" />
      {/* Outer ring con gradiente */}
      <circle cx="32" cy="32" r="26" stroke={`url(#${GRAD_IDS.amber})`} strokeWidth="2" fill="none" opacity="0.3" />
      {/* Hourglass body */}
      <path
        d="M 20 12 L 44 12 L 44 18 C 44 24 36 28 32 32 C 28 28 20 24 20 18 Z"
        fill={`url(#${GRAD_IDS.amber})`}
        opacity="0.9"
      />
      <path
        d="M 20 52 L 44 52 L 44 46 C 44 40 36 36 32 32 C 28 36 20 40 20 46 Z"
        fill={`url(#${GRAD_IDS.amber})`}
        opacity="0.5"
      />
      {/* Caps */}
      <rect x="18" y="10" width="28" height="4" rx="2" fill="#92400e" />
      <rect x="18" y="50" width="28" height="4" rx="2" fill="#92400e" />
      {/* Sand grains falling */}
      <circle cx="32" cy="36" r="0.8" fill="#92400e">
        <animate attributeName="cy" values="32;52" dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="1.2s" repeatCount="indefinite" />
      </circle>
    </SvgWrap>
  );
}

// ─── Revocado: escudo roto ─────────────────────────────────────
function RevokedIcon({ size }) {
  return (
    <SvgWrap size={size}>
      <Defs />
      <circle cx="32" cy="32" r="30" fill={`url(#${GRAD_IDS.red})`} opacity="0.1" />
      <path
        d="M 32 8 L 48 14 L 48 30 C 48 42 40 50 32 56 C 24 50 16 42 16 30 L 16 14 Z"
        fill={`url(#${GRAD_IDS.red})`}
        opacity="0.9"
      />
      {/* X cruzada */}
      <path
        d="M 24 24 L 40 40 M 40 24 L 24 40"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </SvgWrap>
  );
}

// ─── Vencido: calendario con tachado ───────────────────────────
function ExpiredIcon({ size }) {
  return (
    <SvgWrap size={size}>
      <Defs />
      <circle cx="32" cy="32" r="30" fill={`url(#${GRAD_IDS.red})`} opacity="0.1" />
      <rect x="14" y="18" width="36" height="32" rx="3" fill={`url(#${GRAD_IDS.red})`} opacity="0.9" />
      <rect x="14" y="18" width="36" height="8" fill="#7f1d1d" />
      <rect x="20" y="14" width="3" height="10" rx="1" fill="#7f1d1d" />
      <rect x="41" y="14" width="3" height="10" rx="1" fill="#7f1d1d" />
      <line x1="14" y1="50" x2="50" y2="14" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </SvgWrap>
  );
}

// ─── Inactivo: escudo apagado ──────────────────────────────────
function InactiveIcon({ size }) {
  return (
    <SvgWrap size={size}>
      <Defs />
      <circle cx="32" cy="32" r="30" fill={`url(#${GRAD_IDS.slate})`} opacity="0.1" />
      <path
        d="M 32 8 L 48 14 L 48 30 C 48 42 40 50 32 56 C 24 50 16 42 16 30 L 16 14 Z"
        fill={`url(#${GRAD_IDS.slate})`}
        opacity="0.7"
      />
      <circle cx="32" cy="32" r="6" fill="white" opacity="0.4" />
    </SvgWrap>
  );
}

// ─── Offline: wifi con onda rota ───────────────────────────────
function OfflineIcon({ size }) {
  return (
    <SvgWrap size={size}>
      <Defs />
      <circle cx="32" cy="32" r="30" fill={`url(#${GRAD_IDS.blue})`} opacity="0.1" />
      <path
        d="M 10 28 Q 32 8 54 28"
        stroke={`url(#${GRAD_IDS.blue})`}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 18 36 Q 32 24 46 36"
        stroke={`url(#${GRAD_IDS.blue})`}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line x1="12" y1="14" x2="52" y2="54" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="44" r="3" fill={`url(#${GRAD_IDS.blue})`} />
    </SvgWrap>
  );
}

// ─── Unknown: signo de pregunta estilizado ─────────────────────
function UnknownIcon({ size }) {
  return (
    <SvgWrap size={size}>
      <Defs />
      <circle cx="32" cy="32" r="30" fill={`url(#${GRAD_IDS.slate})`} opacity="0.1" />
      <circle cx="32" cy="32" r="24" fill={`url(#${GRAD_IDS.slate})`} opacity="0.9" />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize="32"
        fontWeight="700"
        fill="white"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ?
      </text>
    </SvgWrap>
  );
}

// ─── Íconos del stepper ────────────────────────────────────────
export function StepIcon({ state, size = 18 }) {
  if (state === 'done') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs />
        <circle cx="12" cy="12" r="10" fill={`url(#${GRAD_IDS.green})`} />
        <path d="M 7 12 L 10 15 L 17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (state === 'active') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs />
        <circle cx="12" cy="12" r="10" fill={`url(#${GRAD_IDS.amber})`} />
        <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily="ui-sans-serif, system-ui, sans-serif">
          2
        </text>
      </svg>
    );
  }
  // pending
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs />
      <circle cx="12" cy="12" r="10" fill="white" stroke="#cbd5e1" strokeWidth="2" />
      <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="600" fill="#94a3b8" fontFamily="ui-sans-serif, system-ui, sans-serif">
        3
      </text>
    </svg>
  );
}
