import Navbar from './Navbar';
import GiftStoreSection from './GiftStoreSection';
import Footer from './Footer';

export default function GiftStorePage({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications }) {
  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} onGoToPayments={onGoToPayments} onGoToNotifications={onGoToNotifications} />
      <GiftStoreSection />
      <Footer />
    </div>
  );
}
