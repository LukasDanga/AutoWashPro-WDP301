import { motion } from 'framer-motion';

export default function HistoryPage({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[1.5rem] border border-slate-200 p-10 md:p-14 text-center max-w-md w-full"
      >
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lịch sử đặt lịch</h2>
        <p className="text-slate-500 text-sm mb-8">Tính năng đang phát triển</p>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-8">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
        <button onClick={onBack}
          className="px-8 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
          Quay lại trang chủ
        </button>
      </motion.div>
    </div>
  );
}
