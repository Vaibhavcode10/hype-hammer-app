import React from 'react';
import { Player, AuctionConfig } from '../../types';
import { Modal } from '../ui';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlayerId: string | null;
  newPlayer: Partial<Player>;
  setNewPlayer: (player: Partial<Player>) => void;
  config: AuctionConfig;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setEditingPlayerId: (id: string | null) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  isOpen,
  onClose,
  editingPlayerId,
  newPlayer,
  setNewPlayer,
  config,
  players,
  setPlayers,
  setEditingPlayerId
}) => {
  const handleSave = () => {
    if (!newPlayer.name) return;
    
    if (editingPlayerId) {
      setPlayers(players.map(p => p.id === editingPlayerId ? { ...p, ...newPlayer } as Player : p));
    } else {
      setPlayers([...players, {
        id: Math.random().toString(36).substr(2, 9),
        name: newPlayer.name!,
        roleId: newPlayer.roleId || config.roles[0].id,
        basePrice: newPlayer.basePrice || 0,
        isOverseas: newPlayer.isOverseas || false,
        status: 'PENDING',
        imageUrl: newPlayer.imageUrl,
        age: newPlayer.age,
        nationality: newPlayer.nationality,
        bio: newPlayer.bio,
        stats: newPlayer.stats
      }]);
    }
    
    setNewPlayer({ name: '', roleId: '', basePrice: 0, isOverseas: false, imageUrl: '', age: 25, nationality: '', bio: '', stats: '' });
    setEditingPlayerId(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setEditingPlayerId(null); }} title={editingPlayerId ? "Refine Talent" : "Enroll Talent"}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Name *</label>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newPlayer.name} 
              onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} 
              placeholder="Player Name" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Base Price *</label>
            <input 
              type="number" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newPlayer.basePrice} 
              onChange={e => setNewPlayer({...newPlayer, basePrice: Number(e.target.value)})} 
              placeholder="1000000" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Role *</label>
            <select 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newPlayer.roleId} 
              onChange={e => setNewPlayer({...newPlayer, roleId: e.target.value})}
            >
              {config.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Age</label>
            <input 
              type="number" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newPlayer.age || ''} 
              onChange={e => setNewPlayer({...newPlayer, age: Number(e.target.value) || undefined})} 
              placeholder="25" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Nationality</label>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newPlayer.nationality || ''} 
              onChange={e => setNewPlayer({...newPlayer, nationality: e.target.value})} 
              placeholder="India" 
            />
          </div>
          <div className="space-y-2 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="isOverseas" 
              className="w-5 h-5 bg-white border border-slate-300 rounded" 
              checked={newPlayer.isOverseas || false} 
              onChange={e => setNewPlayer({...newPlayer, isOverseas: e.target.checked})} 
            />
            <label htmlFor="isOverseas" className="text-[10px] font-black uppercase text-blue-600 cursor-pointer">Overseas Player</label>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-blue-600">Image URL</label>
          <input 
            type="text" 
            className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
            value={newPlayer.imageUrl || ''} 
            onChange={e => setNewPlayer({...newPlayer, imageUrl: e.target.value})} 
            placeholder="https://example.com/player.jpg" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-blue-600">Bio</label>
          <textarea 
            className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500 min-h-[80px]" 
            value={newPlayer.bio || ''} 
            onChange={e => setNewPlayer({...newPlayer, bio: e.target.value})} 
            placeholder="Player background and achievements..." 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-blue-600">Stats Summary</label>
          <textarea 
            className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500 min-h-[80px]" 
            value={newPlayer.stats || ''} 
            onChange={e => setNewPlayer({...newPlayer, stats: e.target.value})} 
            placeholder="Key statistics and performance metrics..." 
          />
        </div>
        <button 
          onClick={handleSave} 
          className="w-full py-5 gold-gradient rounded-3xl text-white font-black uppercase text-xs shadow-2xl hover:brightness-110 transition-all"
        >
          Validate Profile
        </button>
      </div>
    </Modal>
  );
};
