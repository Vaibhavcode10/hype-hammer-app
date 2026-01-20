import React from 'react';
import { Team, AuctionConfig } from '../../types';
import { Modal } from '../ui';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTeamId: string | null;
  newTeam: Partial<Team>;
  setNewTeam: (team: Partial<Team>) => void;
  config: AuctionConfig;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  setEditingTeamId: (id: string | null) => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  editingTeamId,
  newTeam,
  setNewTeam,
  config,
  teams,
  setTeams,
  setEditingTeamId
}) => {
  const handleSave = () => {
    if (!newTeam.name) return;
    
    if (editingTeamId) {
      setTeams(teams.map(t => t.id === editingTeamId ? {
        ...t,
        ...newTeam,
        remainingBudget: teams.find(tm => tm.id === editingTeamId)?.remainingBudget || newTeam.budget || config.totalBudget
      } as Team : t));
    } else {
      setTeams([...teams, {
        id: Math.random().toString(36).substr(2, 9),
        name: newTeam.name!,
        budget: newTeam.budget || config.totalBudget,
        remainingBudget: newTeam.budget || config.totalBudget,
        players: [],
        owner: newTeam.owner,
        homeCity: newTeam.homeCity,
        foundationYear: newTeam.foundationYear,
        logo: newTeam.logo
      }]);
    }
    
    setNewTeam({ name: '', owner: '', budget: 0, logo: '', homeCity: '', foundationYear: 2024 });
    setEditingTeamId(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setEditingTeamId(null); }} title={editingTeamId ? "Update Charter" : "Charter Franchise"}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Team Name *</label>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newTeam.name} 
              onChange={e => setNewTeam({...newTeam, name: e.target.value})} 
              placeholder="Team Name" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Budget *</label>
            <input 
              type="number" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newTeam.budget} 
              onChange={e => setNewTeam({...newTeam, budget: Number(e.target.value)})} 
              placeholder="100000000" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Owner</label>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newTeam.owner || ''} 
              onChange={e => setNewTeam({...newTeam, owner: e.target.value})} 
              placeholder="Owner Name" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Home City</label>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newTeam.homeCity || ''} 
              onChange={e => setNewTeam({...newTeam, homeCity: e.target.value})} 
              placeholder="Mumbai" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600">Foundation Year</label>
            <input 
              type="number" 
              className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
              value={newTeam.foundationYear || ''} 
              onChange={e => setNewTeam({...newTeam, foundationYear: Number(e.target.value) || undefined})} 
              placeholder="2024" 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-blue-600">Logo URL</label>
          <input 
            type="text" 
            className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-slate-900 outline-none focus:ring-1 ring-blue-500" 
            value={newTeam.logo || ''} 
            onChange={e => setNewTeam({...newTeam, logo: e.target.value})} 
            placeholder="https://example.com/logo.png" 
          />
        </div>
        <button 
          onClick={handleSave} 
          className="w-full py-5 gold-gradient rounded-3xl text-white font-black uppercase text-xs shadow-2xl hover:brightness-110 transition-all"
        >
          Deploy Charter
        </button>
      </div>
    </Modal>
  );
};
