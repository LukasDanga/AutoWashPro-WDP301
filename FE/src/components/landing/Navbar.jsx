import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ onOpenAuth }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = ['Dịch vụ', 'Cách hoạt động', 'Khách hàng', 'Liên hệ'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-5 md:px-12">
        <div className="flex items-center justify-center h-12 md:h-16 gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-white/80 hover:text-emerald-300 transition-colors duration-200 font-medium drop-shadow-sm"
              >
                {item}
              </a>
            ))}
          </div>

          <button
            onClick={onOpenAuth}
            className="px-4 md:px-5 py-1.5 md:py-2 rounded-full border border-white/30 text-white text-xs md:text-sm font-medium
              hover:bg-white/10 transition-colors duration-200 drop-shadow-sm"
          >
            Đăng nhập
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-8 h-8 rounded-full border border-white/30 flex items-center justify-center"
          >
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/40 backdrop-blur-md overflow-hidden"
          >
            <div className="px-5 py-3 space-y-2.5">
              {navItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setIsOpen(false)}
                  className="block text-white/70 hover:text-emerald-300 text-sm font-medium transition-colors drop-shadow-sm"
                >
                  {item}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
