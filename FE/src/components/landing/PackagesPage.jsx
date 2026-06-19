import Navbar from './Navbar';
import PackagesSection from './PackagesSection';
import Footer from './Footer';

export default function PackagesPage({ onOpenAuth, user, onLogout, onGoToProfile, onGoToHistory }) {
  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} />
      <PackagesSection />
      <Footer />
    </div>
  );
}
