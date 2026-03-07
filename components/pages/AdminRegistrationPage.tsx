import React, { useState, useCallback } from 'react';
import { Trophy, Building2, Calendar, MapPin, Users, DollarSign, Upload, ArrowLeft, CheckCircle, AlertCircle, User, Shield } from 'lucide-react';
import { AuctionStatus, SportType } from '../../types';
import { uploadProfilePicture, uploadDocument } from '../../services/firebaseStorageService';
import { PhoneOtpVerification } from '../ui/PhoneOtpVerification';
import { NeonDesignStyles, GlassCard, NeonButton, GradientHeading, NeonPageWrapper, NeonInput } from '../ui/NeonDesignSystem';

interface AdminRegistrationPageProps {
  setStatus: (status: AuctionStatus) => void;
  onRegisterAdmin: (adminData: AdminFormData) => void | Promise<void>;
}

export interface AdminFormData {
  // Organizer Details
  organizationName: string;
  organizerType: 'College' | 'League' | 'Club' | 'Private' | 'Other' | '';
  organizerTypeOther?: string; // Custom value when "Other" is selected
  designation: 'Organizer' | 'Coordinator' | 'Owner' | '';
  
  // Personal Details
  fullName: string;
  email: string;
  phone: string;
  password: string;
  profilePhotoURL?: string;
  
  // Season/Match Creation
  seasonName: string;
  sportType: SportType | '';
  sportTypeCustom?: string; // Custom value when "Custom" is selected
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
  governmentIdURL?: string;
  organizerProof?: File;
  organizerProofURL?: string;
  // OTP Verification
  phoneVerified: boolean;
}

export const AdminRegistrationPage: React.FC<AdminRegistrationPageProps> = ({ setStatus, onRegisterAdmin }) => {
  const [formData, setFormData] = useState<AdminFormData>({
    organizationName: '',
    organizerType: '',
    organizerTypeOther: '',
    designation: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    seasonName: '',
    sportType: '',
    sportTypeCustom: '',
    auctionDateTime: '',
    venueMode: '',
    venueLocation: '',
    maxTeams: 8,
    maxPlayersPerTeam: 15,
    baseBudgetPerTeam: 10000000,
    governmentId: '',
    phoneVerified: false
  });

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = !confirmPassword || formData.password === confirmPassword;
  const passwordOk = !!(formData.password && confirmPassword && formData.password === confirmPassword);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ photo?: number; govId?: number; proof?: number }>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = useCallback((field: keyof AdminFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileChange = (field: 'governmentIdFile' | 'organizerProof', file: File | null) => {
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadErrors([]);

    try {
      // Use season name as match name, with organization name as fallback
      const matchName = formData.seasonName || formData.organizationName || 'AdminOrganizer';
      const photoURL = await uploadProfilePicture(file, `admin_${Date.now()}`, matchName);
      setFormData(prev => ({ ...prev, profilePhotoURL: photoURL }));
      setUploadProgress(prev => ({ ...prev, photo: 100 }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Photo upload failed';
      setUploadErrors(prev => [...prev, `Photo: ${msg}`]);
    } finally {
      setUploading(false);
      setUploadProgress(prev => ({ ...prev, photo: undefined }));
    }
  };

  // Handle government ID upload
  const handleGovIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadErrors([]);

    try {
      // Use season name as match name, with organization name as fallback
      const matchName = formData.seasonName || formData.organizationName || 'AdminOrganizer';
      const docURL = await uploadDocument(file, 'GovernmentID', `govid_${Date.now()}`, matchName);
      setFormData(prev => ({ ...prev, governmentIdURL: docURL }));
      setUploadProgress(prev => ({ ...prev, govId: 100 }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Document upload failed';
      setUploadErrors(prev => [...prev, `Gov ID: ${msg}`]);
    } finally {
      setUploading(false);
      setUploadProgress(prev => ({ ...prev, govId: undefined }));
    }
  };

  // Handle organizer proof upload
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadErrors([]);

    try {
      // Use season name as match name, with organization name as fallback
      const matchName = formData.seasonName || formData.organizationName || 'AdminOrganizer';
      const docURL = await uploadDocument(file, 'OrganizerProof', `proof_${Date.now()}`, matchName);
      setFormData(prev => ({ ...prev, organizerProofURL: docURL }));
      setUploadProgress(prev => ({ ...prev, proof: 100 }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Document upload failed';
      setUploadErrors(prev => [...prev, `Proof: ${msg}`]);
    } finally {
      setUploading(false);
      setUploadProgress(prev => ({ ...prev, proof: undefined }));
    }
  };

  const isFormValid = (): boolean => {
    // Check if "Other" organizer type is selected but custom value is empty
    if (formData.organizerType === 'Other' && !formData.organizerTypeOther?.trim()) {
      return false;
    }
    
    // Check if "Custom" sport type is selected but custom value is empty
    if (formData.sportType === 'Custom' && !formData.sportTypeCustom?.trim()) {
      return false;
    }
    
    // ✅ Validate auction configuration
    const auctionConfigValid = !!(formData.maxTeams && formData.maxTeams >= 2 && 
                                   formData.maxPlayersPerTeam && formData.maxPlayersPerTeam >= 1 && 
                                   formData.baseBudgetPerTeam && formData.baseBudgetPerTeam > 0);
    
    const personalValid = !!(formData.fullName && formData.email && formData.phone && formData.password && formData.organizationName && formData.organizerType && formData.designation && phoneVerified && passwordOk);
    const seasonValid = !!(formData.seasonName && formData.sportType && formData.auctionDateTime && formData.venueMode);
    const verificationValid = !!(formData.governmentId);
    return personalValid && seasonValid && verificationValid && auctionConfigValid;
  };

  // Calculate form completion percentage
  const getCompletionPercentage = (): number => {
    const fields = [
      formData.fullName,
      formData.email,
      formData.phone,
      formData.password,
      confirmPassword && passwordsMatch,
      phoneVerified,
      formData.organizationName,
      formData.organizerType,
      formData.organizerType === 'Other' ? formData.organizerTypeOther : true,
      formData.designation,
      formData.seasonName,
      formData.sportType,
      formData.sportType === 'Custom' ? formData.sportTypeCustom : true,
      formData.auctionDateTime,
      formData.venueMode,
      formData.governmentId
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // ─── START OF SUBMIT HANDLER ───
    console.log('🚀 [SUBMIT] CREATE SEASON button handler triggered');
    
    e.preventDefault();
    
    // Check if form is valid
    if (!isFormValid()) {
      console.error('❌ [VALIDATION] Form validation failed');
      console.log('📋 Validation failures:');
      
      // Show validation errors instead of silently returning
      const errors: string[] = [];
      
      // Check personal details
      if (!formData.fullName) errors.push('Full Name is required');
      if (!formData.email) errors.push('Email is required');
      if (!formData.phone) errors.push('Phone is required');
      if (!phoneVerified) errors.push('Phone verification is required');
      if (!formData.password) errors.push('Password is required');
      if (!passwordOk) errors.push('Passwords do not match');
      
      // Check organization details
      if (!formData.organizationName) errors.push('Organization Name is required');
      if (!formData.organizerType) errors.push('Organizer Type is required');
      if (formData.organizerType === 'Other' && !formData.organizerTypeOther?.trim()) {
        errors.push('Please enter organizer type for "Other"');
      }
      if (!formData.designation) errors.push('Designation is required');
      
      // Check season details
      if (!formData.seasonName) errors.push('Season/Match Name is required');
      if (!formData.sportType) errors.push('Sport Type is required');
      if (formData.sportType === 'Custom' && !formData.sportTypeCustom?.trim()) {
        errors.push('Please enter sport name for "Custom"');
      }
      if (!formData.auctionDateTime) errors.push('Auction Date is required');
      if (!formData.venueMode) errors.push('Venue Mode is required');
      
      // Check verification
      if (!formData.governmentId) errors.push('Government ID is required');
      
      // Check auction configuration
      if (!formData.maxTeams || formData.maxTeams < 2) errors.push('Teams must be at least 2');
      if (!formData.maxPlayersPerTeam || formData.maxPlayersPerTeam < 1) errors.push('Players per team must be at least 1');
      if (!formData.baseBudgetPerTeam || formData.baseBudgetPerTeam <= 0) errors.push('Budget per team must be greater than 0');
      
      errors.forEach(error => console.log(`   • ${error}`));
      console.log('=' .repeat(80));
      
      // Show validation errors to user
      setUploadErrors(errors);
      return;
    }
    
    console.log('✅ [VALIDATION] Form validation passed');
    
    try {
      // Log all form fields before submission
      console.log('=' .repeat(80));
      console.log('📋 ADMIN REGISTRATION FORM SUBMISSION');
      console.log('=' .repeat(80));
      console.log(`📦 Total fields in form: ${Object.keys(formData).length}`);
      console.log(`📋 Form fields:`);
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'object' && value instanceof File) {
          console.log(`   ${key}: File (${value.name})`);
        } else if (typeof value === 'object' && value !== null) {
          console.log(`   ${key}: ${typeof value} = ${JSON.stringify(value)}`);
        } else {
          console.log(`   ${key}: ${typeof value} = ${value}`);
        }
      });
      console.log('=' .repeat(80));
      
      // Show loading state
      setShowSuccessModal(false);
      setUploadErrors([]);
      
      // Log before calling the API
      console.log('📡 [API] Calling createSeason API with admin registration data...');
      console.log(`   Season: "${formData.seasonName}"`);
      console.log(`   Organization: "${formData.organizationName}"`);
      console.log(`   Admin Email: "${formData.email}"`);
      
      // Call registration (include phoneVerified flag in payload)
      await onRegisterAdmin({ ...formData, phoneVerified: true });
      
      console.log('✅ [API] createSeason API call successful');
      
      // Show success modal - onRegisterAdmin doesn't throw if successful
      setShowSuccessModal(true);
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        setStatus(AuctionStatus.ADMIN_DASHBOARD);
      }, 2000);
    } catch (error) {
      // Error was already handled in onRegisterAdmin with alert
      console.error('❌ [API] Registration API call failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setUploadErrors([`Registration failed: ${errorMsg}`]);
      setShowSuccessModal(false);
    }
  };

  return (
    <NeonPageWrapper className="min-h-screen py-4 px-4">
      <NeonDesignStyles />
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 sticky top-0 z-30 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(26, 10, 10, 0.95), rgba(45, 10, 10, 0.95))', border: '1px solid rgba(255, 0, 102, 0.3)' }}>
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-2 text-pink-400 hover:text-pink-300 font-semibold transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.4)' }}>
              <Trophy size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-pink-100 leading-tight">Season Organizer Registration</h1>
              <p className="text-pink-300/70 text-xs hidden sm:block">Create and manage your own sports auction event</p>
            </div>
          </div>

          {/* Completion Badge */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255, 0, 102, 0.1)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 0, 102, 0.15)' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', width: `${getCompletionPercentage()}%` }}
                />
              </div>
              <span className="text-xs font-bold text-pink-300">{getCompletionPercentage()}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Container ──────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Upload Errors */}
          {uploadErrors.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
              {uploadErrors.map((error, idx) => (
                <div key={idx} className="flex items-start gap-2 text-red-400 text-sm mb-1 last:mb-0">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: Personal & Organization Information                      */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          <GlassCard glow className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 15px rgba(255, 0, 102, 0.3)' }}>
                <User size={18} className="text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-pink-100">Personal & Organization Information</h2>
            </div>
            <div className="h-px mb-6 mt-3" style={{ background: 'rgba(255, 0, 102, 0.2)' }} />

            {/* Profile Photo (left) + Fields (right) */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo */}
              <div className="flex-shrink-0 w-full md:w-48">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                    <Upload size={14} className="inline mr-1.5 -mt-0.5" />
                    Profile Photo
                  </label>
                  <div className="w-28 h-28 mx-auto mb-3 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden" style={{ borderColor: 'rgba(255, 0, 102, 0.4)', background: 'rgba(255, 0, 102, 0.05)' }}>
                    {formData.profilePhotoURL ? (
                      <img 
                        src={formData.profilePhotoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('❌ Failed to load profile image:', formData.profilePhotoURL);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-pink-400/60">
                        <Upload size={20} className="mx-auto mb-1" />
                        <span className="text-[10px]">No photo</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    disabled={uploading}
                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:cursor-pointer cursor-pointer disabled:opacity-50 text-pink-300"
                    style={{ 
                      '--file-text-color': '#f472b6',
                      '--file-background': 'rgba(255, 0, 102, 0.15)',
                    } as any}
                  />
                  {uploadProgress.photo !== undefined && (
                    <div className="mt-2">
                      <progress value={uploadProgress.photo} max={100} className="w-full h-1.5 rounded" style={{ accentColor: '#ff0066' }} />
                      <p className="text-[10px] text-pink-300/60 mt-0.5">{Math.round(uploadProgress.photo)}%</p>
                    </div>
                  )}
                  {formData.profilePhotoURL && (
                    <div className="mt-1.5 flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle size={12} />
                      <span>Uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <PhoneOtpVerification
                    phone={formData.phone}
                    setPhone={(v) => handleInputChange('phone', v)}
                    phoneVerified={phoneVerified}
                    setPhoneVerified={setPhoneVerified}
                    compact
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                    placeholder="••••••••"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Re-enter Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none transition-colors"
                    placeholder="••••••••"
                    style={{ 
                      background: 'rgba(255, 0, 102, 0.08)',
                      border: confirmPassword 
                        ? passwordsMatch 
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(255, 0, 102, 0.3)'
                    }}
                    required
                  />
                  {confirmPassword && (
                    <p className={`mt-1 text-xs font-medium ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Organization sub-section */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.2)' }}>
              <h3 className="text-base font-black uppercase text-pink-100 mb-4 flex items-center gap-2 tracking-wider">
                <Building2 size={18} style={{ color: 'rgb(244, 114, 182)' }} />
                Organization Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Organization / Tournament Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                      placeholder="XYZ College Sports Committee"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Organizer Type <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2 items-flex-start">
                    <select
                      value={formData.organizerType}
                      onChange={(e) => handleInputChange('organizerType', e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    >
                      <option value="" className="bg-[#1a0a0a] text-pink-300">Select Type</option>
                      <option value="College" className="bg-[#1a0a0a] text-pink-300">College</option>
                      <option value="League" className="bg-[#1a0a0a] text-pink-300">League</option>
                      <option value="Club" className="bg-[#1a0a0a] text-pink-300">Club</option>
                      <option value="Private" className="bg-[#1a0a0a] text-pink-300">Private</option>
                      <option value="Other" className="bg-[#1a0a0a] text-pink-300">Other</option>
                    </select>
                    
                    {/* Conditional text input for "Other" option */}
                    {formData.organizerType === 'Other' && (
                      <input
                        type="text"
                        value={formData.organizerTypeOther || ''}
                        onChange={(e) => handleInputChange('organizerTypeOther', e.target.value)}
                        placeholder="Enter type"
                        className="flex-1 px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors text-pink-100 placeholder-pink-300/40"
                        style={{ 
                          background: formData.organizerTypeOther?.trim() 
                            ? 'rgba(34, 197, 94, 0.08)' 
                            : 'rgba(251, 113, 133, 0.08)',
                          border: formData.organizerTypeOther?.trim()
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px solid rgba(251, 113, 133, 0.3)'
                        }}
                        required
                      />
                    )}
                  </div>
                  {formData.organizerType === 'Other' && !formData.organizerTypeOther?.trim() && (
                    <p className="text-xs text-red-400 mt-1 font-medium">Please enter organizer type</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Your Designation <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    required
                  >
                    <option value="" className="bg-[#1a0a0a] text-pink-300">Select Designation</option>
                    <option value="Organizer" className="bg-[#1a0a0a] text-pink-300">Organizer</option>
                    <option value="Coordinator" className="bg-[#1a0a0a] text-pink-300">Coordinator</option>
                    <option value="Owner" className="bg-[#1a0a0a] text-pink-300">Owner</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: Season / Match Details                                   */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          <GlassCard glow className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 15px rgba(255, 0, 102, 0.3)' }}>
                <Trophy size={18} className="text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-pink-100">Season / Match Details</h2>
            </div>
            <div className="h-px mb-6 mt-3" style={{ background: 'rgba(255, 0, 102, 0.2)' }} />

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                  Season / Match Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.seasonName}
                  onChange={(e) => handleInputChange('seasonName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                  placeholder="e.g., IPL 2026, Inter-College Cricket Championship"
                  style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                  required
                />
                <p className="text-xs text-pink-300/60 mt-1">
                  This will be displayed as the tournament/season name (NOT your personal name)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Sport Type <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2 items-flex-start">
                    <select
                      value={formData.sportType}
                      onChange={(e) => handleInputChange('sportType', e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    >
                      <option value="" className="bg-[#1a0a0a] text-pink-300">Select Sport</option>
                      {Object.values(SportType).map((sport) => (
                        <option key={sport} value={sport} className="bg-[#1a0a0a] text-pink-300">{sport}</option>
                      ))}
                    </select>
                    
                    {/* Conditional text input for "Custom" sport type */}
                    {formData.sportType === 'Custom' && (
                      <input
                        type="text"
                        value={formData.sportTypeCustom || ''}
                        onChange={(e) => handleInputChange('sportTypeCustom', e.target.value)}
                        placeholder="Enter sport"
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors ${
                          formData.sportTypeCustom?.trim()
                            ? ''
                            : ''
                        }`}
                        style={{ 
                          background: formData.sportTypeCustom?.trim() 
                            ? 'rgba(34, 197, 94, 0.08)' 
                            : 'rgba(251, 113, 133, 0.08)',
                          border: formData.sportTypeCustom?.trim()
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px solid rgba(251, 113, 133, 0.3)',
                          color: 'rgb(244, 114, 182)'
                        }}
                        required
                      />
                    )}
                  </div>
                  {formData.sportType === 'Custom' && !formData.sportTypeCustom?.trim() && (
                    <p className="text-xs text-red-400 mt-1 font-medium">Please enter sport name</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Auction Date <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                    <input
                      type="date"
                      value={formData.auctionDateTime}
                      onChange={(e) => handleInputChange('auctionDateTime', e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                    Venue Mode <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.venueMode}
                    onChange={(e) => handleInputChange('venueMode', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-pink-100 text-sm focus:outline-none"
                    style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                    required
                  >
                    <option value="" className="bg-[#1a0a0a] text-pink-300">Select Mode</option>
                    <option value="Physical" className="bg-[#1a0a0a] text-pink-300">Physical Venue</option>
                    <option value="Online" className="bg-[#1a0a0a] text-pink-300">Online Only</option>
                    <option value="Hybrid" className="bg-[#1a0a0a] text-pink-300">Hybrid (Both)</option>
                  </select>
                </div>

                {formData.venueMode && formData.venueMode !== 'Online' && (
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                      Venue Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400/60" size={18} />
                      <input
                        type="text"
                        value={formData.venueLocation || ''}
                        onChange={(e) => handleInputChange('venueLocation', e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                        placeholder="Mumbai, Maharashtra"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Auction Config */}
              <div className="rounded-xl p-5 mt-2" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                <h3 className="text-sm font-black uppercase text-pink-400 mb-3 flex items-center gap-2 tracking-wider">
                  <Users size={16} className="text-pink-400" />
                  Auction Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">Max Teams</label>
                    <input
                      type="number"
                      value={formData.maxTeams}
                      onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      min="2"
                      max="32"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">Max Players/Team</label>
                    <input
                      type="number"
                      value={formData.maxPlayersPerTeam}
                      onChange={(e) => handleInputChange('maxPlayersPerTeam', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                      style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                      min="5"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">Budget per Team (₹)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400/60" size={14} />
                      <input
                        type="number"
                        value={formData.baseBudgetPerTeam}
                        onChange={(e) => handleInputChange('baseBudgetPerTeam', parseInt(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                        style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                        step="1000000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: Verification                                            */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          <GlassCard glow className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 15px rgba(255, 0, 102, 0.3)' }}>
                <Shield size={18} className="text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-pink-100">Verification Documents</h2>
            </div>
            <div className="h-px mb-6 mt-3" style={{ background: 'rgba(255, 0, 102, 0.2)' }} />

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-1.5">
                  Government ID Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.governmentId}
                  onChange={(e) => handleInputChange('governmentId', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-pink-100 placeholder-pink-300/40 text-sm focus:outline-none"
                  style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.3)' }}
                  placeholder="Aadhaar / PAN / Driving License"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Government ID Upload */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                    <Upload size={14} className="inline mr-1.5 -mt-0.5" />
                    Government ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleGovIdUpload}
                    disabled={uploading}
                    className="w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:cursor-pointer cursor-pointer disabled:opacity-50 text-pink-300"
                    style={{ 
                      '--file-text-color': '#f472b6',
                      '--file-background': 'rgba(255, 0, 102, 0.15)',
                    } as any}
                  />
                  <p className="text-xs text-pink-300/60 mt-2">PDF or Image — Passport, Aadhar, License (Max 50MB)</p>
                  {uploadProgress.govId !== undefined && (
                    <div className="mt-2">
                      <progress value={uploadProgress.govId} max={100} className="w-full h-1.5 rounded" style={{ accentColor: '#ff0066' }} />
                      <p className="text-[10px] text-pink-300/60 mt-0.5">{Math.round(uploadProgress.govId)}% uploaded</p>
                    </div>
                  )}
                  {formData.governmentIdURL && (
                    <div className="mt-2 flex items-center gap-1.5 text-green-400 text-sm">
                      <CheckCircle size={14} />
                      <span>ID uploaded successfully</span>
                    </div>
                  )}
                </div>

                {/* Organization Proof Upload */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                  <label className="block text-xs font-black uppercase text-pink-400 tracking-wider mb-2">
                    <Upload size={14} className="inline mr-1.5 -mt-0.5" />
                    Organization Proof (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleProofUpload}
                    disabled={uploading}
                    className="w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:cursor-pointer cursor-pointer disabled:opacity-50 text-pink-300"
                    style={{ 
                      '--file-text-color': '#f472b6',
                      '--file-background': 'rgba(255, 0, 102, 0.15)',
                    } as any}
                  />
                  <p className="text-xs text-pink-300/60 mt-2">Registration certificate, Incorporation documents, etc. (Max 50MB)</p>
                  {uploadProgress.proof !== undefined && (
                    <div className="mt-2">
                      <progress value={uploadProgress.proof} max={100} className="w-full h-1.5 rounded" style={{ accentColor: '#ff0066' }} />
                      <p className="text-[10px] text-pink-300/60 mt-0.5">{Math.round(uploadProgress.proof)}% uploaded</p>
                    </div>
                  )}
                  {formData.organizerProofURL && (
                    <div className="mt-2 flex items-center gap-1.5 text-green-400 text-sm">
                      <CheckCircle size={14} />
                      <span>Proof uploaded successfully</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* SUBMIT BUTTON                                                       */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          <div className="mt-8 flex justify-center">
            <NeonButton
              type="submit"
              disabled={!isFormValid()}
              className="px-12 py-2.5 uppercase tracking-wide font-black"
            >
              Create Season
            </NeonButton>
          </div>
        </form>

      {/* ── Success Modal ───────────────────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard glow className="max-w-md w-full p-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-bounce" 
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)' }}>
                <CheckCircle size={48} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-pink-100 mb-3">
                Registration Successful! 🎉
              </h2>
              <p className="text-pink-300/80 mb-6 leading-relaxed">
                Your season <strong>"{formData.seasonName}"</strong> has been registered successfully.
                Your application is under review and will be approved within 24-48 hours.
              </p>
              <div className="rounded-lg p-4 mb-6 text-left" style={{ background: 'rgba(255, 0, 102, 0.08)', border: '1px solid rgba(255, 0, 102, 0.2)' }}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-pink-300/60">Organization:</span>
                    <span className="font-bold text-pink-100">{formData.organizationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pink-300/60">Sport:</span>
                    <span className="font-bold text-pink-100">{formData.sportType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pink-300/60">Auction Date:</span>
                    <span className="font-bold text-pink-100">
                      {new Date(formData.auctionDateTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStatus(AuctionStatus.ADMIN_DASHBOARD)}
                className="w-full px-8 py-4 rounded-lg font-bold uppercase tracking-wider transition-all shadow-lg text-white"
                style={{ background: 'linear-gradient(135deg, #ff0066, #ff4d94)', boxShadow: '0 0 20px rgba(255, 0, 102, 0.4)' }}
              >
                Go to Admin Dashboard
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Support Footer */}
      <div className="py-8 text-center mt-auto" style={{ borderTop: '1px solid rgba(255, 0, 102, 0.1)' }}>
        <p className="text-xs text-pink-300/50 font-medium">
          Support{' '}
          <span className="mx-2 text-pink-300/30">•</span>
          <a href="mailto:hypehammer.mail@gmail.com" className="text-pink-400/70 hover:text-pink-400 transition-colors">
            hypehammer.mail@gmail.com
          </a>
        </p>
      </div>
    </div>
    </NeonPageWrapper>
  );
};
