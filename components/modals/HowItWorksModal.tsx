import React from 'react';
import { Play, BookOpen } from 'lucide-react';
import { Modal } from '../ui';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How It Works">
      <div className="space-y-8">
        {/* Mock YouTube Video Embed */}
        <div className="aspect-video bg-[#0d0a09] border-2 border-[#c5a059]/20 rounded-2xl overflow-hidden flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1410] to-[#0d0a09]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-[#c5a059] rounded-full flex items-center justify-center shadow-2xl">
                <Play size={40} fill="#0d0a09" className="text-[#0d0a09] ml-1" />
              </div>
              <p className="text-[#b4a697] text-sm font-bold uppercase tracking-widest">Tutorial Video Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Guidelines */}
        <div className="space-y-6">
          <h3 className="text-lg font-display font-black text-[#c5a059] uppercase tracking-widest border-b border-[#3d2f2b] pb-3">Step-by-Step Guide</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09] text-xl">1</div>
              <div>
                <h4 className="font-bold text-[#f5f5dc] mb-2 text-base">Configure Your Auction</h4>
                <p className="text-sm text-[#b4a697] leading-relaxed">Choose your sport, set budget limits, and customize auction framework to match your league requirements.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09] text-xl">2</div>
              <div>
                <h4 className="font-bold text-[#f5f5dc] mb-2 text-base">Register Teams & Players</h4>
                <p className="text-sm text-[#b4a697] leading-relaxed">Add all participating teams with their budgets, and register players with roles, base prices, and detailed profiles.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09] text-xl">3</div>
              <div>
                <h4 className="font-bold text-[#f5f5dc] mb-2 text-base">Launch Auction Room</h4>
                <p className="text-sm text-[#b4a697] leading-relaxed">Enter the auction room, start the bidding process, and watch as teams compete for top talent in real-time.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-[#c5a059] flex items-center justify-center flex-shrink-0 font-black text-[#0d0a09] text-xl">4</div>
              <div>
                <h4 className="font-bold text-[#f5f5dc] mb-2 text-base">Monitor & Finalize</h4>
                <p className="text-sm text-[#b4a697] leading-relaxed">Track live stats, manage bids, and finalize player sales. Export complete auction history when done.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-[#3d2f2b] pt-6">
          <div className="flex items-start gap-3">
            <BookOpen size={20} className="text-[#c5a059] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[#f5f5dc] mb-2 uppercase tracking-wider text-xs">Pro Tip</h4>
              <p className="text-sm text-[#b4a697] leading-relaxed">Use the dashboard to get AI-powered insights and track real-time auction statistics. Click on any team to view their complete roster and remaining budget.</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
