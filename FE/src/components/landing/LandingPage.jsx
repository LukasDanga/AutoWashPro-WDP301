import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import HowItWorksSection from './HowItWorksSection';
import TestimonialsSection from './TestimonialsSection';
import BranchCarouselSection from './BranchCarouselSection';
import CTASection from './CTASection';
import Footer from './Footer';

export default function LandingPage({ onOpenAuth, user, vehicles, onLogout, apiBase, token, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications, pendingBooking, onSetPendingBooking, onVehicleCreated }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} onGoToPayments={onGoToPayments} onGoToNotifications={onGoToNotifications} />
      <HeroSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <BranchCarouselSection onSelectBranch={(branch) => navigate(`/booking?branchId=${branch.id}`)} />
      <CTASection />
      <Footer />
    </div>
  );
}
