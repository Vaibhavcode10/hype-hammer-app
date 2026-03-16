import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  primaryColor?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, showBack = true, primaryColor = '#10b981' }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-8 border-b backdrop-blur-md shadow-lg"
      style={{ 
        borderColor: `${primaryColor}50`, 
        backgroundColor: 'rgba(15, 23, 42, 0.7)' 
      }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer border-2 transition-all hover:scale-110"
          style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}20` }}
          onClick={() => navigate('/')}
        >
          <span className="text-2xl">⚔️</span>
        </div>
        <div>
          <h2 className="text-xl font-display font-black tracking-widest uppercase leading-none text-white">{title}</h2>
          {subtitle && (
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-1" style={{ color: primaryColor }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {showBack && (
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full text-white border-2 backdrop-blur-md transition-all hover:bg-white/10"
          style={{ borderColor: primaryColor }}
        >
          <ArrowLeft size={14} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Back</span>
        </button>
      )}
    </div>
  );
};

export default Header;
