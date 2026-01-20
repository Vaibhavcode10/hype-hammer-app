import React from 'react';

interface CommandCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const CommandCard: React.FC<CommandCardProps> = ({ 
  title, children, icon, className = "", actions 
}) => (
  <div className={`bg-slate-50/60 border border-slate-300 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl relative group ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-[11px] font-display font-black flex items-center gap-3 tracking-[0.3em] text-blue-600 uppercase">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {actions && <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">{actions}</div>}
    </div>
    {children}
  </div>
);
