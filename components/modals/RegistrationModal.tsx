import React, { useState } from 'react';
import { X, Users, User } from 'lucide-react';
import { UserRole, MatchData, SportData, AuctionStatus } from '../../types';
import { RoleBasedRegistrationPage } from '../pages/RoleBasedRegistrationPage';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole.TEAM_REP | UserRole.PLAYER;
  matchId: string;
  matchData: MatchData | null;
  sportData: SportData | null;
  onRegister: (registrationData: any) => Promise<boolean | void>;
  onSuccess?: () => void; // Callback to refresh parent list
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  role,
  matchId,
  matchData,
  sportData,
  onRegister,
  onSuccess
}) => {
  const [registrationCompleted, setRegistrationCompleted] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async (registrationData: any) => {
    const result = await onRegister(registrationData);
    
    // If registration succeeded
    if (result !== false) {
      setRegistrationCompleted(true);
      
      // Call success callback to refresh parent list
      if (onSuccess) {
        onSuccess();
      }
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setRegistrationCompleted(false);
      }, 2000);
    }
    
    return result;
  };

  const handleClose = () => {
    if (!registrationCompleted) {
      onClose();
    }
  };

  const roleTitle = role === UserRole.TEAM_REP ? 'Team' : 'Player';
  const RoleIcon = role === UserRole.TEAM_REP ? Users : User;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={registrationCompleted}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-900/80 hover:bg-gray-800 transition-colors border border-gray-700 disabled:opacity-50"
        >
          <X size={20} className="text-gray-400" />
        </button>

        {/* Modal Header */}
        <div 
          className="sticky top-0 z-10 px-6 py-4 border-b"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
            borderColor: 'rgba(75, 85, 99, 0.3)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{
                background: role === UserRole.TEAM_REP 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))'
                  : 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(219, 39, 119, 0.1))',
                border: role === UserRole.TEAM_REP 
                  ? '1px solid rgba(59, 130, 246, 0.3)'
                  : '1px solid rgba(236, 72, 153, 0.3)'
              }}
            >
              <RoleIcon 
                size={24} 
                className={role === UserRole.TEAM_REP ? 'text-blue-400' : 'text-pink-400'}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Register New {roleTitle}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {matchData?.name || 'Loading match...'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body - Registration Form */}
        <div className="bg-gray-900">
          <RoleBasedRegistrationPage
            setStatus={() => {}} // Not used in modal context
            selectedRole={role}
            selectedMatch={matchData}
            selectedSport={sportData}
            onRegister={handleRegister}
            matchId={matchId}
          />
        </div>
      </div>
    </div>
  );
};
