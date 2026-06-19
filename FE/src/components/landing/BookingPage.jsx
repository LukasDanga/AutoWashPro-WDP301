import { useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
import BookingWidget from './BookingWidget';
import Footer from './Footer';

export default function BookingPage({ onOpenAuth, user, vehicles, apiBase, token, onLogout, onGoToProfile, onGoToHistory, pendingBooking, onSetPendingBooking, onVehicleCreated }) {
  const [searchParams] = useSearchParams();
  const initialBranchId = searchParams.get('branchId') || undefined;

  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} />
      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <BookingWidget onOpenAuth={onOpenAuth} user={user} vehicles={vehicles} apiBase={apiBase} token={token} onGoToHistory={onGoToHistory} pendingBooking={pendingBooking} onSetPendingBooking={onSetPendingBooking} onVehicleCreated={onVehicleCreated} initialBranchId={initialBranchId} />
      </div>
      <Footer />
    </div>
  );
}
