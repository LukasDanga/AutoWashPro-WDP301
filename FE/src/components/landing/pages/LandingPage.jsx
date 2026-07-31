import { useNavigate } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import HeroSection from '../sections/HeroSection';
import HowItWorksSection from '../sections/HowItWorksSection';
import TestimonialsSection from '../sections/TestimonialsSection';
import BranchCarouselSection from '../sections/BranchCarouselSection';
import CTASection from '../sections/CTASection';
import Footer from '../layout/Footer';

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
