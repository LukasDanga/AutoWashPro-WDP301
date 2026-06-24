import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import HowItWorksSection from './HowItWorksSection';
import TestimonialsSection from './TestimonialsSection';
import MapSection from './MapSection';
import CTASection from './CTASection';
import Footer from './Footer';

export default function LandingPage({ onOpenAuth, user, vehicles, onLogout, apiBase, token, onGoToProfile, onGoToHistory, pendingBooking, onSetPendingBooking, onVehicleCreated }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} />
      <HeroSection />
      <HowItWorksSection />
      <MapSection onSelectBranch={(branch) => navigate(`/booking?branchId=${branch.id}`)} />
      <TestimonialsSection />
      <CTASection onOpenAuth={onOpenAuth} user={user} />
      <Footer />
    </div>
  );
}
