import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ onOpenAuth, user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [prevScroll, setPrevScroll] = useState(0);

  const navItems = [
    { label: 'Đặt lịch', href: '#booking' },
    { label: 'Gói slot', href: '#packages' },
    { label: 'Quà tặng', href: '#giftstore' },
    { label: 'Cửa hàng', href: '#map' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current < 50) {
        setVisible(true);
      } else if (current > prevScroll) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setPrevScroll(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScroll]);

  return (
    <AnimatePresence>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: visible ? 0 : -80, opacity: visible ? 1 : 0 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[5000]"
      >
        <div className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/70 backdrop-blur-xl px-2 py-1.5 shadow-lg shadow-black/5 dark:bg-neutral-900/70 dark:border-neutral-800">
          <div className="flex items-center gap-1">
            {navItems.map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                className="relative flex items-center gap-1 rounded-full px-3.5 py-2 text-xs md:text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {user.name || user.email}
              </span>
              <button
                onClick={onLogout}
                className="relative rounded-full border border-neutral-300 px-3 py-1.5 text-xs md:text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Thoát
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="relative rounded-full bg-neutral-900 px-4 py-2 text-xs md:text-sm font-medium text-white transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Đăng nhập
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center ml-1"
          >
            <svg className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mt-2"
            >
              <div className="px-4 py-3 space-y-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </AnimatePresence>
  );
}
