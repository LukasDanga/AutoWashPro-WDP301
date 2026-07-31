import Navbar from '../layout/Navbar';
import PackagesSection from '../sections/PackagesSection';
import Footer from '../layout/Footer';

export default function PackagesPage({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications }) {
  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} onGoToPayments={onGoToPayments} onGoToNotifications={onGoToNotifications} />
      <PackagesSection />
      <Footer />
    </div>
  );
}
