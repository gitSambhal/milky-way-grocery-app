
import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Droplets, 
  CreditCard, 
  Wallet, 
  Sparkles,
  X,
  Plus,
  Minus,
  Check,
  Layers,
  Download,
  Receipt,
  AlertCircle
} from 'lucide-react';

import { MilkRecord, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { StorageService } from './services/storageService';
import { analyzeData } from './services/geminiService';

import { Button } from './components/Button';
import { StatsCard } from './components/StatsCard';
import { DayCell } from './components/DayCell';

// --- Sub-components for Modals ---

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<MilkRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Last used values for quick entry
  const [lastEntryConfig, setLastEntryConfig] = useState<{qty: number, price: number} | null>(null);

  // UI State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'bulk' | 'payment' | 'export'>('bulk');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form State for Entry
  const [entryMode, setEntryMode] = useState<'milk' | 'payment'>('milk');
  const [entryQty, setEntryQty] = useState<string>("1");
  const [entryPrice, setEntryPrice] = useState(0);
  const [entryPayment, setEntryPayment] = useState<string>("0");

  // Form State for Bulk
  const [bulkStartDate, setBulkStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [bulkEndDate, setBulkEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [bulkQty, setBulkQty] = useState<string>("1");
  const [bulkPrice, setBulkPrice] = useState(0);
  
  // --- Effects ---
  useEffect(() => {
    // Load initial data
    const loadedRecords = StorageService.getRecords();
    const loadedSettings = StorageService.getSettings();
    setRecords(loadedRecords);
    setSettings(loadedSettings);
    setBulkPrice(loadedSettings.defaultPrice);

    // Initialize lastEntryConfig from the latest record
    if (loadedRecords.length > 0) {
      const sorted = [...loadedRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sorted[0]) {
        setLastEntryConfig({ qty: sorted[0].quantity, price: sorted[0].pricePerUnit });
      }
    }
  }, []);

  // --- Computed Data ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const currentMonthRecords = useMemo(() => {
    return records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [records, currentDate]);

  const stats = useMemo(() => {
    return currentMonthRecords.reduce((acc, curr) => {
      const cost = curr.quantity * curr.pricePerUnit;
      const paid = curr.paymentAmount || 0;
      return {
        totalQuantity: acc.totalQuantity + curr.quantity,
        totalCost: acc.totalCost + cost,
        totalPaid: acc.totalPaid + paid,
        balance: acc.balance + (cost - paid),
      };
    }, { totalQuantity: 0, totalCost: 0, totalPaid: 0, balance: 0 });
  }, [currentMonthRecords]);

  // Global Balance (All time)
  const globalBalance = useMemo(() => {
      return records.reduce((bal, r) => {
          const cost = r.quantity * r.pricePerUnit;
          const paid = r.paymentAmount || 0;
          return bal + (cost - paid);
      }, 0);
  }, [records]);

  // --- Handlers ---

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = records.find(r => r.date === dateStr);
    
    if (existing) {
      // If it has milk, show milk mode, otherwise check if it has payment
      if (existing.quantity > 0) {
        setEntryMode('milk');
        setEntryQty(existing.quantity.toString());
      } else {
        setEntryMode('payment');
        setEntryQty("0");
      }
      setEntryPrice(existing.pricePerUnit);
      setEntryPayment((existing.paymentAmount || 0).toString());
    } else {
      // New Entry
      setEntryMode('milk');
      if (lastEntryConfig) {
        setEntryQty(lastEntryConfig.qty.toString());
        setEntryPrice(lastEntryConfig.price);
      } else {
        setEntryQty("1");
        setEntryPrice(settings.defaultPrice);
      }
      setEntryPayment("0");
    }
    setIsEntryModalOpen(true);
  };

  const handleEntryModeChange = (mode: 'milk' | 'payment') => {
    setEntryMode(mode);
    if (mode === 'payment') {
        setEntryQty("0");
    } else {
        // Restore default quantity if coming back to milk mode
        if (entryQty === "0") {
             if (lastEntryConfig) {
                setEntryQty(lastEntryConfig.qty.toString());
              } else {
                setEntryQty("1");
              }
        }
    }
  };

  const handleSaveEntry = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const qtyVal = parseFloat(entryQty) || 0;
    const paymentVal = parseFloat(entryPayment) || 0;
    
    // Update last entry config
    if (qtyVal > 0) {
      setLastEntryConfig({ qty: qtyVal, price: entryPrice });
    }

    // Determine if deleted (0 qty and 0 payment)
    if (qtyVal === 0 && paymentVal === 0) {
        const updated = StorageService.deleteRecord(dateStr);
        setRecords(updated);
        setIsEntryModalOpen(false);
        return;
    }

    const cost = qtyVal * entryPrice;
    const isPaid = paymentVal >= (cost - 0.1) && qtyVal > 0; 

    const newRecord: MilkRecord = {
      id: dateStr,
      date: dateStr,
      quantity: qtyVal,
      pricePerUnit: entryPrice,
      paymentAmount: paymentVal,
      isPaid: isPaid
    };

    const updated = StorageService.saveRecord(newRecord);
    setRecords(updated);
    setIsEntryModalOpen(false);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    const saved = StorageService.saveSettings(newSettings);
    setSettings(saved);
    setIsSettingsModalOpen(false);
  };

  const handleGenerateInsights = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzeData(records, settings);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const handleBulkAdd = () => {
    const start = parseISO(bulkStartDate);
    const end = parseISO(bulkEndDate);
    const days = eachDayOfInterval({ start, end });
    const qty = parseFloat(bulkQty);
    
    const newRecords: MilkRecord[] = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // Preserve existing payment if any
        const existing = records.find(r => r.date === dateStr);
        const paid = existing ? (existing.paymentAmount || 0) : 0;
        
        return {
            id: dateStr,
            date: dateStr,
            quantity: qty,
            pricePerUnit: bulkPrice,
            paymentAmount: paid,
            isPaid: paid >= (qty * bulkPrice)
        };
    });

    const updated = StorageService.saveRecords(newRecords);
    setRecords(updated);
    setLastEntryConfig({ qty, price: bulkPrice });
    setIsManageModalOpen(false);
  };

  const handleBulkPay = () => {
    // Find all records between start and end date
    const start = parseISO(bulkStartDate);
    const end = parseISO(bulkEndDate);
    
    // Get IDs in range
    const idsInRange = records
        .filter(r => {
            const d = parseISO(r.date);
            return d >= start && d <= end;
        })
        .map(r => r.id);
    
    const updated = StorageService.markRangeAsPaid(idsInRange);
    setRecords(updated);
    setIsManageModalOpen(false);
  };

  const handleExport = () => {
    const csvContent = StorageService.exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `milkyway_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Helper for Modal ---
  const currentEntryCost = ((parseFloat(entryQty) || 0) * entryPrice);
  const currentEntryPayment = parseFloat(entryPayment) || 0;
  const remainingDue = Math.max(0, currentEntryCost - currentEntryPayment);

  // --- Render ---

  return (
    <div className="min-h-screen pb-12 bg-slate-50/50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 border-b border-slate-200 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Droplets className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">MilkyWay</h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="sm" onClick={() => setIsManageModalOpen(true)} title="Manage & Tools">
               <Layers size={18} className="text-slate-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsInsightsOpen(true)} title="Insights">
              <Sparkles size={18} className="text-indigo-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsSettingsModalOpen(true)} title="Settings">
              <Settings size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard 
            label="Total Cost" 
            value={`${settings.currencySymbol}${stats.totalCost.toLocaleString()}`} 
            icon={Receipt}
            color="amber"
          />
          <StatsCard 
            label="Total Payments" 
            value={`${settings.currencySymbol}${stats.totalPaid.toLocaleString()}`} 
            icon={CreditCard}
            color="green"
          />
           <StatsCard 
            label="Balance Due" 
            value={`${settings.currencySymbol}${stats.balance.toLocaleString()}`} 
            icon={Wallet}
            color={stats.balance > 0 ? "rose" : "blue"}
            trend={stats.balance > 0 ? "You owe this amount" : (stats.balance < 0 ? "You have credit" : "All settled")}
          />
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
               const dateStr = format(day, 'yyyy-MM-dd');
               const record = records.find(r => r.date === dateStr);
               
               return (
                 <DayCell 
                   key={idx}
                   date={day}
                   currentMonth={currentDate}
                   record={record}
                   currencySymbol={settings.currencySymbol}
                   unitLabel={settings.unitLabel}
                   onClick={handleDayClick}
                 />
               );
            })}
          </div>
        </div>
      </main>

      {/* Entry Modal */}
      <Modal 
        isOpen={isEntryModalOpen} 
        onClose={() => setIsEntryModalOpen(false)} 
        title={selectedDate ? format(selectedDate, 'EEEE, MMM do') : 'Edit Entry'}
      >
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex">
              <button 
                  onClick={() => handleEntryModeChange('milk')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${entryMode === 'milk' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Milk Purchase
              </button>
              <button 
                  onClick={() => handleEntryModeChange('payment')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${entryMode === 'payment' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Payment Only
              </button>
          </div>

          {/* Quantity Section - Only visible in Milk Mode */}
          {entryMode === 'milk' && (
            <>
                <div className="flex flex-col items-center justify-center space-y-4 py-2">
                    <span className="text-slate-500 text-sm font-medium">Quantity ({settings.unitLabel})</span>
                    <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setEntryQty(Math.max(0, parseFloat(entryQty) - 0.5).toString())}
                        className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors shrink-0"
                    >
                        <Minus size={24} />
                    </button>
                    
                    <div className="relative w-28">
                        <input
                            type="number"
                            step="0.1"
                            value={entryQty}
                            onChange={(e) => setEntryQty(e.target.value)}
                            className="w-full text-center text-4xl font-bold text-slate-800 border-b-2 border-slate-200 focus:border-blue-500 outline-none pb-1 bg-transparent"
                        />
                    </div>

                    <button 
                        onClick={() => setEntryQty((parseFloat(entryQty || "0") + 0.5).toString())}
                        className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors shrink-0"
                    >
                        <Plus size={24} />
                    </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-600">Price per unit</label>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2">
                        <span className="text-slate-400 text-sm mr-1">{settings.currencySymbol}</span>
                        <input 
                            type="number" 
                            value={entryPrice} 
                            onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
                            className="w-16 py-1 text-right focus:outline-none text-slate-700 font-medium bg-white"
                        />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <label className="text-sm font-medium text-slate-600">Total Cost</label>
                        <span className="text-lg font-bold text-slate-800">
                        {settings.currencySymbol}{currentEntryCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </>
          )}

          {/* Payment Section */}
          <div className="border-t border-slate-100 pt-4">
             <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Payment Amount</label>
                {entryMode === 'milk' && currentEntryCost > 0 && parseFloat(entryPayment) !== currentEntryCost && (
                    <button 
                        onClick={() => setEntryPayment(currentEntryCost.toString())}
                        className="text-xs text-blue-600 font-medium hover:underline"
                    >
                        Pay Full Amount
                    </button>
                )}
             </div>
             
             <div className="flex items-center relative">
                 <div className="absolute left-3 text-slate-400 font-medium">{settings.currencySymbol}</div>
                 <input 
                    type="number" 
                    value={entryPayment}
                    onChange={(e) => setEntryPayment(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-lg font-semibold text-slate-800 bg-white"
                    placeholder="0"
                 />
                 <div className="absolute right-3">
                    {entryMode === 'milk' && parseFloat(entryPayment) >= currentEntryCost && parseFloat(entryPayment) > 0 && (
                        <Check className="text-emerald-500" size={20} />
                    )}
                 </div>
             </div>
             
             {/* Balance Indicator */}
             {entryMode === 'milk' && currentEntryCost > 0 && (
                 <div className="flex justify-between items-center mt-3 px-1">
                     <span className="text-xs text-slate-500">Remaining Balance:</span>
                     <span className={`text-sm font-bold ${remainingDue > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                         {settings.currencySymbol}{remainingDue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                     </span>
                 </div>
             )}
             
             <p className="text-xs text-slate-400 mt-2 px-1">
                {entryMode === 'milk' 
                    ? "Enter partial or full payment for today's milk." 
                    : "Record a payment made on this date (e.g., settling a weekly bill)."
                }
             </p>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsEntryModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSaveEntry}>Save Record</Button>
          </div>
        </div>
      </Modal>

      {/* Manage / Tools Modal */}
      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="Manage Records">
        <div className="flex border-b border-slate-100 mb-6">
            <button 
                onClick={() => setManageTab('bulk')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${manageTab === 'bulk' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Bulk Add
            </button>
            <button 
                onClick={() => setManageTab('payment')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${manageTab === 'payment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Payments
            </button>
            <button 
                onClick={() => setManageTab('export')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${manageTab === 'export' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Export
            </button>
        </div>

        {manageTab === 'bulk' && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                        <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                        <input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800" />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Quantity ({settings.unitLabel})</label>
                        <input type="number" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Price / Unit</label>
                        <input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(parseFloat(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800" />
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex items-start">
                    <Sparkles size={14} className="mr-2 mt-0.5 shrink-0" />
                    This will add or overwrite records for every day in the selected range.
                </div>

                <Button onClick={handleBulkAdd} className="w-full mt-2">Add Bulk Entries</Button>
            </div>
        )}

        {manageTab === 'payment' && (
             <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex justify-between items-center">
                    <div>
                        <p className="text-amber-600 text-xs font-bold uppercase tracking-wide">Global Balance Due</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{settings.currencySymbol}{globalBalance.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm text-amber-500">
                        <Wallet size={24} />
                    </div>
                </div>

                <div className="pt-2">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Mark records as paid</h4>
                    <p className="text-xs text-slate-500 mb-3">This will set the payment amount equal to the cost for every day in the range.</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                            <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                            <input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800" />
                        </div>
                    </div>
                    <Button onClick={handleBulkPay} className="w-full bg-emerald-600 hover:bg-emerald-700">Mark Range as Paid</Button>
                </div>
             </div>
        )}

        {manageTab === 'export' && (
            <div className="space-y-6 py-4 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Download size={32} />
                </div>
                <div>
                    <h3 className="text-lg font-medium text-slate-800">Export Your Data</h3>
                    <p className="text-sm text-slate-500 mt-1 px-8">Download a CSV file containing all your purchase history, costs, and payment status.</p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="w-full">Download CSV</Button>
            </div>
        )}
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Settings">
         <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSaveSettings({
               defaultPrice: Number(formData.get('defaultPrice')),
               currencySymbol: formData.get('currencySymbol') as string,
               unitLabel: formData.get('unitLabel') as string,
            });
         }} className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
               <input name="currencySymbol" defaultValue={settings.currencySymbol} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-800" />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Unit Label (e.g. L, gal)</label>
               <input name="unitLabel" defaultValue={settings.unitLabel} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-800" />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Default Price Per Unit</label>
               <input name="defaultPrice" type="number" step="0.01" defaultValue={settings.defaultPrice} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-800" />
            </div>
            <div className="pt-4 flex justify-end">
               <Button type="submit">Save Changes</Button>
            </div>
         </form>
      </Modal>

      {/* AI Insights Modal */}
      <Modal isOpen={isInsightsOpen} onClose={() => setIsInsightsOpen(false)} title="AI Expense Analysis">
        <div className="space-y-4">
           {aiAnalysis ? (
             <div className="prose prose-sm prose-slate bg-slate-50 p-4 rounded-xl max-h-[60vh] overflow-y-auto">
               <div dangerouslySetInnerHTML={{ 
                 __html: aiAnalysis
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                    .replace(/- /g, '• ') 
               }} />
             </div>
           ) : (
             <div className="text-center py-8 text-slate-500">
               <Sparkles className="mx-auto h-12 w-12 text-indigo-200 mb-3" />
               <p>Get insights into your milk consumption habits and spending patterns.</p>
             </div>
           )}
           
           <div className="flex flex-col space-y-2">
             {!aiAnalysis && (
               <Button onClick={handleGenerateInsights} isLoading={isAnalyzing} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20">
                  Analyze My Spending
               </Button>
             )}
             {aiAnalysis && (
               <Button onClick={handleGenerateInsights} isLoading={isAnalyzing} variant="secondary" className="w-full">
                  Refresh Analysis
               </Button>
             )}
           </div>
           
           <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 mt-2">
              <Sparkles size={12} />
              <span>Powered by Google Gemini</span>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
