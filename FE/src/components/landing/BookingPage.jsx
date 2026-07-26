import { useSearchParams, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BookingWidget from './BookingWidget';
import Footer from './Footer';

export default function BookingPage({ onOpenAuth, user, vehicles, apiBase, token, onLogout, onGoToProfile, onGoToHistory, onGoToPayments, onGoToNotifications, pendingBooking, onSetPendingBooking, onVehicleCreated }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialBranchId = searchParams.get('branchId') || undefined;
  const initialTab = searchParams.get('tab') || undefined;
  const rebookData = location.state?.rebookData || undefined;

  return (
    <div className="bg-white min-h-screen">
      <Navbar onOpenAuth={onOpenAuth} user={user} onLogout={onLogout} onGoToProfile={onGoToProfile} onGoToHistory={onGoToHistory} onGoToPayments={onGoToPayments} onGoToNotifications={onGoToNotifications} />
      <BookingWidget onOpenAuth={onOpenAuth} user={user} vehicles={vehicles} apiBase={apiBase} token={token} onGoToHistory={onGoToHistory} pendingBooking={pendingBooking} onSetPendingBooking={onSetPendingBooking} onVehicleCreated={onVehicleCreated} initialBranchId={initialBranchId} initialTab={initialTab} rebookData={rebookData} />
      <Footer />
    </div>
  );
}
