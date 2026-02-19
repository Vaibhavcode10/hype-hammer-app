import React, { useState } from 'react';
import { Trophy, Building2, Calendar, MapPin, Users, DollarSign, Upload, ArrowLeft, CheckCircle, X, AlertCircle } from 'lucide-react';
import { AuctionStatus, SportType } from '../../types';
import { uploadProfilePictureViaAPI, uploadDocumentViaAPI } from '../../services/cloudFunctionUploadService';

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
  profilePhotoURL?: string;
  
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
  governmentIdURL?: string;
  organizerProof?: File;
  organizerProofURL?: string;
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
  const totalSteps = 3;
  const [uploadProgress, setUploadProgress] = useState<{ photo?: number; govId?: number; proof?: number }>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (field: keyof AdminFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      const photoURL = await uploadProfilePictureViaAPI(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, photo: progress }));
      });
      setFormData(prev => ({ ...prev, profilePhotoURL: photoURL }));
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
      const docURL = await uploadDocumentViaAPI(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, govId: progress }));
      });
      setFormData(prev => ({ ...prev, governmentIdURL: docURL }));
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
      const docURL = await uploadDocumentViaAPI(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, proof: progress }));
      });
      setFormData(prev => ({ ...prev, organizerProofURL: docURL }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Document upload failed';
      setUploadErrors(prev => [...prev, `Proof: ${msg}`]);
    } finally {
      setUploading(false);
      setUploadProgress(prev => ({ ...prev, proof: undefined }));
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName && formData.email && formData.phone && formData.password && formData.organizationName && formData.organizerType && formData.designation);
      case 2:
        return !!(formData.seasonName && formData.sportType && formData.auctionDateTime && formData.venueMode);
      case 3:
        return !!(formData.governmentId);
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStepValid(3)) {
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
        
        // Call registration
        await onRegisterAdmin(formData);
        
        // Show success modal - onRegisterAdmin doesn't throw if successful
        setShowSuccessModal(true);
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          setStatus(AuctionStatus.ADMIN_DASHBOARD);
        }, 2000);
      } catch (error) {
        // Error was already handled in onRegisterAdmin with alert
        console.error('Registration failed:', error);
        setShowSuccessModal(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        {/* Back to Home + Title Row */}
        <div className="flex items-center justify-between mb-8 px-8">
          <button
            onClick={() => setStatus(AuctionStatus.HOME)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors underline flex-shrink-0"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>

          {/* Centered Icon + Title + Subtitle */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Trophy size={28} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">Season Organizer Registration</h1>
              <p className="text-slate-600 text-sm">Create and manage your own sports auction event</p>
            </div>
          </div>

          {/* Spacer to balance layout */}
          <div className="flex-shrink-0 w-32"></div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8 px-8">
          {[1, 2, 3].map((step) => (
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
                  {step === 1 && 'Personal & Org'}
                  {step === 2 && 'Season Details'}
                  {step === 3 && 'Verification'}
                </span>
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-1 mx-2 max-w-xs transition-all ${
                    step < currentStep ? 'bg-gradient-to-r from-blue-500 to-orange-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200">
          {/* Step 1: Personal & Organization Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Personal & Organization Information</h2>
              
              {/* Upload Errors */}
              {uploadErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  {uploadErrors.map((error, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-red-700 text-sm mb-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Profile Photo on Left + Personal Info on Right */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Photo - Top Left */}
                <div className="flex-shrink-0">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full md:w-48">
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      <Upload size={16} className="inline mr-2" />
                      Profile Photo
                    </label>
                    
                    {/* Photo Preview */}
                    <div className="w-32 h-32 mx-auto mb-3 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center overflow-hidden bg-white">
                      {formData.profilePhotoURL ? (
                        <img 
                          src={formData.profilePhotoURL} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <Upload size={24} className="mx-auto mb-1" />
                          <span className="text-xs">No photo</span>
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      disabled={uploading}
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded-lg focus:border-blue-500 outline-none cursor-pointer disabled:opacity-50"
                    />
                    <p className="text-xs text-slate-600 mt-2">Max 50MB</p>
                    
                    {uploadProgress.photo !== undefined && (
                      <div className="mt-2">
                        <progress value={uploadProgress.photo} max={100} className="w-full h-2 rounded" />
                        <p className="text-xs text-slate-600 mt-1">{Math.round(uploadProgress.photo)}%</p>
                      </div>
                    )}
                    
                    {formData.profilePhotoURL && (
                      <div className="mt-2 flex items-center gap-1 text-green-700">
                        <CheckCircle size={14} />
                        <span className="text-xs">Uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information - Right Side */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Organization Details - Below */}
              <div className="border-t-2 border-slate-100 pt-6 mt-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600" />
                  Organization Details
                </h3>
                
                <div className="space-y-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          )}

          {/* Step 2: Season/Match Details */}
          {currentStep === 2 && (
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
                      Auction Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="date"
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
                        onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value) || 0)}
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
                        onChange={(e) => handleInputChange('maxPlayersPerTeam', parseInt(e.target.value) || 0)}
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
                          onChange={(e) => handleInputChange('baseBudgetPerTeam', parseInt(e.target.value) || 0)}
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

          {/* Step 3: Verification */}
          {currentStep === 3 && (
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
                  {/* Government ID Upload */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      <Upload size={16} className="inline mr-2" />
                      Government ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleGovIdUpload}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:border-blue-500 outline-none cursor-pointer disabled:opacity-50"
                    />
                    <p className="text-xs text-slate-600 mt-2">PDF or Image - Passport, Aadhar, License (Max 50MB)</p>
                    
                    {uploadProgress.govId !== undefined && (
                      <div className="mt-3">
                        <progress value={uploadProgress.govId} max={100} className="w-full h-2 rounded" />
                        <p className="text-xs text-slate-600 mt-1">{Math.round(uploadProgress.govId)}% uploaded</p>
                      </div>
                    )}
                    
                    {formData.governmentIdURL && (
                      <div className="mt-3 flex items-center gap-2 text-green-700">
                        <CheckCircle size={16} />
                        <span className="text-sm">ID uploaded successfully</span>
                      </div>
                    )}
                  </div>

                  {/* Organization Proof Upload */}
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      <Upload size={16} className="inline mr-2" />
                      Organization Proof (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleProofUpload}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:border-orange-500 outline-none cursor-pointer disabled:opacity-50"
                    />
                    <p className="text-xs text-slate-600 mt-2">Registration certificate, Incorporation documents, etc. (Max 50MB)</p>
                    
                    {uploadProgress.proof !== undefined && (
                      <div className="mt-3">
                        <progress value={uploadProgress.proof} max={100} className="w-full h-2 rounded" />
                        <p className="text-xs text-slate-600 mt-1">{Math.round(uploadProgress.proof)}% uploaded</p>
                      </div>
                    )}
                    
                    {formData.organizerProofURL && (
                      <div className="mt-3 flex items-center gap-2 text-green-700">
                        <CheckCircle size={16} />
                        <span className="text-sm">Proof uploaded successfully</span>
                      </div>
                    )}
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
