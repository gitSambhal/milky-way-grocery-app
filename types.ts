
export interface MilkRecord {
  id: string;
  date: string; // ISO 8601 YYYY-MM-DD
  quantity: number; // in liters or units
  pricePerUnit: number;
  isPaid: boolean; // Kept for backward compatibility/quick status
  paymentAmount?: number; // New: actual amount paid on this transaction
  notes?: string;
}

export interface AppSettings {
  defaultPrice: number;
  currencySymbol: string;
  unitLabel: string; // e.g., "L", "gal", "pkt"
}

export interface DailyStats {
  totalQuantity: number;
  totalCost: number;
  totalPaid: number;
  balance: number;
}

export type ViewMode = 'calendar' | 'list' | 'analytics';
