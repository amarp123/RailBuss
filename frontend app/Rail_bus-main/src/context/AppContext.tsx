import React, { createContext, useContext, useState, useEffect } from 'react';
import { PassengerProfile, Trip, BusRoute, RouteStop, Booking, NotificationItem } from '../types';
import { translations } from '../i18n/translations';
import { api, getOfflineTickets } from '../services/api';

type Language = 'en' | 'kn';

interface BookingFlowState {
  boardingStop: string;
  destinationStopId: string;
  selectedTripId: string;
  seatCount: number;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof translations)['en'];
  user: PassengerProfile | null;
  authChecking: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (fullName: string, email: string, phone: string, password: string) => Promise<void>;
  logoutUser: () => void;
  isOnline: boolean;
  trips: Trip[];
  routes: BusRoute[];
  bookings: Booking[];
  activeBookingFlow: BookingFlowState;
  updateBookingFlow: (updates: Partial<BookingFlowState>) => void;
  resetBookingFlow: () => void;
  refreshData: () => Promise<void>;
  dataError: string;
  showInstallBanner: boolean;
  dismissInstallBanner: () => void;
  triggerInstall: () => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('railbus_lang');
    return saved === 'kn' ? 'kn' : 'en';
  });

  const [user, setUser] = useState<PassengerProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(() => Boolean(sessionStorage.getItem('railbus-token')));

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataError, setDataError] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [activeBookingFlow, setActiveBookingFlow] = useState<BookingFlowState>({
    boardingStop: 'Mysuru Junction (Railway Station)',
    destinationStopId: '',
    selectedTripId: '',
    seatCount: 1,
  });

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Suppress on first load; shown after first booking
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('railbus-token')) { setAuthChecking(false); return; }
    api.getMe().then(setUser).catch(() => setUser(null)).finally(() => setAuthChecking(false));
    const expire = () => setUser(null);
    window.addEventListener('railbus-auth-expired', expire);
    return () => window.removeEventListener('railbus-auth-expired', expire);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('railbus_lang', lang);
  };

  const refreshData = async () => {
    try {
      // Demand groups are private API data. The routes directory is public,
      // but do not request protected trips while a passenger is signed out.
      const fetchedRoutes = await api.getRoutes();
      const fetchedTrips = user ? await api.getTrips() : [];
      setTrips(fetchedTrips);
      setRoutes(fetchedRoutes);
      setBookings(isOnline && user ? await api.getBookings(fetchedTrips) : await getOfflineTickets());
      setDataError('');
    } catch (err) {
      console.warn('[Context] Error fetching initial data, reading offline vault:', err);
      setDataError(err instanceof Error ? err.message : 'Could not load current RailBus data.');
      const offline = await getOfflineTickets();
      setBookings(offline);
    }
  };

  useEffect(() => {
    refreshData();
  }, [isOnline, user]);

  useEffect(() => {
    if (!user || !isOnline) return;
    let active = true;
    const syncPassengerState = async () => {
      try {
        const [latestBookings, latestNotifications] = await Promise.all([api.getBookings(trips), api.getNotifications()]);
        if (!active) return;
        setBookings(latestBookings);
        setNotifications(latestNotifications.map((item: any) => ({
          id: item.id, title: item.title, titleKn: item.title, message: item.message, messageKn: item.message,
          type: item.kind, timestamp: new Date(item.created_at).toLocaleString(), read: Boolean(item.read_at), tripId: item.trip_id || undefined,
        })));
      } catch { /* retain the last successful passenger state while temporarily offline */ }
    };
    void syncPassengerState();
    const timer = window.setInterval(() => { void syncPassengerState(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user, isOnline, trips]);

  const updateBookingFlow = (updates: Partial<BookingFlowState>) => {
    setActiveBookingFlow((prev) => ({ ...prev, ...updates }));
  };

  const resetBookingFlow = () => {
    setActiveBookingFlow({
      boardingStop: 'Mysuru Junction (Railway Station)',
      destinationStopId: '',
      selectedTripId: '',
      seatCount: 1,
    });
  };

  const loginUser = async (email: string, password: string) => {
    const profile = await api.login(email, password);
    setUser(profile);
  };

  const registerUser = async (fullName: string, email: string, phone: string, password: string) => {
    const profile = await api.register(fullName, email, phone, password);
    setUser(profile);
  };

  const logoutUser = () => {
    localStorage.removeItem('railbus_user');
    sessionStorage.removeItem('railbus-token');
    setUser(null);
  };

  useEffect(() => {
    if (user) void refreshData();
  }, [user]);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('railbus_install_dismissed', 'true');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void api.markNotificationRead(id).catch(() => {});
  };

  const t = translations[language] || translations.en;

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        user,
        authChecking,
        loginUser,
        registerUser,
        logoutUser,
        isOnline,
        trips,
        routes,
        bookings,
        activeBookingFlow,
        updateBookingFlow,
        resetBookingFlow,
        refreshData,
        dataError,
        showInstallBanner,
        dismissInstallBanner,
        triggerInstall,
        notifications,
        markNotificationRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
