import Navbar from './Navbar';
import GiftStoreSection from './GiftStoreSection';
import Footer from './Footer';

export default function GiftStorePage({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory }) {
  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} />
      <GiftStoreSection />
      <Footer />
    </div>
  );
}
