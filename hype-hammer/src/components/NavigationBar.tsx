import React from 'react';
import { LayoutDashboard, Users, Trophy, Gavel } from 'lucide-react';

interface NavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  primaryColor: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ 
  activeTab, 
  onTabChange, 
  primaryColor 
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Trophy },
    { id: 'auction', label: 'Auction', icon: Gavel },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t-2 backdrop-blur-md z-40" style={{ borderColor: `${primaryColor}30`, backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
      <div className="flex justify-around items-center">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-all hover:opacity-80"
              style={{
                backgroundColor: isActive ? `${primaryColor}20` : 'transparent',
                borderBottom: isActive ? `3px solid ${primaryColor}` : '3px solid transparent',
                color: isActive ? primaryColor : '#9ca3af'
              }}
            >
              <Icon size={20} />
              <span className="text-xs font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationBar;
