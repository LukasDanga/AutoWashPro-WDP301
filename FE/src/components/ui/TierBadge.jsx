import { useState } from 'react';

const TIERS = {
  bronze: {
    label: 'Đồng',
    bg: '#fef3c7', border: '#fcd34d', color: '#b45309',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#d97706" />
        <circle cx="12" cy="12" r="6" fill="#f59e0b" />
        <circle cx="12" cy="12" r="3" fill="#fbbf24" />
      </svg>
    ),
  },
  silver: {
    label: 'Bạc',
    bg: '#f1f5f9', border: '#cbd5e1', color: '#475569',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#94a3b8" />
        <circle cx="12" cy="12" r="6" fill="#cbd5e1" />
        <circle cx="12" cy="12" r="3" fill="#e2e8f0" />
      </svg>
    ),
  },
  gold: {
    label: 'Vàng',
    bg: '#fef9c3', border: '#facc15', color: '#a16207',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#eab308" />
        <circle cx="12" cy="12" r="6" fill="#facc15" />
        <circle cx="12" cy="12" r="3" fill="#fde047" />
      </svg>
    ),
  },
  diamond: {
    label: 'Kim Cương',
    bg: '#ecfeff', border: '#22d3ee', color: '#0e7490',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 9l10 13L22 9L12 2z" fill="#06b6d4" />
        <path d="M12 2L7 9l5 13" fill="#22d3ee" />
        <path d="M12 2l5 7-5 13" fill="#67e8f9" />
      </svg>
    ),
  },
};

export default function TierBadge({ tier }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const t = TIERS[tier];

  if (!tier || tier === 'none' || !t) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border"
        style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }}>
        —
      </span>
    );
  }

  return (
    <span className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}>
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border cursor-default"
        style={{ background: t.bg, borderColor: t.border, color: t.color, lineHeight: '16px' }}>
        {t.icon}
      </span>
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white whitespace-nowrap z-50 pointer-events-none"
          style={{ background: 'rgba(15,23,42,0.9)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {t.label}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent"
            style={{ borderTopColor: 'rgba(15,23,42,0.9)' }} />
        </span>
      )}
    </span>
  );
}
