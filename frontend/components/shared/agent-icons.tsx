"use client";

interface IconProps {
  className?: string;
  animated?: boolean;
}

/** Neural brain — Planner agent */
export function PlannerIcon({ className = "", animated = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Brain outline */}
      <path
        d="M24 4C16 4 10 10 10 18c0 4 2 8 5 10l-1 10c0 2 2 4 4 4h12c2 0 4-2 4-4l-1-10c3-2 5-6 5-10 0-8-6-14-14-14z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neural pathways */}
      <circle cx="18" cy="16" r="2" fill="currentColor" opacity="0.8">
        {animated && <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx="30" cy="16" r="2" fill="currentColor" opacity="0.8">
        {animated && <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin="0.5s" repeatCount="indefinite" />}
      </circle>
      <circle cx="24" cy="10" r="2" fill="currentColor" opacity="0.8">
        {animated && <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin="1s" repeatCount="indefinite" />}
      </circle>
      <circle cx="24" cy="22" r="2" fill="currentColor" opacity="0.8">
        {animated && <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin="0.3s" repeatCount="indefinite" />}
      </circle>
      <circle cx="16" cy="22" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="32" cy="22" r="1.5" fill="currentColor" opacity="0.6" />
      {/* Connections */}
      <line x1="18" y1="16" x2="24" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="30" y1="16" x2="24" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="18" y1="16" x2="24" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="30" y1="16" x2="24" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="16" y1="22" x2="18" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="32" y1="22" x2="30" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Glow pulse */}
      {animated && (
        <circle cx="24" cy="16" r="8" fill="currentColor" opacity="0.05">
          <animate attributeName="r" values="6;12;6" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.05;0.12;0.05" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

/** Radar sweep — Source Discovery agent */
export function DiscoveryIcon({ className = "", animated = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Radar rings */}
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Sweep line */}
      <line x1="24" y1="24" x2="24" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
        {animated && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 24 24"
            to="360 24 24"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </line>
      {/* Sweep cone */}
      {animated && (
        <path d="M24 24 L24 6 A18 18 0 0 1 36 12 Z" fill="currentColor" opacity="0.06">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 24 24"
            to="360 24 24"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>
      )}
      {/* Blips */}
      <circle cx="30" cy="12" r="2" fill="currentColor" opacity="0.8">
        {animated && <animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" />}
      </circle>
      <circle cx="14" cy="20" r="1.5" fill="currentColor" opacity="0.6">
        {animated && <animate attributeName="opacity" values="0.6;0.1;0.6" dur="3s" begin="1s" repeatCount="indefinite" />}
      </circle>
      <circle cx="28" cy="32" r="1.5" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" begin="2s" repeatCount="indefinite" />}
      </circle>
      {/* Center dot */}
      <circle cx="24" cy="24" r="2.5" fill="currentColor" />
    </svg>
  );
}

/** Data stream — Extraction agent */
export function ExtractionIcon({ className = "", animated = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Funnel top */}
      <path d="M8 8h32l-6 14H14L8 8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Funnel bottom */}
      <path d="M18 22h12l-2 18H20L18 22z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Data particles flowing down */}
      <circle cx="16" cy="14" r="1.5" fill="currentColor" opacity="0.7">
        {animated && <animate attributeName="cy" values="10;18;10" dur="1.5s" repeatCount="indefinite" />}
      </circle>
      <circle cx="24" cy="12" r="1.5" fill="currentColor" opacity="0.7">
        {animated && <animate attributeName="cy" values="8;16;8" dur="1.5s" begin="0.3s" repeatCount="indefinite" />}
      </circle>
      <circle cx="32" cy="14" r="1.5" fill="currentColor" opacity="0.7">
        {animated && <animate attributeName="cy" values="10;18;10" dur="1.5s" begin="0.6s" repeatCount="indefinite" />}
      </circle>
      {/* Output dots */}
      <circle cx="22" cy="34" r="1" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0;0.8;0" dur="1.5s" begin="0.8s" repeatCount="indefinite" />}
      </circle>
      <circle cx="26" cy="36" r="1" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0;0.8;0" dur="1.5s" begin="1s" repeatCount="indefinite" />}
      </circle>
    </svg>
  );
}

/** Shield with pulse — Critic agent */
export function CriticIcon({ className = "", animated = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Shield */}
      <path
        d="M24 4L6 12v12c0 10 8 18 18 22 10-4 18-12 18-22V12L24 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Pulse line */}
      <polyline
        points="12,24 18,24 21,18 24,30 27,22 30,24 36,24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      >
        {animated && (
          <animate
            attributeName="stroke-dashoffset"
            from="40"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </polyline>
      {animated && (
        <polyline
          points="12,24 18,24 21,18 24,30 27,22 30,24 36,24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="40"
          opacity="0.8"
        >
          <animate attributeName="stroke-dashoffset" from="40" to="0" dur="2s" repeatCount="indefinite" />
        </polyline>
      )}
    </svg>
  );
}

/** Diamond with checkmark — Validator agent */
export function ValidatorIcon({ className = "", animated = false }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Diamond */}
      <path
        d="M24 4L42 24L24 44L6 24L24 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner diamond */}
      <path
        d="M24 12L34 24L24 36L14 24L24 12z"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
        fill="none"
      />
      {/* Checkmark */}
      <polyline
        points="18,24 22,28 30,20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Sparkles */}
      <circle cx="24" cy="6" r="1" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx="40" cy="24" r="1" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.5s" repeatCount="indefinite" />}
      </circle>
      <circle cx="24" cy="42" r="1" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="1s" repeatCount="indefinite" />}
      </circle>
      <circle cx="8" cy="24" r="1" fill="currentColor" opacity="0.5">
        {animated && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="1.5s" repeatCount="indefinite" />}
      </circle>
    </svg>
  );
}

export const agentIconMap: Record<string, React.ComponentType<IconProps>> = {
  brain: PlannerIcon,
  search: DiscoveryIcon,
  database: ExtractionIcon,
  shield: CriticIcon,
  check: ValidatorIcon,
};
