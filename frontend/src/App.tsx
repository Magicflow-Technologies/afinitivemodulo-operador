import { useState, useEffect } from 'react';
import EmailMonitoringDashboard from './components/EmailMonitoringDashboard';
import PublicCalendarBooking from './components/PublicCalendarBooking';

function App() {
  const checkIsBookingRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path.includes('/agendar') || 
      path.includes('/booking') || 
      path.includes('/agenda') ||
      path.includes('/reservar') ||
      hash.includes('agendar') ||
      hash.includes('booking')
    );
  };

  const [isBookingRoute, setIsBookingRoute] = useState(checkIsBookingRoute);

  useEffect(() => {
    const handlePopState = () => {
      setIsBookingRoute(checkIsBookingRoute());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigateToBooking = () => {
    window.history.pushState({}, '', '/agendar');
    setIsBookingRoute(true);
  };

  const navigateToDashboard = () => {
    window.history.pushState({}, '', '/');
    setIsBookingRoute(false);
  };

  if (isBookingRoute) {
    return <PublicCalendarBooking onBackToDashboard={navigateToDashboard} />;
  }

  return <EmailMonitoringDashboard onNavigateToBooking={navigateToBooking} />;
}

export default App;

