export interface TierTheme {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
  gradient: [string, string];
}

export function getTierTheme(tier?: string): TierTheme {
  const t = (tier || 'bronze').toLowerCase();
  switch (t) {
    case 'silver':
    case 'bạc':
      return {
        label: 'BẠC',
        textColor: '#475569', // Metallic Silver Slate
        bgColor: '#F1F5F9',   // Light Slate tint
        borderColor: '#CBD5E1',
        iconName: 'medal-outline',
        gradient: ['#94A3B8', '#475569'],
      };
    case 'gold':
    case 'vàng':
      return {
        label: 'VÀNG',
        textColor: '#D97706', // Royal Gold
        bgColor: '#FEF3C7',   // Light Gold tint
        borderColor: '#FDE68A',
        iconName: 'trophy-outline',
        gradient: ['#F59E0B', '#B45309'],
      };
    case 'diamond':
    case 'kim cương':
      return {
        label: 'KIM CƯƠNG',
        textColor: '#0284C7', // Diamond Cyan/Blue
        bgColor: '#E0F2FE',   // Cyan tint
        borderColor: '#BAE6FD',
        iconName: 'diamond-outline',
        gradient: ['#38BDF8', '#0369A1'],
      };
    case 'bronze':
    case 'đồng':
    default:
      return {
        label: 'ĐỒNG',
        textColor: '#C2410C', // Metallic Bronze / Copper Amber
        bgColor: '#FFEDD5',   // Soft Bronze tint
        borderColor: '#FDBA74',
        iconName: 'shield-checkmark-outline',
        gradient: ['#F97316', '#C2410C'],
      };
  }
}
