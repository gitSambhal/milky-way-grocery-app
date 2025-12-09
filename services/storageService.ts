
import { MilkRecord, AppSettings } from '../types';
import { APP_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from '../constants';

// Helper to simulate a delay for realism or future async DB swap
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const StorageService = {
  getRecords: (): MilkRecord[] => {
    try {
      const data = localStorage.getItem(APP_STORAGE_KEY);
      const records = data ? JSON.parse(data) : [];
      // Migration: Ensure paymentAmount exists for older records
      return records.map((r: any) => ({
        ...r,
        paymentAmount: r.paymentAmount !== undefined ? r.paymentAmount : (r.isPaid ? (r.quantity * r.pricePerUnit) : 0)
      }));
    } catch (e) {
      console.error("Failed to load records", e);
      return [];
    }
  },

  saveRecord: (record: MilkRecord): MilkRecord[] => {
    const records = StorageService.getRecords();
    const existingIndex = records.findIndex(r => r.date === record.date);
    
    let newRecords;
    if (existingIndex >= 0) {
      newRecords = [...records];
      newRecords[existingIndex] = { ...newRecords[existingIndex], ...record };
    } else {
      newRecords = [...records, record];
    }
    
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newRecords));
    return newRecords;
  },

  saveRecords: (newRecordsList: MilkRecord[]): MilkRecord[] => {
    const records = StorageService.getRecords();
    const recordMap = new Map(records.map(r => [r.date, r]));

    newRecordsList.forEach(r => {
        recordMap.set(r.date, r);
    });

    const updatedRecords = Array.from(recordMap.values());
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(updatedRecords));
    return updatedRecords;
  },

  deleteRecord: (id: string): MilkRecord[] => {
    const records = StorageService.getRecords();
    // Instead of full delete, if payment exists but qty is 0, we might want to keep it as a payment record.
    // But for simplicity, if user deletes via UI (setting 0 qty and 0 payment), we remove it.
    const newRecords = records.filter(r => r.id !== id);
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newRecords));
    return newRecords;
  },

  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: AppSettings): AppSettings => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return settings;
  },

  // Batch update for paying multiple items fully
  markRangeAsPaid: (ids: string[]): MilkRecord[] => {
    const records = StorageService.getRecords();
    const newRecords = records.map(r => {
      if (ids.includes(r.id)) {
        const cost = r.quantity * r.pricePerUnit;
        return { ...r, isPaid: true, paymentAmount: cost };
      }
      return r;
    });
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newRecords));
    return newRecords;
  },

  exportToCSV: (): string => {
    const records = StorageService.getRecords();
    // Sort by date
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const headers = ['Date', 'Quantity', 'Price/Unit', 'Total Cost', 'Amount Paid', 'Notes'];
    const rows = records.map(r => [
        r.date,
        r.quantity,
        r.pricePerUnit,
        (r.quantity * r.pricePerUnit).toFixed(2),
        (r.paymentAmount || 0).toFixed(2),
        r.notes ? `"${r.notes.replace(/"/g, '""')}"` : ''
    ]);
    
    return [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
  }
};
