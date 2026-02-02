import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Player, Team, Bid } from '../../types';
import { CommandCard } from '../ui';

interface HistoryPageProps {
  history: Bid[];
  players: Player[];
  teams: Team[];
  exportHistoryAsJson: () => void;
  currentMatchId?: string;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ 
  history, 
  players, 
  teams, 
  exportHistoryAsJson,
  currentMatchId
}) => {
  const [bidHistory, setBidHistory] = useState<Bid[]>(history);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch bidding history from backend when component mounts
  useEffect(() => {
    if (currentMatchId) {
      fetchBiddingHistory();
    } else {
      setBidHistory(history);
    }
  }, [currentMatchId]);

  const fetchBiddingHistory = async () => {
    if (!currentMatchId) return;

    try {
      setLoading(true);
      setError(null);
      
      const API_BASE = 'https://us-central1-axilam.cloudfunctions.net/auction';
      console.log('📋 Fetching bidding history for match:', currentMatchId);
      
      const response = await fetch(`${API_BASE}/bids?seasonId=${currentMatchId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bidding history: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Bidding history response:', data);
      
      // Extract bids from response (handle both data.data and direct array)
      const bids = data.data || data.bids || [];
      
      // Sort by timestamp ascending (chronological order - oldest first)
      const sortedBids = bids.sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });

      console.log('✅ Successfully fetched', sortedBids.length, 'bids');
      setBidHistory(sortedBids);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Failed to fetch bidding history:', errorMsg);
      setError(errorMsg);
      setBidHistory(history); // Fall back to local history
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  return (
    <CommandCard 
      title="Market Archive" 
      className="w-full" 
      actions={
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchBiddingHistory}
            disabled={loading || !currentMatchId}
            className="flex items-center gap-2 bg-purple-100 text-purple-600 px-4 py-2 rounded-full text-[9px] font-black uppercase hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button 
            onClick={exportHistoryAsJson} 
            className="flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-[9px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all"
          >
            <Download size={14} /> Export Protocol
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-red-700 font-bold text-sm">⚠️ Error loading bidding history:</p>
          <p className="text-red-600 text-xs mt-1">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-slate-600 font-bold">Loading bidding history...</p>
        </div>
      )}

      {!loading && bidHistory.length === 0 && !error && (
        <div className="py-10 text-center">
          <p className="opacity-50 text-[10px] uppercase font-black tracking-[0.3em] text-slate-600">
            No archive data detected
          </p>
        </div>
      )}

      {!loading && bidHistory.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-2 border-slate-300">
              <tr>
                <th className="pb-4">Timestamp</th>
                <th className="pb-4">Asset</th>
                <th className="pb-4">Franchise</th>
                <th className="pb-4 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d2f2b]/30">
              {bidHistory.map((bid, idx) => (
                <tr key={bid.id || idx} className="hover:bg-blue-500/5 transition-all">
                  <td className="py-4 text-[10px] font-mono text-slate-600">
                    {new Date(bid.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-4 font-bold text-slate-900">
                    {bid.playerName || players.find(p => p.id === bid.playerId)?.name || 'Unknown Player'}
                  </td>
                  <td className="py-4 text-blue-600 font-black uppercase text-[10px] tracking-widest">
                    {bid.teamName || teams.find(t => t.id === bid.teamId)?.name || 'Unknown Team'}
                  </td>
                  <td className="py-4 text-right font-mono font-black text-slate-900">
                    {formatCurrency(bid.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-widest">
        Total Bids Recorded: <span className="text-slate-900 font-black text-sm">{bidHistory.length}</span>
      </div>
    </CommandCard>
  );
};
