import { useState } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Diamond,
  Sparkle,
  Shield,
  ShieldStar,
  MedalMilitary,
  Flame,
  Lightning,
  Gift,
  Coin,
  Heart,
  Rocket,
  Sun,
  Circle,
  SealCheck,
  MagicWand,
  Fire,
  CheckCircle,
} from '@phosphor-icons/react';

export const ICON_CATALOG = [
  { name: 'Circle', label: 'Vòng tròn', icon: Circle },
  { name: 'Medal', label: 'Huy chương', icon: Medal },
  { name: 'Crown', label: 'Vương miện', icon: Crown },
  { name: 'Diamond', label: 'Kim cương', icon: Diamond },
  { name: 'Trophy', label: 'Cúp vô địch', icon: Trophy },
  { name: 'Star', label: 'Ngôi sao', icon: Star },
  { name: 'Sparkle', label: 'Lấp lánh', icon: Sparkle },
  { name: 'Shield', label: 'Khiên bảo vệ', icon: Shield },
  { name: 'ShieldStar', label: 'Khiên ngôi sao', icon: ShieldStar },
  { name: 'MedalMilitary', label: 'Huân chương', icon: MedalMilitary },
  { name: 'Flame', label: 'Ngọn lửa', icon: Flame },
  { name: 'Lightning', label: 'Tia sét', icon: Lightning },
  { name: 'Gift', label: 'Hộp quà', icon: Gift },
  { name: 'Coin', label: 'Đồng xu', icon: Coin },
  { name: 'Heart', label: 'Trái tim', icon: Heart },
  { name: 'Rocket', label: 'Tên lửa', icon: Rocket },
  { name: 'Sun', label: 'Mặt trời', icon: Sun },
  { name: 'SealCheck', label: 'Xác thực V.I.P', icon: SealCheck },
  { name: 'MagicWand', label: 'Gậy phép', icon: MagicWand },
  { name: 'Fire', label: 'Lửa cháy', icon: Fire },
  { name: 'CheckCircle', label: 'Tích xanh', icon: CheckCircle },
];

export const COLOR_PALETTE = [
  { id: 'bronze', label: 'Màu Đồng (Cam Vàng)', bg: '#fef3c7', border: '#fcd34d', color: '#b45309', preview: '#d97706' },
  { id: 'silver', label: 'Màu Bạc (Xám Bạc)', bg: '#f1f5f9', border: '#cbd5e1', color: '#475569', preview: '#94a3b8' },
  { id: 'gold', label: 'Màu Vàng (Vàng Hoàng Gia)', bg: '#fef9c3', border: '#facc15', color: '#a16207', preview: '#eab308' },
  { id: 'diamond', label: 'Màu Kim Cương (Xanh Ngọc)', bg: '#ecfeff', border: '#22d3ee', color: '#0e7490', preview: '#06b6d4' },
  { id: 'purple', label: 'Màu Tím (V.I.P Huyền Bí)', bg: '#faf5ff', border: '#e9d5ff', color: '#7e22ce', preview: '#9333ea' },
  { id: 'rose', label: 'Màu Hồng/Đỏ (Ruby Cao Cấp)', bg: '#fff1f2', border: '#fecdd3', color: '#be123c', preview: '#e11d48' },
  { id: 'emerald', label: 'Màu Xanh Lá (Lục Bảo)', bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', preview: '#10b981' },
  { id: 'indigo', label: 'Màu Chàm (Sapphire)', bg: '#e0e7ff', border: '#c7d2fe', color: '#4338ca', preview: '#4f46e5' },
];

const ICON_MAP = ICON_CATALOG.reduce((acc, item) => {
  acc[item.name] = item.icon;
  return acc;
}, {});

const PRESET_TIERS = {
  bronze: {
    label: 'Đồng',
    bg: '#fef3c7',
    border: '#fcd34d',
    color: '#b45309',
    iconName: 'Circle',
  },
  silver: {
    label: 'Bạc',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    color: '#475569',
    iconName: 'Medal',
  },
  gold: {
    label: 'Vàng',
    bg: '#fef9c3',
    border: '#facc15',
    color: '#a16207',
    iconName: 'Crown',
  },
  diamond: {
    label: 'Kim Cương',
    bg: '#ecfeff',
    border: '#22d3ee',
    color: '#0e7490',
    iconName: 'Diamond',
  },
};

export function RenderIcon({ name, size = 13, className = '' }) {
  const IconComp = ICON_MAP[name];
  if (!IconComp) return null;
  return <IconComp size={size} weight="fill" className={className} />;
}

export default function TierBadge({ tier, iconName }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const tierId = typeof tier === 'object' ? tier?.id : tier;
  const customName = typeof tier === 'object' ? tier?.name : null;
  const customIconName = typeof tier === 'object' ? tier?.icon : iconName;
  const customBg = typeof tier === 'object' ? tier?.bg : null;
  const customBorder = typeof tier === 'object' ? tier?.border : null;
  const customColor = typeof tier === 'object' ? tier?.color : null;
  const colorThemeId = typeof tier === 'object' ? tier?.colorTheme : null;

  const tierIdLower = (tierId || '').toLowerCase();
  const preset = PRESET_TIERS[tierIdLower] || {
    label: customName || tierId || 'Thành viên',
    bg: '#f1f5f9',
    border: '#e2e8f0',
    color: '#475569',
    iconName: 'Star',
  };

  const colorPreset = COLOR_PALETTE.find((c) => c.id === colorThemeId) || COLOR_PALETTE.find((c) => c.id === tierIdLower);

  const bg = customBg || colorPreset?.bg || preset.bg;
  const border = customBorder || colorPreset?.border || preset.border;
  const color = customColor || colorPreset?.color || preset.color;

  const label = customName || preset.label;

  const defaultPresetIcons = {
    bronze: 'Circle',
    silver: 'Medal',
    gold: 'Crown',
    diamond: 'Diamond',
  };

  let targetIconName = customIconName;
  if (!targetIconName || (targetIconName === 'Circle' && tierIdLower !== 'bronze')) {
    targetIconName = defaultPresetIcons[tierIdLower] || preset.iconName || 'Star';
  }

  const IconComp = ICON_MAP[targetIconName] || Circle;

  if (!tier || tier === 'none') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border"
        style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }}
      >
        —
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border cursor-default"
        style={{ background: bg, borderColor: border, color: color, lineHeight: '16px' }}
      >
        <IconComp size={12} weight="fill" />
        <span>{label}</span>
      </span>
      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white whitespace-nowrap z-50 pointer-events-none"
          style={{ background: 'rgba(15,23,42,0.9)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          {label}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent"
            style={{ borderTopColor: 'rgba(15,23,42,0.9)' }}
          />
        </span>
      )}
    </span>
  );
}
