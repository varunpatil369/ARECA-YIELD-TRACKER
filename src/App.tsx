/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  LogIn, 
  BarChart3,
  List,
  TrendingUp,
  Package,
  IndianRupee,
  X,
  Check,
  Lock,
  User as UserIcon,
  Calendar,
  Filter,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import { format, getYear, getMonth, parseISO } from 'date-fns';
import { enUS, kn } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Translations
import { translations, Language } from './translations';

// Firebase Imports
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  ChartDataLabels
);

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const savedLang = localStorage.getItem('app_language') as Language || 'en';
      const t = translations[savedLang];
      let errorMessage = t.somethingWentWrong;
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMessage = t.permissionError;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-stone-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">{t.appError}</h2>
            <p className="text-stone-500 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
            >
              {t.reloadApp}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---
interface YieldRecord {
  id: string;
  date: string;
  quintal: number;
  kg: number;
  totalKg: number;
  price: number;
  notes: string;
  uid: string;
  createdAt: any;
}

// --- Components ---

function YieldTrackerApp() {
  // --- Language State ---
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'en';
  });

  const t = translations[language];
  const dateLocale = language === 'kn' ? kn : enUS;

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'kn' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  // --- Season Logic ---
  const getSeasonYear = (dateStr: string) => {
    const date = parseISO(dateStr);
    const year = getYear(date);
    const month = getMonth(date); // 0-indexed, June is 5
    
    if (month >= 5) { // June or later
      return `${year}–${year + 1}`;
    } else { // Before June (Jan-May)
      return `${year - 1}–${year}`;
    }
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = getYear(now);
    const month = getMonth(now);
    if (month >= 5) return `${year}–${year + 1}`;
    return `${year - 1}–${year}`;
  };

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  
  // Data State
  const [records, setRecords] = useState<YieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<YieldRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>('dashboard');
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Filter State
  const [selectedSeason, setSelectedSeason] = useState<string>(getCurrentSeason());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    quintal: 0,
    kg: 0,
    price: 0,
    notes: ''
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Firestore Real-time Listener
  useEffect(() => {
    if (!isAuthReady || !user) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'arecaData'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as YieldRecord[];
      setRecords(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'arecaData');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Login Handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Add a custom parameter to ensure the account selection is prompted
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Full Login Error Object:", error);
      let message = "Login failed. Please try again.";
      
      if (error.code === 'auth/popup-closed-by-user') {
        message = "The sign-in popup was closed before completion. Please try again and keep the window open.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized. Please add this URL to 'Authorized Domains' in Firebase Console > Authentication > Settings.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google Sign-In is not enabled. Go to Firebase Console > Authentication > Sign-in method and enable Google.";
      } else if (error.code === 'auth/invalid-api-key') {
        message = "Invalid API Key. Please check your Firebase configuration.";
      } else if (error.message && error.message.includes('requested action is invalid')) {
        message = "The requested action is invalid. This often means Google Sign-In is not fully set up in the Firebase Console.";
      } else if (error.message) {
        message = error.message;
      }
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Form Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const quintal = parseInt(formData.quintal.toString()) || 0;
    const kg = parseInt(formData.kg.toString()) || 0;
    const totalKg = (quintal * 100) + kg;
    const price = parseFloat(formData.price.toString()) || 0;

    try {
      if (editingRecord) {
        // Update existing record
        const recordRef = doc(db, 'arecaData', editingRecord.id);
        await updateDoc(recordRef, {
          date: formData.date,
          quintal,
          kg,
          totalKg,
          price,
          notes: formData.notes
        });
      } else {
        // Add new record
        await addDoc(collection(db, 'arecaData'), {
          date: formData.date,
          quintal,
          kg,
          totalKg,
          price,
          notes: formData.notes,
          uid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingRecord ? OperationType.UPDATE : OperationType.CREATE, 'arecaData');
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      quintal: 0,
      kg: 0,
      price: 0,
      notes: ''
    });
    setEditingRecord(null);
    setIsModalOpen(false);
  };

  const handleEdit = (record: YieldRecord) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      quintal: record.quintal,
      kg: record.kg,
      price: record.price,
      notes: record.notes
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setRecordToDelete(id);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteDoc(doc(db, 'arecaData', recordToDelete));
      setRecordToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `arecaData/${recordToDelete}`);
    }
  };

  // --- Calculations ---
  const convertToQuintalKg = (totalKg: number) => {
    const q = Math.floor(totalKg / 100);
    const k = totalKg % 100;
    return `${q} ${t.quintalLabel} ${k} ${t.kgLabel}`;
  };

  const formatShortYield = (totalKg: number) => {
    const q = Math.floor(totalKg / 100);
    const k = totalKg % 100;
    return `${q}Q ${k}kg`;
  };

  // Filtered Records for Table
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const seasonMatch = getSeasonYear(r.date) === selectedSeason;
      const monthMatch = selectedMonth === 'all' || (getMonth(parseISO(r.date)) + 1) === selectedMonth;
      return seasonMatch && monthMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, selectedSeason, selectedMonth]);

  // Dashboard Summaries
  const summaries = useMemo(() => {
    // Season Summary: Total for selected season
    const seasonRecords = records.filter(r => getSeasonYear(r.date) === selectedSeason);
    const seasonTotalKg = seasonRecords.reduce((sum, r) => sum + r.totalKg, 0);
    
    // Monthly Summary: Filter by selectedSeason AND selectedMonth
    let monthlyTotalKg = 0;
    if (selectedMonth !== 'all') {
      monthlyTotalKg = seasonRecords
        .filter(r => (getMonth(parseISO(r.date)) + 1) === selectedMonth)
        .reduce((sum, r) => sum + r.totalKg, 0);
    }

    // Prediction: Average of last 3 seasons
    const seasonsMap: { [season: string]: number } = {};
    records.forEach(r => {
      const season = getSeasonYear(r.date);
      seasonsMap[season] = (seasonsMap[season] || 0) + r.totalKg;
    });
    const sortedSeasons = Object.keys(seasonsMap).sort();
    const lastThreeSeasons = sortedSeasons.slice(-3);
    const averageYieldKg = lastThreeSeasons.length > 0 
      ? lastThreeSeasons.reduce((sum, s) => sum + seasonsMap[s], 0) / lastThreeSeasons.length 
      : 0;

    return { 
      seasonTotalKg, 
      monthlyTotalKg,
      predictedYieldKg: averageYieldKg
    };
  }, [records, selectedSeason, selectedMonth]);

  // Chart Data: Season Trend
  const seasonChartData = useMemo(() => {
    const seasonsMap: { [season: string]: number } = {};
    records.forEach(r => {
      const season = getSeasonYear(r.date);
      seasonsMap[season] = (seasonsMap[season] || 0) + r.totalKg;
    });

    const sortedSeasons = Object.keys(seasonsMap).sort();
    return {
      labels: sortedSeasons,
      datasets: [{
        label: t.seasonYieldQuintals,
        data: sortedSeasons.map(s => seasonsMap[s] / 100),
        fullData: sortedSeasons.map(s => seasonsMap[s]),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 12,
        barThickness: 60,
      }]
    };
  }, [records, t]);

  // Chart Data: Monthly Distribution for Selected Season
  const monthlyChartData = useMemo(() => {
    // Season months: Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr, May
    const seasonMonths = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];
    const monthsMap = Array(12).fill(0);
    
    records
      .filter(r => getSeasonYear(r.date) === selectedSeason)
      .forEach(r => {
        const monthIndex = getMonth(parseISO(r.date));
        const displayIndex = seasonMonths.indexOf(monthIndex);
        if (displayIndex !== -1) {
          monthsMap[displayIndex] += r.totalKg;
        }
      });

    const labels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((_, i) => {
      const monthDate = new Date(2000, seasonMonths[i], 1);
      return format(monthDate, 'MMM', { locale: dateLocale });
    });

    return {
      labels,
      datasets: [{
        label: t.monthlyYieldQuintals,
        data: monthsMap.map(kg => kg / 100),
        fullData: monthsMap,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 12,
        barThickness: 40,
      }]
    };
  }, [records, selectedSeason, t, dateLocale]);

  // Unique Seasons for Dropdown
  const availableSeasons = useMemo(() => {
    const seasons: string[] = Array.from(new Set(records.map(r => getSeasonYear(r.date))));
    const currentSeason = getCurrentSeason();
    if (!seasons.includes(currentSeason)) seasons.push(currentSeason);
    return seasons.sort((a, b) => b.localeCompare(a));
  }, [records]);

  // --- Render Login Page ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-stone-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900">Arecanut Yield Tracker</h1>
            <p className="text-stone-500 text-sm mt-1">Sign in with Google to manage your harvest</p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-stone-100 hover:border-emerald-500 hover:bg-emerald-50 text-stone-700 font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-stone-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            )}
            {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>

          {loginError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium leading-relaxed">{loginError}</p>
              </div>
              <button 
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="text-[10px] text-stone-500 font-bold uppercase tracking-widest hover:text-emerald-600 transition-colors text-left pl-8"
              >
                {showTroubleshooting ? 'Hide Troubleshooting' : 'Show Troubleshooting Guide ↓'}
              </button>
              
              {showTroubleshooting && (
                <div className="flex flex-col gap-3 pl-8 pt-2 border-t border-red-100/50">
                  <div className="space-y-2">
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Step 1: Enable Google</p>
                    <a 
                      href="https://console.firebase.google.com/project/ai-studio-applet-webapp-69cab/authentication/providers" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 font-bold underline block"
                    >
                      Open Firebase Auth Providers →
                    </a>
                    <p className="text-[10px] text-stone-400 italic">Ensure "Google" is toggled to "Enabled".</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Step 2: Authorize this Domain</p>
                    <a 
                      href="https://console.firebase.google.com/project/ai-studio-applet-webapp-69cab/authentication/settings" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 font-bold underline block"
                    >
                      Open Authorized Domains →
                    </a>
                    <p className="text-[10px] text-stone-400">Add this exact domain to the list:</p>
                    <code className="text-[10px] bg-white px-2 py-1 rounded border border-stone-200 block w-fit font-mono text-emerald-800">
                      {window.location.hostname}
                    </code>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Step 3: Check Browser</p>
                    <p className="text-[10px] text-stone-400">Disable Incognito mode or "Block 3rd party cookies" settings.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8 pt-8 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 leading-relaxed">
              By signing in, you agree to our terms and conditions. Your data is securely stored in Google Cloud.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24 lg:pb-8">
      {/* Loading Overlay */}
      {isLoading && records.length === 0 && (
        <div className="fixed inset-0 bg-stone-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <h1 className="text-base sm:text-lg font-bold text-stone-900 truncate max-w-[150px] sm:max-w-none">{t.appTitle}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-[10px] sm:text-xs font-bold text-stone-600 transition-all border border-stone-200 active:scale-95"
            >
              {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold text-xs sm:text-sm min-h-[40px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xs:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Filters & Navigation */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-stone-200 p-1 rounded-2xl w-full sm:w-fit">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]",
                  activeTab === 'dashboard' ? "bg-white text-emerald-700 shadow-sm" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                {t.dashboard}
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]",
                  activeTab === 'records' ? "bg-white text-emerald-700 shadow-sm" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <List className="w-4 h-4" />
                {t.records}
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 sm:py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 min-h-[48px] w-full sm:w-fit active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              {t.addHarvest}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
              <Filter className="w-4 h-4 text-stone-400 shrink-0" />
              <div className="grid grid-cols-2 gap-2 w-full">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="bg-stone-50 px-3 py-2 rounded-lg text-sm font-bold text-stone-700 focus:outline-none border border-stone-100 min-h-[40px]"
                >
                  {availableSeasons.map(s => <option key={s} value={s}>{s} {t.season}</option>)}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="bg-stone-50 px-3 py-2 rounded-lg text-sm font-bold text-stone-700 focus:outline-none border border-stone-100 min-h-[40px]"
                >
                  <option value="all">{t.allMonths}</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{format(new Date(2000, i, 1), 'MMMM', { locale: dateLocale })}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl shrink-0">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-400 text-[10px] sm:text-xs uppercase tracking-widest truncate">{t.seasonYield} ({selectedSeason})</h3>
                    <p className="text-xl sm:text-2xl font-bold text-stone-900 truncate">{convertToQuintalKg(summaries.seasonTotalKg)}</p>
                  </div>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full opacity-20"></div>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl shrink-0">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-400 text-[10px] sm:text-xs uppercase tracking-widest truncate">
                      {t.monthlySummary} {selectedMonth !== 'all' ? `(${format(new Date(2000, selectedMonth - 1, 1), 'MMM', { locale: dateLocale })})` : ''}
                    </h3>
                    <p className="text-xl sm:text-2xl font-bold text-stone-900 truncate">
                      {selectedMonth === 'all' ? t.selectMonth : convertToQuintalKg(summaries.monthlyTotalKg)}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-full opacity-20"></div>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl shrink-0">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-400 text-[10px] sm:text-xs uppercase tracking-widest truncate">{t.nextSeasonPrediction}</h3>
                    <p className="text-xl sm:text-2xl font-bold text-stone-900 truncate">{convertToQuintalKg(Math.round(summaries.predictedYieldKg))}</p>
                  </div>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full opacity-40"></div>
                </div>
                <p className="text-[10px] text-stone-400 mt-2 italic">{t.predictionNote}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  {t.seasonYieldTrend}
                </h3>
                <div className="h-[300px] sm:h-[450px]">
                  <Bar 
                    data={seasonChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      layout: {
                        padding: {
                          top: 30
                        }
                      },
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const totalKg = context.dataset.fullData[context.dataIndex];
                              return `${t.yield}: ${convertToQuintalKg(totalKg)}`;
                            }
                          }
                        },
                        datalabels: {
                          anchor: 'end',
                          align: 'top',
                          offset: 4,
                          formatter: (value, context: any) => {
                            const totalKg = context.dataset.fullData[context.dataIndex];
                            return totalKg > 0 ? formatShortYield(totalKg) : '';
                          },
                          font: { weight: 'bold', size: window.innerWidth < 640 ? 10 : 12 },
                          color: '#065f46',
                          clip: false
                        }
                      },
                      scales: { 
                        y: { 
                          beginAtZero: true, 
                          grace: '15%',
                          grid: { color: '#f5f5f4' },
                          title: { display: true, text: t.seasonYieldQuintals, font: { weight: 'bold', size: 10 } }
                        }, 
                        x: { 
                          grid: { display: false },
                          ticks: { font: { size: 10 } }
                        } 
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {t.monthlyDistribution} ({selectedSeason})
                </h3>
                <div className="h-[300px] sm:h-[450px]">
                  <Bar 
                    data={monthlyChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      layout: {
                        padding: {
                          top: 30
                        }
                      },
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const totalKg = context.dataset.fullData[context.dataIndex];
                              return `${t.yield}: ${convertToQuintalKg(totalKg)}`;
                            }
                          }
                        },
                        datalabels: {
                          anchor: 'end',
                          align: 'top',
                          offset: 4,
                          formatter: (value, context: any) => {
                            const totalKg = context.dataset.fullData[context.dataIndex];
                            return totalKg > 0 ? formatShortYield(totalKg) : '';
                          },
                          font: { weight: 'bold', size: window.innerWidth < 640 ? 9 : 11 },
                          color: '#1e40af',
                          clip: false
                        }
                      },
                      scales: { 
                        y: { 
                          beginAtZero: true, 
                          grace: '15%',
                          grid: { color: '#f5f5f4' },
                          title: { display: true, text: t.monthlyYieldQuintals, font: { weight: 'bold', size: 10 } }
                        }, 
                        x: { 
                          grid: { display: false },
                          ticks: { font: { size: 10 } }
                        } 
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">{t.records}</h2>
              <p className="text-stone-500 text-xs sm:text-sm font-medium">
                {t.recordsCount}: {filteredRecords.length} ({selectedMonth === 'all' ? t.allMonths : format(new Date(2000, selectedMonth - 1, 1), 'MMMM', { locale: dateLocale })} {selectedSeason} {t.season})
              </p>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.date}</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.yield}</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.price}</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.notes}</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-emerald-50/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-stone-600 font-medium">
                            {format(parseISO(record.date), 'dd MMM yyyy', { locale: dateLocale })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-stone-900">{convertToQuintalKg(record.totalKg)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                            ₹{record.price}
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-stone-500 italic text-sm">
                            {record.notes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title={t.editHarvest}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title={t.deleteRecord}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="w-8 h-8 opacity-20" />
                            <p>{t.noRecords}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View: Cards */}
            <div className="sm:hidden space-y-4">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <div key={record.id} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{t.date}</p>
                        <p className="font-bold text-stone-900">{format(parseISO(record.date), 'dd MMM yyyy', { locale: dateLocale })}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-transform"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-3 bg-red-50 text-red-600 rounded-2xl active:scale-90 transition-transform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{t.yield}</p>
                        <p className="font-bold text-emerald-700">{convertToQuintalKg(record.totalKg)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{t.price}</p>
                        <p className="font-bold text-stone-900">₹{record.price}</p>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="pt-4 border-t border-stone-100">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{t.notes}</p>
                        <p className="text-sm text-stone-600 italic leading-relaxed">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-stone-400">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-8 h-8 opacity-20" />
                    <p>{t.noRecords}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg shadow-2xl border border-stone-100 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                {editingRecord ? t.editHarvest : t.addNewHarvest}
              </h2>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors active:scale-90"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-5 sm:gap-6">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.date}</label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 sm:py-3 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-base min-h-[48px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.quintal}</label>
                    <input
                      type="number"
                      name="quintal"
                      min="0"
                      required
                      value={formData.quintal}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 sm:py-3 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-base min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.kg}</label>
                    <input
                      type="number"
                      name="kg"
                      min="0"
                      max="99"
                      required
                      value={formData.kg}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 sm:py-3 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-base min-h-[48px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.pricePerQuintal}</label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 sm:py-3 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-base min-h-[48px]"
                  />
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-between border border-emerald-100">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-widest">{t.yield}:</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-800">
                    {convertToQuintalKg((parseInt(formData.quintal.toString()) || 0) * 100 + (parseInt(formData.kg.toString()) || 0))}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.notes}</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 sm:py-3 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all h-24 resize-none bg-stone-50 text-base"
                    placeholder="..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="order-2 sm:order-1 flex-1 px-6 py-4 rounded-2xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all min-h-[48px] active:scale-95"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="order-1 sm:order-2 flex-1 px-6 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] min-h-[48px]"
                >
                  {editingRecord ? t.updateRecord : t.saveRecord}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-sm shadow-2xl border border-stone-100 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">{t.deleteRecord}</h3>
              <p className="text-stone-500 mb-8 text-sm leading-relaxed">
                {t.deleteConfirm}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setRecordToDelete(null)}
                  className="order-2 sm:order-1 flex-1 px-6 py-4 rounded-2xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all min-h-[48px] active:scale-95"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={confirmDelete}
                  className="order-1 sm:order-2 flex-1 px-6 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-[0.98] min-h-[48px]"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <YieldTrackerApp />
    </ErrorBoundary>
  );
}
