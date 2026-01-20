import React from 'react';

interface HUDPillProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const HUDPill: React.FC<HUDPillProps> = ({ children, icon, className = "" }) => (
  <div className={`flex items-center gap-2 bg-slate-50/80 border border-blue-500/20 backdrop-blur-xl px-4 py-2 rounded-full shadow-lg ${className}`}>
    {icon && <span className="text-blue-600">{icon}</span>}
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{children}</span>
  </div>
);
