import React from 'react';
import { Play, BookOpen } from 'lucide-react';
import { Modal } from '../ui';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How HypeHammer Works">
      <div className="space-y-8">
        {/* Intro Section */}
        <div className="bg-blue-50 border-2 border-blue-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-700 leading-relaxed font-semibold">
            HypeHammer is a real-time auction platform for managing competitive bidding events. Teams bid for players with live synchronization across all participants.
          </p>
        </div>

        {/* Step-by-Step Guidelines */}
        <div className="space-y-6">
          <h3 className="text-lg font-display font-black text-blue-600 uppercase tracking-widest border-b border-slate-300 pb-3">Step-by-Step Guide</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl">1</div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-base">Admin Setup</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Admins create auction seasons, auctioneers register and await approval. Configure teams, player roles, and base prices.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl">2</div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-base">Register Teams & Players</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Team reps register with budgets. Players are added with stats, roles, base prices, and detailed profiles for bidding.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl">3</div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-base">Launch Auction</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Auctioneers start the live auction room. Teams bid in real-time with instant synchronization across all dashboards.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0 font-black text-white text-xl">4</div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-base">Monitor & Complete</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Track live team rosters, budgets, and stats. Manage unsold players across multiple rounds. Export final results.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-slate-300 pt-6">
          <div className="flex items-start gap-3">
            <BookOpen size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-xs">Pro Tips</h4>
              <ul className="text-sm text-slate-600 leading-relaxed space-y-1">
                <li>• Team reps place real-time bids with instant feedback on bid acceptance</li>
                <li>• Auctioneers control pace with timer and bid management tools</li>
                <li>• All dashboards sync live showing current bids, teams, and budgets</li>
                <li>• Use unsold/defer options to run multiple auction rounds</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
