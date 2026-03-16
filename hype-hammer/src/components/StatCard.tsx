import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  primaryColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, primaryColor }) => {
  return (
    <div 
      className="p-6 rounded-2xl border-2 backdrop-blur-sm transition-all hover:scale-105 shadow-lg"
      style={{ 
        borderColor: primaryColor,
        backgroundColor: `${primaryColor}15`,
        boxShadow: `0 0 20px ${primaryColor}20`
      }}
    >
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm font-bold text-gray-300">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
};

export default StatCard;
