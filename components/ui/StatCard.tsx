import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, subValue }) => (
  <div className="bg-slate-50 border border-slate-300 rounded-[2rem] p-8 hover:border-blue-500/30 transition-all group overflow-hidden relative">
    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-all text-blue-600">
      {icon}
    </div>
    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">{label}</p>
    <p className="text-3xl font-display font-black text-slate-900 tracking-tighter">{value}</p>
    {subValue && <p className="text-[10px] text-[#5c4742] mt-2 font-medium">{subValue}</p>}
  </div>
);
