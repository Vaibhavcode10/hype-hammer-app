/**
 * Example: Player Registration Form with File Upload
 * Shows how to integrate Cloud Function file uploads into a registration form
 */

import React, { useState } from 'react';
import {
  uploadPlayerPhotoViaAPI,
  uploadDocumentViaAPI,
} from '../services/cloudFunctionUploadService';

interface RegistrationFormData {
  name: string;
  email: string;
  phone: string;
  playerRole: string;
  photoURL: string;
  documentURL: string;
}

export function PlayerRegistrationFormExample() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    email: '',
    phone: '',
    playerRole: '',
    photoURL: '',
    documentURL: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    photo?: number;
    document?: number;
  }>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log('📤 Starting photo upload...');
      const photoURL = await uploadPlayerPhotoViaAPI(file, (progress) => {
        setUploadProgress((prev) => ({
          ...prev,
          photo: progress,
        }));
      });

      setFormData((prev) => ({
        ...prev,
        photoURL,
      }));

      console.log('✅ Photo uploaded successfully:', photoURL);
      setUploadProgress((prev) => ({
        ...prev,
        photo: undefined,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo upload failed';
      setErrors((prev) => [...prev, `Photo upload error: ${message}`]);
      console.error('Photo upload error:', error);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log('📤 Starting document upload...');
      const documentURL = await uploadDocumentViaAPI(file, (progress) => {
        setUploadProgress((prev) => ({
          ...prev,
          document: progress,
        }));
      });

      setFormData((prev) => ({
        ...prev,
        documentURL,
      }));

      console.log('✅ Document uploaded successfully:', documentURL);
      setUploadProgress((prev) => ({
        ...prev,
        document: undefined,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document upload failed';
      setErrors((prev) => [...prev, `Document upload error: ${message}`]);
      console.error('Document upload error:', error);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) newErrors.push('Name is required');
    if (!formData.email.trim()) newErrors.push('Email is required');
    if (!formData.phone.trim()) newErrors.push('Phone is required');
    if (!formData.playerRole) newErrors.push('Player role is required');
    if (!formData.photoURL) newErrors.push('Player photo is required');
    if (!formData.documentURL) newErrors.push('Authorization document is required');

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Submitting registration form...');

      // In a real app, send this data to your backend
      const registrationData = {
        ...formData,
        registeredAt: new Date().toISOString(),
      };

      console.log('Registration data:', registrationData);

      // Simulate API call
      // await registerPlayer(registrationData);

      setSuccess(true);
      alert('✅ Registration successful!');

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        playerRole: '',
        photoURL: '',
        documentURL: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setErrors([message]);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Player Registration</h1>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            color: '#c62828',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <strong>Errors:</strong>
          <ul style={{ margin: '8px 0 0 0' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            border: '1px solid #4caf50',
            color: '#2e7d32',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          ✅ Registration submitted successfully!
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '4px' }}>
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '4px' }}>
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="phone" style={{ display: 'block', marginBottom: '4px' }}>
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+1 (555) 123-4567"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="playerRole" style={{ display: 'block', marginBottom: '4px' }}>
            Player Role *
          </label>
          <select
            id="playerRole"
            name="playerRole"
            value={formData.playerRole}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          >
            <option value="">Select a role</option>
            <option value="Batsman">Batsman</option>
            <option value="Bowler">Bowler</option>
            <option value="All-rounder">All-rounder</option>
            <option value="Wicket-keeper">Wicket-keeper</option>
          </select>
        </div>

        {/* File Uploads */}
        <h2>Upload Documents</h2>

        {/* Photo Upload */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="photo" style={{ display: 'block', marginBottom: '4px' }}>
            Player Photo *
          </label>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
            Supported formats: JPG, PNG, GIF, WebP (Max 50MB)
          </p>
          <input
            type="file"
            id="photo"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={loading}
            style={{ marginBottom: '8px' }}
            required
          />

          {/* Photo Preview */}
          {formData.photoURL && (
            <div style={{ marginTop: '8px' }}>
              <img
                src={formData.photoURL}
                alt="Player photo preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  borderRadius: '4px',
                  border: '2px solid #4caf50',
                }}
              />
              <p style={{ color: '#4caf50', fontSize: '12px', margin: '8px 0' }}>
                ✅ Photo uploaded successfully
              </p>
            </div>
          )}

          {/* Photo Upload Progress */}
          {uploadProgress.photo !== undefined && (
            <div style={{ marginTop: '8px' }}>
              <progress
                value={uploadProgress.photo}
                max={100}
                style={{ width: '100%', height: '20px' }}
              />
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                {Math.round(uploadProgress.photo)}% uploaded
              </p>
            </div>
          )}
        </div>

        {/* Document Upload */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="document" style={{ display: 'block', marginBottom: '4px' }}>
            Authorization Document (PDF) *
          </label>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
            Upload your authorization letter or ID (PDF only, Max 50MB)
          </p>
          <input
            type="file"
            id="document"
            accept=".pdf"
            onChange={handleDocumentUpload}
            disabled={loading}
            style={{ marginBottom: '8px' }}
            required
          />

          {/* Document Confirmation */}
          {formData.documentURL && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ color: '#4caf50', fontSize: '12px', margin: '0' }}>
                ✅ Document uploaded successfully
              </p>
              <a
                href={formData.documentURL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#1976d2' }}
              >
                View uploaded document
              </a>
            </div>
          )}

          {/* Document Upload Progress */}
          {uploadProgress.document !== undefined && (
            <div style={{ marginTop: '8px' }}>
              <progress
                value={uploadProgress.document}
                max={100}
                style={{ width: '100%', height: '20px' }}
              />
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                {Math.round(uploadProgress.document)}% uploaded
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0' }}>Registration Summary</h3>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>Name: {formData.name || '(not filled)'}</li>
            <li>Email: {formData.email || '(not filled)'}</li>
            <li>Phone: {formData.phone || '(not filled)'}</li>
            <li>Role: {formData.playerRole || '(not selected)'}</li>
            <li>Photo: {formData.photoURL ? '✅ Uploaded' : '❌ Not uploaded'}</li>
            <li>Document: {formData.documentURL ? '✅ Uploaded' : '❌ Not uploaded'}</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Registering...' : 'Complete Registration'}
        </button>
      </form>

      {/* Information Box */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        <strong>ℹ️ How it works:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Fill in your basic information</li>
          <li>Upload your player photo and authorization document</li>
          <li>Files are uploaded to Firebase Storage via Cloud Function API</li>
          <li>Click "Complete Registration" to finalize</li>
          <li>Your profile will be created with all documents</li>
        </ol>
      </div>
    </div>
  );
}

export default PlayerRegistrationFormExample;
