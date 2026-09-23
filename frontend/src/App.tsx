import { useState, useEffect } from 'react';
import EmailMonitoringDashboard from './components/EmailMonitoringDashboard';
import PublicCalendarBooking from './components/PublicCalendarBooking';
import PublicEventLanding from './components/PublicEventLanding';
import PublicBioLink from './components/PublicBioLink';

function App() {
  const getActiveRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    // 1. Detectar si es Link in Bio (TikTok / Instagram) de Dr. Finanzas
    if (
      path.includes('/bio') ||
      path.includes('/links') ||
      path.includes('/drfinanzas') ||
      path.includes('/dr-finanzas') ||
      hash.includes('bio') ||
      hash.includes('drfinanzas') ||
      search.includes('bio') ||
      search.includes('id=dr-finanzas') ||
      search.includes('id=bio')
    ) {
      return 'bio';
    }

    // 2. Detectar si el subdominio es eventos.afinitive.com.pe
    if (hostname.startsWith('eventos.') || hostname.includes('eventos.afinitive')) {
      return 'evento';
    }

    // 3. Detectar si es ruta de Evento Público en otros dominios o localhost
    if (
      path.includes('/evento') ||
      path.includes('/eventos') ||
      path.includes('/e/') ||
      hash.includes('evento') ||
      search.includes('evento') ||
      search.includes('id=')
    ) {
      return 'evento';
    }

    // 4. Detectar si es ruta de Agendamiento Público
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

    // 5. Por defecto Dashboard del Operador
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

  if (currentRoute === 'bio') {
    return <PublicBioLink onBackToDashboard={navigateToDashboard} />;
  }

  if (currentRoute === 'evento') {
    return <PublicEventLanding onBackToDashboard={navigateToDashboard} />;
  }

  if (currentRoute === 'booking') {
    return <PublicCalendarBooking onBackToDashboard={navigateToDashboard} />;
  }

  return <EmailMonitoringDashboard onNavigateToBooking={navigateToBooking} />;
}

export default App;
