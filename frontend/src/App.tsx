import { useState, useEffect } from 'react';
import EmailMonitoringDashboard from './components/EmailMonitoringDashboard';
import PublicCalendarBooking from './components/PublicCalendarBooking';
import PublicEventLanding from './components/PublicEventLanding';

function App() {
  const getActiveRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();

    // 1. Detectar si es ruta de Evento Público
    if (
      path.includes('/evento') ||
      path.includes('/eventos') ||
      path.includes('/e/') ||
      hash.includes('evento') ||
      search.includes('evento') ||
      search.includes('id=the-new-york-tower')
    ) {
      return 'evento';
    }

    // 2. Detectar si es ruta de Agendamiento Público
    if (
      path.includes('/agendar') || 
      path.includes('/booking') || 
      path.includes('/agenda') ||
      path.includes('/reservar') ||
      hash.includes('agendar') ||
      hash.includes('booking')
    ) {
      return 'booking';
    }

    // 3. Por defecto Dashboard del Operador
    return 'dashboard';
  };

  const [currentRoute, setCurrentRoute] = useState(getActiveRoute);

  useEffect(() => {
    const handleRouteChanges = () => {
      setCurrentRoute(getActiveRoute());
    };

    window.addEventListener('popstate', handleRouteChanges);
    window.addEventListener('hashchange', handleRouteChanges);

    return () => {
      window.removeEventListener('popstate', handleRouteChanges);
      window.removeEventListener('hashchange', handleRouteChanges);
    };
  }, []);

  const navigateToBooking = () => {
    window.history.pushState({}, '', '/agendar');
    setCurrentRoute('booking');
  };

  const navigateToDashboard = () => {
    window.history.pushState({}, '', '/');
    setCurrentRoute('dashboard');
  };

  if (currentRoute === 'evento') {
    return <PublicEventLanding onBackToDashboard={navigateToDashboard} />;
  }

  if (currentRoute === 'booking') {
    return <PublicCalendarBooking onBackToDashboard={navigateToDashboard} />;
  }

  return <EmailMonitoringDashboard onNavigateToBooking={navigateToBooking} />;
}

export default App;
