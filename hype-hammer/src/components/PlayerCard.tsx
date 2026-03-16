import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  primaryColor: string;
  onClick?: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, primaryColor, onClick }) => {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SOLD': return '#ef4444';
      case 'PENDING': return '#f59e0b';
      default: return '#10b981';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="rounded-xl overflow-hidden border-2 backdrop-blur-sm transition-all hover:scale-105 cursor-pointer shadow-lg"
      style={{
        borderColor: `${primaryColor}50`,
        backgroundColor: `${primaryColor}08`,
        boxShadow: `0 0 15px ${primaryColor}20`
      }}
    >
      <div className="relative h-40 bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden">
        {player.image && (
          <img 
            src={player.image} 
            alt={player.name}
            className="w-full h-full object-cover opacity-90"
          />
        )}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: getStatusColor(player.status), color: 'white' }}>
          {player.status}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-black text-white text-sm mb-1 line-clamp-1">{player.name}</h3>
        <p className="text-xs text-gray-400 mb-3">{player.nationality}</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Base Price</span>
            <span className="font-mono font-bold text-white">${(player.basePrice / 100000).toFixed(1)}L</span>
          </div>
          
          {player.soldPrice && (
            <div className="flex justify-between">
              <span className="text-gray-400">Sold Price</span>
              <span className="font-mono font-bold" style={{ color: primaryColor }}>${(player.soldPrice / 100000).toFixed(1)}L</span>
            </div>
          )}
          
          <p className="text-gray-400 line-clamp-2 italic mt-2">{player.careerDescription}</p>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
