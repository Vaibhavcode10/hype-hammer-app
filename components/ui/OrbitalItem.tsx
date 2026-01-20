import React from 'react';

interface OrbitalItemProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

export const OrbitalItem: React.FC<OrbitalItemProps> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`p-3 rounded-2xl transition-all duration-500 relative flex items-center justify-center flex-shrink-0 ${
      active 
        ? 'bg-gradient-to-r from-blue-500 to-orange-500 text-white shadow-[0_0_20px_rgba(197,160,89,0.5)]' 
        : 'text-slate-600 hover:bg-blue-100 hover:text-slate-900'
    }`}
  >
    {icon}
    {active && <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}
  </button>
);
