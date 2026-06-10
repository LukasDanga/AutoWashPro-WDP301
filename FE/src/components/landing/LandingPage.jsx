import Navbar from './Navbar';
import HeroSection from './HeroSection';
import ServicesSection from './ServicesSection';
import HowItWorksSection from './HowItWorksSection';
import TestimonialsSection from './TestimonialsSection';
import CTASection from './CTASection';
import Footer from './Footer';

export default function LandingPage({ onOpenAuth }) {
  return (
    <div className="bg-white">
      <Navbar onOpenAuth={onOpenAuth} />
      <HeroSection onOpenAuth={onOpenAuth} />
      <ServicesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection onOpenAuth={onOpenAuth} />
      <Footer />
    </div>
  );
}
