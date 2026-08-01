import Navbar from '../layout/Navbar';
import GiftStoreSection from '../sections/GiftStoreSection';
import Footer from '../layout/Footer';

export default function GiftStorePage({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications }) {
  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} onGoToPayments={onGoToPayments} onGoToNotifications={onGoToNotifications} />
      <GiftStoreSection user={user} onOpenAuth={onOpenAuth} />
      <Footer />
    </div>
  );
}
