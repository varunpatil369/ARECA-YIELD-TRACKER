import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  TrendingUp, 
  Calendar, 
  Filter, 
  AlertTriangle, 
  Loader2, 
  Calculator,
  X,
  Check,
  IndianRupee,
  Package,
  BarChart3,
  List,
  Download
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
  serverTimestamp
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth } from '../firebase';
import { translations, Language } from '../translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface DashboardProps {
  user: User;
  language: Language;
  toggleLanguage: () => void;
}

// --- Components ---

const WetToDryCalculator = ({ t }: { t: any }) => {
  const [wetQuintal, setWetQuintal] = useState<string>('');
  const [wetKg, setWetKg] = useState<string>('');
  const [rate, setRate] = useState<string>('13');
  const [customRate, setCustomRate] = useState<string>('');

  const handleWetQuintalChange = (val: string) => {
    if (val === '') {
      setWetQuintal('');
      return;
    }
    const num = parseFloat(val);
    if (num < 0) setWetQuintal('0');
    else setWetQuintal(val);
  };

  const handleWetKgChange = (val: string) => {
    if (val === '') {
      setWetKg('');
      return;
    }
    let num = parseFloat(val);
    if (num < 0) num = 0;
    if (num > 99) num = 99;
    setWetKg(num.toString());
  };

  const handleCustomRateChange = (val: string) => {
    if (val === '') {
      setCustomRate('');
      return;
    }
    const num = parseFloat(val);
    if (num < 0) setCustomRate('0');
    else setCustomRate(val);
  };

  const finalRate = rate === 'custom' ? parseFloat(customRate) || 0 : parseFloat(rate);

  const result = useMemo(() => {
    const wQ = parseFloat(wetQuintal) || 0;
    const wK = parseFloat(wetKg) || 0;
    
    if (wQ === 0 && wK === 0) return null;

    const totalWetQuintal = wQ + (wK / 100);
    const dryKg = totalWetQuintal * finalRate;
    
    const dryQuintal = Math.floor(dryKg / 100);
    const remainingKg = (dryKg % 100).toFixed(2);

    return { dryQuintal, remainingKg };
  }, [wetQuintal, wetKg, finalRate]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Calculator className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">{t.wetToDryCalculator}</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.wetArecanut} ({t.enterWetWeight})</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder={t.quintal}
                value={wetQuintal}
                onChange={(e) => handleWetQuintalChange(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 uppercase">{t.quintalLabel}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="99"
                placeholder={t.kg}
                value={wetKg}
                onChange={(e) => handleWetKgChange(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 uppercase">{t.kgLabel}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.dealerRate} ({t.selectRate})</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold"
            >
              {[11, 12, 13, 14, 15].map(r => (
                <option key={r} value={r}>{r} {t.kgLabel}</option>
              ))}
              <option value="custom">{t.customRate}</option>
            </select>

            {rate === 'custom' && (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t.customRate}
                  value={customRate}
                  onChange={(e) => handleCustomRateChange(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 uppercase">{t.kgLabel}</span>
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-4 p-6 bg-emerald-600 rounded-[2rem] text-white shadow-xl shadow-emerald-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">{t.dryYield}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{result.dryQuintal}</span>
              <span className="text-xl font-bold opacity-80">{t.quintalLabel}</span>
              <span className="text-4xl font-black ml-4">{result.remainingKg}</span>
              <span className="text-xl font-bold opacity-80">{t.kgLabel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, language, toggleLanguage }) => {
  const t = translations[language];
  const dateLocale = language === 'kn' ? kn : enUS;

  // --- Season Logic ---
  const getSeasonYear = (dateStr: string) => {
    const date = parseISO(dateStr);
    const year = getYear(date);
    const month = getMonth(date);
    if (month >= 5) return `${year}–${year + 1}`;
    return `${year - 1}–${year}`;
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = getYear(now);
    const month = getMonth(now);
    if (month >= 5) return `${year}–${year + 1}`;
    return `${year - 1}–${year}`;
  };

  // Data State
  const [records, setRecords] = useState<YieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<YieldRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'calculator'>('dashboard');
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

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

  const formatToQK = (totalKg: number) => {
    const q = Math.floor(totalKg / 100);
    const k = Math.round(totalKg % 100);
    return `${q} ${t.quintalLabel} ${k} ${t.kgLabel}`;
  };

  const formatShortQK = (totalKg: number) => {
    const q = Math.floor(totalKg / 100);
    const k = Math.round(totalKg % 100);
    if (k === 0) return `${q}${t.quintalShort}`;
    return `${q}${t.quintalShort} ${k}${t.kgShort}`;
  };

  // Firestore Real-time Listener
  useEffect(() => {
    if (!user) return;
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
      console.error("Firestore Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDownloadSeasonPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // Filter records for the selected season
    const seasonRecords = records.filter(r => getSeasonYear(r.date) === selectedSeason);
    
    // Group by month
    const groupedByMonth: { [key: string]: YieldRecord[] } = {};
    seasonRecords.forEach(record => {
      const monthName = format(parseISO(record.date), 'MMMM yyyy', { locale: dateLocale });
      if (!groupedByMonth[monthName]) {
        groupedByMonth[monthName] = [];
      }
      groupedByMonth[monthName].push(record);
    });

    // Title
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text("Arecanut Yield Report", 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`${selectedSeason} Season`, 14, 32);

    let currentY = 45;

    // Sort months chronologically
    const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
      const dateA = parseISO(groupedByMonth[a][0].date);
      const dateB = parseISO(groupedByMonth[b][0].date);
      return dateA.getTime() - dateB.getTime();
    });

    sortedMonths.forEach((month) => {
      // Check for space before adding month header
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text(month, 14, currentY);
      currentY += 5;

      const tableData = groupedByMonth[month]
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
        .map(record => [
          format(parseISO(record.date), 'dd/MM/yyyy'),
          formatToQK(record.totalKg),
          `₹${record.price.toLocaleString()}`
        ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Yield', 'Price']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Total Yield
    const totalKg = seasonRecords.reduce((sum, r) => sum + r.totalKg, 0);
    const q = Math.floor(totalKg / 100);
    const k = Math.round(totalKg % 100);
    const totalStr = `${q}Q ${k}kg`;

    // Check for space for total
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Total Yield: ${totalStr}`, 14, currentY);

    doc.save(`Arecanut_Yield_Report_${selectedSeason}.pdf`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quintal = parseInt(formData.quintal.toString()) || 0;
    const kg = parseInt(formData.kg.toString()) || 0;
    const totalKg = (quintal * 100) + kg;
    const price = parseFloat(formData.price.toString()) || 0;

    try {
      if (editingRecord) {
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
      console.error("Submit Error:", error);
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

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteDoc(doc(db, 'arecaData', recordToDelete));
      setRecordToDelete(null);
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const groupedRecords = useMemo(() => {
    const groups: { [season: string]: { [month: string]: YieldRecord[] } } = {};
    
    // Sort records by date descending
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    
    sorted.forEach(record => {
      const season = getSeasonYear(record.date);
      const monthName = format(parseISO(record.date), 'MMMM', { locale: dateLocale });
      
      if (!groups[season]) groups[season] = {};
      if (!groups[season][monthName]) groups[season][monthName] = [];
      
      groups[season][monthName].push(record);
    });
    
    return groups;
  }, [records, dateLocale]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const seasonMatch = getSeasonYear(r.date) === selectedSeason;
      const monthMatch = selectedMonth === 'all' || (getMonth(parseISO(r.date)) + 1) === selectedMonth;
      return seasonMatch && monthMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, selectedSeason, selectedMonth]);

  const summaries = useMemo(() => {
    const seasonRecords = records.filter(r => getSeasonYear(r.date) === selectedSeason);
    const seasonTotalKg = seasonRecords.reduce((sum, r) => sum + r.totalKg, 0);
    const seasonTotalValue = seasonRecords.reduce((sum, r) => sum + (r.totalKg * (r.price / 100)), 0);
    
    const monthlyRecords = seasonRecords.filter(r => selectedMonth === 'all' || (getMonth(parseISO(r.date)) + 1) === selectedMonth);
    const monthlyTotalKg = monthlyRecords.reduce((sum, r) => sum + r.totalKg, 0);
    const monthlyRecordsCount = monthlyRecords.length;

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
      seasonTotalValue,
      monthlyTotalKg, 
      predictedYieldKg: averageYieldKg 
    };
  }, [records, selectedSeason, selectedMonth]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 4,
        font: { 
          weight: 'bold' as const, 
          size: isMobile ? 9 : 11 
        },
        formatter: (v: number) => {
          if (v <= 0) return '';
          const totalKg = v * 100;
          const q = Math.floor(totalKg / 100);
          const k = Math.round(totalKg % 100);
          if (k === 0) return `${q}${t.quintalShort}`;
          return `${q}${t.quintalShort} ${k}${t.kgShort}`;
        },
        clip: false,
        display: (context: any) => {
          // Hide labels on mobile if there are too many bars to prevent overlap
          if (isMobile && context.chart.data.labels.length > 8) {
            return context.dataset.data[context.dataIndex] > 0;
          }
          return true;
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const kg = context.raw * 100;
            const q = Math.floor(kg / 100);
            const k = Math.round(kg % 100);
            return `${q} ${t.quintalLabel} ${k} ${t.kgLabel}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        ticks: { 
          font: { weight: 'bold' as const, size: isMobile ? 10 : 12 } 
        }
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { weight: 'bold' as const, size: isMobile ? 10 : 12 },
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0
        }
      }
    },
    layout: {
      padding: { top: 30 }
    }
  };

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
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: isMobile ? 30 : 60,
      }]
    };
  }, [records, t, isMobile]);

  const monthlyChartData = useMemo(() => {
    const seasonMonths = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];
    const monthsMap = Array(12).fill(0);
    records.filter(r => getSeasonYear(r.date) === selectedSeason).forEach(r => {
      const monthIndex = getMonth(parseISO(r.date));
      const displayIndex = seasonMonths.indexOf(monthIndex);
      if (displayIndex !== -1) monthsMap[displayIndex] += r.totalKg;
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
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: isMobile ? 15 : 40,
      }]
    };
  }, [records, selectedSeason, t, dateLocale, isMobile]);

  const availableSeasons = useMemo(() => {
    const seasons: string[] = Array.from(new Set(records.map(r => getSeasonYear(r.date))));
    const currentSeason = getCurrentSeason();
    if (!seasons.includes(currentSeason)) seasons.push(currentSeason);
    return seasons.sort((a, b) => b.localeCompare(a));
  }, [records]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24 lg:pb-8">
      {isLoading && records.length === 0 && (
        <div className="fixed inset-0 bg-stone-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      )}

      <header className="bg-white border-b border-stone-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-stone-900">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleLanguage} 
              className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-600 transition-all border border-stone-200"
            >
              {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
            </button>
            <button 
              onClick={handleLogout} 
              className="p-2 text-stone-400 hover:text-red-600 transition-colors"
              title={t.logout}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 mb-8">
          {/* Top Bar: Tabs and Add Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Navigation Tabs */}
            <div className="flex bg-stone-200/50 p-1 rounded-2xl w-full sm:w-fit">
              {(['dashboard', 'records', 'calculator'] as const).map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all",
                    activeTab === tab ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  {tab === 'dashboard' && <BarChart3 className="w-4 h-4" />}
                  {tab === 'records' && <List className="w-4 h-4" />}
                  {tab === 'calculator' && <Calculator className="w-4 h-4" />}
                  {t[tab]}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setIsModalOpen(true)} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              {t.addHarvest}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 text-stone-400">
              <Filter className="w-5 h-5" />
            </div>
            <div className="flex flex-1 w-full gap-4">
              <div className="relative flex-1">
                <select 
                  value={selectedSeason} 
                  onChange={(e) => setSelectedSeason(e.target.value)} 
                  className="w-full pl-4 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                >
                  {availableSeasons.map(s => <option key={s} value={s}>{s} {t.season}</option>)}
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
              <div className="relative flex-1">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} 
                  className="w-full pl-4 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">{t.allMonths}</option>
                  {[6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5].map(m => (
                    <option key={m} value={m}>{format(new Date(2000, m - 1, 1), 'MMMM', { locale: dateLocale })}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
              <button 
                onClick={handleDownloadSeasonPDF}
                className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 py-3 rounded-xl transition-all active:scale-[0.98] whitespace-nowrap"
                title="Download Season PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download Season PDF</span>
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Season Yield Card */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.seasonYield} ({selectedSeason})</span>
                </div>
                <p className="text-3xl font-black text-stone-900 tracking-tight my-4">{formatToQK(summaries.seasonTotalKg)}</p>
                <div className="h-1.5 w-full bg-emerald-500 rounded-full" />
              </div>

              {/* Monthly Summary Card */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.monthlySummary}</span>
                </div>
                <div className="my-4">
                  {selectedMonth === 'all' ? (
                    <p className="text-2xl font-black text-stone-900 tracking-tight">{t.selectMonth}</p>
                  ) : (
                    <p className="text-3xl font-black text-stone-900 tracking-tight">{formatToQK(summaries.monthlyTotalKg)}</p>
                  )}
                </div>
                <div className="h-1.5 w-full bg-blue-500 rounded-full" />
              </div>

              {/* Prediction Card */}
              <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-lg shadow-emerald-50 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.nextSeasonPrediction}</span>
                </div>
                <div className="my-4">
                  <p className="text-3xl font-black text-stone-900 tracking-tight">{formatToQK(summaries.predictedYieldKg)}</p>
                  <p className="text-[10px] font-bold text-stone-400 mt-1 italic">{t.predictionNote}</p>
                </div>
                <div className="h-1.5 w-full bg-emerald-500 rounded-full" />
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-base font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  {t.seasonYieldTrend}
                </h3>
                <div className="h-[350px]">
                  <Bar data={seasonChartData} options={chartOptions} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-base font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {t.monthlyDistribution} ({selectedSeason})
                </h3>
                <div className="h-[350px]">
                  <Bar data={monthlyChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button for Adding Harvest */}

        {activeTab === 'records' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2">
              <h2 className="text-2xl font-black text-stone-900">{t.records}</h2>
              <p className="text-sm font-bold text-stone-400">
                {t.recordsCount}: {summaries.monthlyRecordsCount} ({selectedMonth === 'all' ? t.allMonths : format(new Date(2000, (selectedMonth as number) - 1, 1), 'MMMM', { locale: dateLocale })} {selectedSeason} {t.season})
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/50 border-b border-stone-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.date}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.yield}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.price}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.notes}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-stone-400 font-bold">
                          {t.noRecords}
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-stone-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-stone-600">
                              {format(parseISO(record.date), 'dd MMM yyyy', { locale: dateLocale })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-stone-900">
                              {formatToQK(record.totalKg)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-stone-600">
                              ₹{record.price.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-stone-400 italic">
                              {record.notes || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEdit(record)} 
                                className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setRecordToDelete(record.id)} 
                                className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculator' && <WetToDryCalculator t={t} />}
      </main>

      {/* Personal Profile Section */}
      <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col items-center">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-3 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-center text-center space-y-1">
            <h3 className="text-sm font-bold text-stone-900">[ 👤 Vikas Patil S R ]</h3>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Agriculturist 🌴 | Developer 💻 | Data Analytics Enthusiast 📊 | Investor 💼
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-3 max-w-md w-full mt-3 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-[11px] font-bold text-stone-900">
              📞 If you want this application, please contact me
            </p>
            <div className="flex flex-col gap-1">
              <a href="tel:7760214952" className="text-[11px] text-stone-600 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
                📱 7760214952
              </a>
              <a href="mailto:vikkipatil132@gmail.com" className="text-[11px] text-stone-600 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
                📧 vikkipatil132@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Adding Harvest - REMOVED for old style */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <h2 className="text-xl font-bold text-stone-900">{editingRecord ? t.editHarvest : t.addNewHarvest}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-white rounded-xl transition-colors text-stone-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.date}</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.quintal}</label>
                    <div className="relative">
                      <input type="number" name="quintal" min="0" value={formData.quintal} onChange={handleInputChange} className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold" required />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 uppercase">{t.quintalLabel}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.kg}</label>
                    <div className="relative">
                      <input type="number" name="kg" min="0" max="99" value={formData.kg} onChange={handleInputChange} className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold" required />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 uppercase">{t.kgLabel}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.pricePerQuintal}</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input type="number" name="price" min="0" step="0.01" value={formData.price} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold" required />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-widest">{t.notes}</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-stone-50 text-lg font-bold resize-none" />
                </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-[0.98]">
                <Check className="w-5 h-5" />
                {t.saveRecord}
              </button>
            </form>
          </div>
        </div>
      )}

      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setRecordToDelete(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">{t.deleteRecord}</h3>
            <p className="text-stone-500 text-sm mb-8 leading-relaxed">{t.deleteConfirm}</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setRecordToDelete(null)} className="px-6 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all">
                {t.cancel}
              </button>
              <button onClick={confirmDelete} className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100">
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
