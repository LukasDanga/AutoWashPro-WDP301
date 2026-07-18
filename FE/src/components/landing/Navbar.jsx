import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';

export default function Navbar({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [prevScroll, setPrevScroll] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setIsScrolled(current >= 50);
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

  const navItems = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Giới thiệu', to: '/about' },
    { label: 'Đặt lịch', to: '/booking' },

    { label: 'Quà tặng', to: '/gifts' },
    { label: 'Cửa hàng', to: '/map' },
  ];

  function isActive(to) {
    return location.pathname === to;
  }

  const isTransparent = location.pathname === '/' && !isScrolled;

  return (
    <AnimatePresence>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: visible ? 0 : -80, opacity: visible ? 1 : 0 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-[5000] transition-colors duration-300 ${
          isTransparent 
            ? 'bg-gradient-to-b from-black/50 to-transparent border-transparent' 
            : 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Logo - left */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className={`text-base font-bold ${isTransparent ? 'text-white' : 'text-slate-900'}`}>
                Auto<span className="text-emerald-500">Wash</span>Pro
              </span>
            </Link>

            {/* Nav links - center */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive(item.to)
                      ? (isTransparent ? 'text-white font-bold' : 'text-emerald-600')
                      : (isTransparent ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-emerald-600')
                  }`}
                >
                  {item.to === '/gifts' && <Gift size={16} className={isActive(item.to) ? (isTransparent ? 'text-white' : 'text-emerald-600') : (isTransparent ? 'text-white/80' : 'text-emerald-500')} />}
                  {item.label}
                  {isActive(item.to) && (
                    <span className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${isTransparent ? 'bg-white' : 'bg-emerald-600'}`} />
                  )}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {user ? (
                <div ref={profileRef} className="relative">
                  <button onClick={() => setProfileOpen(!profileOpen)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                      isTransparent 
                        ? 'text-white border-white/30 hover:bg-white/10' 
                        : 'text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="hidden sm:inline">{user.name}</span>
                    <svg className="w-4 h-4 ml-1 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
                      >
                        <button onClick={() => { setProfileOpen(false); onGoToProfile?.(); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" />
                          </svg>
                          Hồ sơ
                        </button>
                        <button onClick={() => { setProfileOpen(false); onGoToHistory?.(); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                          </svg>
                          Lịch sử
                        </button>
                        <button onClick={() => { setProfileOpen(false); onGoToPayments?.(); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                          </svg>
                          Thanh toán
                        </button>
                        <button onClick={() => { setProfileOpen(false); onGoToNotifications?.(); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                          </svg>
                          Thông báo
                        </button>
                        <div className="h-px bg-slate-200" />
                        <button onClick={onLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                  onClick={() => { setIsOpen(false); onOpenAuth(); }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    isTransparent 
                      ? 'bg-white text-emerald-600 hover:bg-white/90' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  Đăng nhập
                </button>
              )}

              {/* Mobile menu toggle */}
              <button onClick={() => setIsOpen(!isOpen)}
                className="md:hidden w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 bg-white overflow-hidden"
            >
              <div className="px-6 py-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                    }`}
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
