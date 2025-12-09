import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  color?: 'blue' | 'green' | 'amber' | 'rose';
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, trend, color = 'blue' }) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4">
      <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
      </div>
    </div>
  );
};
