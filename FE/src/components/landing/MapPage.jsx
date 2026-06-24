import Navbar from './Navbar';
import MapSection from './MapSection';
import Footer from './Footer';

export default function MapPage({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications }) {
  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} onGoToPayments={onGoToPayments} onGoToNotifications={onGoToNotifications} />
      <MapSection />
      <Footer />
    </div>
  );
}
