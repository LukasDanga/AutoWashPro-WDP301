import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);
  const [visible, setVisible] = useState(true);
  const [prevScroll, setPrevScroll] = useState(0);

  const navItems = [
    { label: 'Đặt lịch', to: '/booking' },
    { label: 'Gói slot', to: '/packages' },
    { label: 'Quà tặng', to: '/gifts' },
    { label: 'Cửa hàng', to: '/map' },
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
          <Link to="/" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs md:text-sm font-bold text-emerald-600 hover:text-emerald-500 transition-colors shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">AutoWashPro</span>
            <span className="sm:hidden">AWP</span>
          </Link>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex items-center gap-1">
            {navItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.to}
                className="relative flex items-center gap-1 rounded-full px-3.5 py-2 text-xs md:text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />

          {user ? (
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3.5 py-2 text-xs md:text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <svg className="w-3.5 h-3.5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" />
                </svg>
                {user.name || user.email}
                <svg className={`w-3 h-3 text-neutral-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-neutral-200 bg-white/90 backdrop-blur-xl shadow-lg dark:border-neutral-700 dark:bg-neutral-900/90 overflow-hidden"
                  >
                    <button onClick={() => { setProfileOpen(false); onGoToProfile?.(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" />
                      </svg>
                      Hồ sơ
                    </button>
                    <button onClick={() => { setProfileOpen(false); onGoToHistory?.(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                      </svg>
                      Lịch sử
                    </button>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                    <button onClick={onLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                      Thoát
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </AnimatePresence>
  );
}
