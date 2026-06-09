export default function TierBadge({ tier }) {
  if (!tier || tier === 'none') {
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">Không có hạng</span>;
  }
  if (tier === "silver") {
    return <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-300 shadow-sm">Bạc</span>;
  } else if (tier === "gold") {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 border border-yellow-200 shadow-sm">Vàng</span>;
  } else if (tier === "diamond") {
    return <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700 border border-cyan-200 shadow-sm">Kim Cương</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-amber-100/50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200 shadow-sm">Đồng</span>;
}
