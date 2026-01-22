import React, { useState } from 'react';
import { Trophy, Building2, Calendar, MapPin, Users, DollarSign, Upload, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { AuctionStatus, SportType } from '../../types';

interface AdminRegistrationPageProps {
  setStatus: (status: AuctionStatus) => void;
  onRegisterAdmin: (adminData: AdminFormData) => void | Promise<void>;
}

export interface AdminFormData {
  // Organizer Details
  organizationName: string;
  organizerType: 'College' | 'League' | 'Club' | 'Private' | '';
  designation: 'Organizer' | 'Coordinator' | 'Owner' | '';
  
  // Personal Details
  fullName: string;
  email: string;
  phone: string;
  password: string;
  
  // Season/Match Creation
  seasonName: string;
  sportType: SportType | '';
  auctionDateTime: string;
  venueMode: 'Physical' | 'Online' | 'Hybrid' | '';
  venueLocation?: string;
  
  // Auction Configuration
  maxTeams: number;
  maxPlayersPerTeam: number;
  baseBudgetPerTeam: number;
  
  // Verification
  governmentId: string;
  governmentIdFile?: File;
  organizerProof?: File;
}

export const AdminRegistrationPage: React.FC<AdminRegistrationPageProps> = ({ setStatus, onRegisterAdmin }) => {
  const [formData, setFormData] = useState<AdminFormData>({
    organizationName: '',
    organizerType: '',
    designation: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    seasonName: '',
    sportType: '',
    auctionDateTime: '',
    venueMode: '',
    venueLocation: '',
    maxTeams: 8,
    maxPlayersPerTeam: 15,
    baseBudgetPerTeam: 10000000,
    governmentId: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const totalSteps = 4;

  const handleInputChange = (field: keyof AdminFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: 'governmentIdFile' | 'organizerProof', file: File | null) => {
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName && formData.email && formData.phone && formData.password);
      case 2:
        return !!(formData.organizationName && formData.organizerType && formData.designation);
      case 3:
        return !!(formData.seasonName && formData.sportType && formData.auctionDateTime && formData.venueMode);
      case 4:
        return !!(formData.governmentId);
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStepValid(4)) {
      await onRegisterAdmin(formData);
      setShowSuccessModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => setStatus(AuctionStatus.HOME)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center">
            <Trophy size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">Season Organizer Registration</h1>
          <p className="text-slate-600">Create and manage your own sports auction event</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step <= currentStep
                      ? 'gold-gradient text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step < currentStep ? <CheckCircle size={20} /> : step}
                </div>
                <span className="text-xs mt-2 font-semibold text-slate-600">
                  {step === 1 && 'Personal'}
                  {step === 2 && 'Organization'}
                  {step === 3 && 'Season Details'}
                  {step === 4 && 'Verification'}
                </span>
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all ${
                    step < currentStep ? 'bg-gradient-to-r from-blue-500 to-orange-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200">
          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="+91 9876543210"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Organization Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Organization / Tournament Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="XYZ College Sports Committee"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Organizer Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.organizerType}
                      onChange={(e) => handleInputChange('organizerType', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="College">College</option>
                      <option value="League">League</option>
                      <option value="Club">Club</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Your Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Designation</option>
                      <option value="Organizer">Organizer</option>
                      <option value="Coordinator">Coordinator</option>
                      <option value="Owner">Owner</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Season/Match Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Season / Match Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Season / Match Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.seasonName}
                    onChange={(e) => handleInputChange('seasonName', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., IPL 2026, Inter-College Cricket Championship"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will be displayed as the tournament/season name (NOT your personal name)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Sport Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sportType}
                      onChange={(e) => handleInputChange('sportType', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Sport</option>
                      {Object.values(SportType).map((sport) => (
                        <option key={sport} value={sport}>{sport}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Auction Date & Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="datetime-local"
                        value={formData.auctionDateTime}
                        onChange={(e) => handleInputChange('auctionDateTime', e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Venue Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.venueMode}
                      onChange={(e) => handleInputChange('venueMode', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Mode</option>
                      <option value="Physical">Physical Venue</option>
                      <option value="Online">Online Only</option>
                      <option value="Hybrid">Hybrid (Both)</option>
                    </select>
                  </div>

                  {formData.venueMode && formData.venueMode !== 'Online' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Venue Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                          type="text"
                          value={formData.venueLocation || ''}
                          onChange={(e) => handleInputChange('venueLocation', e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                          placeholder="Mumbai, Maharashtra"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" />
                    Auction Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Max Teams
                      </label>
                      <input
                        type="number"
                        value={formData.maxTeams}
                        onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        min="2"
                        max="32"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Max Players/Team
                      </label>
                      <input
                        type="number"
                        value={formData.maxPlayersPerTeam}
                        onChange={(e) => handleInputChange('maxPlayersPerTeam', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        min="5"
                        max="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Budget per Team (₹)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          value={formData.baseBudgetPerTeam}
                          onChange={(e) => handleInputChange('baseBudgetPerTeam', parseInt(e.target.value))}
                          className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                          step="1000000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Verification Documents</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Government ID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.governmentId}
                    onChange={(e) => handleInputChange('governmentId', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Aadhaar / PAN / Driving License"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Upload Government ID <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                      <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                      <input
                        type="file"
                        onChange={(e) => handleFileChange('governmentIdFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="govId"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="govId" className="cursor-pointer">
                        <span className="text-sm text-slate-600">
                          {formData.governmentIdFile ? formData.governmentIdFile.name : 'Click to upload PDF/Image'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Organization Proof (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                      <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                      <input
                        type="file"
                        onChange={(e) => handleFileChange('organizerProof', e.target.files?.[0] || null)}
                        className="hidden"
                        id="orgProof"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="orgProof" className="cursor-pointer">
                        <span className="text-sm text-slate-600">
                          {formData.organizerProof ? formData.organizerProof.name : 'Click to upload PDF/Image'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your application will be reviewed by our team. You'll receive approval notification within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                currentStep === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              disabled={currentStep === 1}
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => {
                  if (isStepValid(currentStep)) {
                    setCurrentStep(prev => prev + 1);
                  }
                }}
                className={`px-8 py-3 rounded-lg font-bold transition-all ${
                  isStepValid(currentStep)
                    ? 'gold-gradient text-white hover:brightness-110'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!isStepValid(currentStep)}
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                className={`px-8 py-3 rounded-lg font-bold transition-all ${
                  isStepValid(currentStep)
                    ? 'gold-gradient text-white hover:brightness-110'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!isStepValid(currentStep)}
              >
                Submit Application
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-300">
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center animate-bounce">
                <CheckCircle size={48} className="text-white" />
              </div>
              
              {/* Success Message */}
              <h2 className="text-3xl font-black text-slate-900 mb-3">
                Registration Successful! 🎉
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Your season <strong>"{formData.seasonName}"</strong> has been registered successfully. 
                Your application is under review and will be approved within 24-48 hours.
              </p>
              
              {/* Details */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Organization:</span>
                    <span className="font-bold text-slate-900">{formData.organizationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sport:</span>
                    <span className="font-bold text-slate-900">{formData.sportType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Auction Date:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(formData.auctionDateTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => setStatus(AuctionStatus.ADMIN_DASHBOARD)}
                className="w-full px-8 py-4 gold-gradient text-white rounded-lg font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-lg"
              >
                Go to Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
