
import React from 'react';
import { MilkRecord } from '../types';
import { CheckCircle2, Circle, Coins, PieChart } from 'lucide-react';
import { format, isSameMonth, isToday } from 'date-fns';

interface DayCellProps {
  date: Date;
  currentMonth: Date;
  record?: MilkRecord;
  currencySymbol: string;
  unitLabel: string;
  onClick: (date: Date) => void;
}

export const DayCell: React.FC<DayCellProps> = ({ 
  date, 
  currentMonth, 
  record, 
  currencySymbol, 
  unitLabel,
  onClick 
}) => {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isDayToday = isToday(date);
  const quantity = record?.quantity || 0;
  const price = record?.pricePerUnit || 0;
  const cost = quantity * price;
  const paid = record?.paymentAmount || 0;
  
  const hasMilk = quantity > 0;
  const hasPayment = paid > 0;
  const isFullyPaid = hasMilk && paid >= (cost - 0.1); // Tolerance for float math
  const isPartiallyPaid = hasMilk && !isFullyPaid && paid > 0;

  // Base classes
  let cellClass = "relative h-24 sm:h-32 border border-slate-50 transition-all duration-200 flex flex-col p-2 cursor-pointer hover:bg-blue-50/50 group";
  
  if (!isCurrentMonth) {
    cellClass += " bg-slate-50/50 text-slate-300";
  } else {
    cellClass += " bg-white text-slate-700";
  }

  if (isDayToday) {
    cellClass += " ring-2 ring-inset ring-blue-400 z-10";
  }

  return (
    <div className={cellClass} onClick={() => onClick(date)}>
      {/* Date Number and Status */}
      <div className="flex justify-between items-start">
        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isDayToday ? 'bg-blue-600 text-white' : ''}`}>
          {format(date, 'd')}
        </span>
        
        {/* Status Icon */}
        {hasMilk && (
           <div className="transition-colors">
             {isFullyPaid && <CheckCircle2 size={16} className="text-emerald-500" />}
             {isPartiallyPaid && <PieChart size={16} className="text-amber-500" />}
             {!isFullyPaid && !isPartiallyPaid && <Circle size={16} strokeWidth={3} className="text-rose-300" />}
           </div>
        )}
        {!hasMilk && hasPayment && (
            <div className="text-emerald-500">
                <Coins size={16} />
            </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center mt-1">
        {hasMilk ? (
          <>
            <span className="text-xl sm:text-2xl font-bold text-slate-800">
              {quantity}
              <span className="text-xs font-normal text-slate-400 ml-0.5">{unitLabel}</span>
            </span>
            <div className="flex flex-col items-center">
                <span className="text-xs text-slate-400 font-medium">
                {currencySymbol}{cost.toFixed(0)}
                </span>
                {/* Show Paid amount if it differs from cost or if explicitly paid */}
                {paid > 0 && Math.abs(paid - cost) > 0.1 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${isPartiallyPaid ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>
                        {currencySymbol}{paid.toFixed(0)}
                    </span>
                )}
            </div>
          </>
        ) : (
          <>
            {hasPayment && (
                 <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    +{currencySymbol}{paid}
                 </span>
            )}
            {!hasPayment && isCurrentMonth && (
                <span className="opacity-0 group-hover:opacity-100 text-blue-400 text-2xl font-light transition-opacity">+</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
