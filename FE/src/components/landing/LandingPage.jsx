import Navbar from './Navbar';
import HeroSection from './HeroSection';
import BookingWidget from './BookingWidget';
import HowItWorksSection from './HowItWorksSection';
import PackagesSection from './PackagesSection';
import GiftStoreSection from './GiftStoreSection';
import TestimonialsSection from './TestimonialsSection';
import MapSection from './MapSection';
import CTASection from './CTASection';
import Footer from './Footer';

export default function LandingPage({ onOpenAuth, user, vehicles, onLogout, apiBase, token, onGoToProfile, onGoToHistory }) {
  const scrollToBooking = () => {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} />
      <HeroSection onOpenAuth={onOpenAuth} user={user} />
      <BookingWidget onOpenAuth={onOpenAuth} user={user} vehicles={vehicles} apiBase={apiBase} token={token} onGoToHistory={onGoToHistory} />
      <HowItWorksSection />
      <PackagesSection />
      <GiftStoreSection />
      <TestimonialsSection />
      <MapSection onSelectBranch={() => scrollToBooking()} />
      <CTASection onOpenAuth={onOpenAuth} user={user} />
      <Footer />
    </div>
  );
}
