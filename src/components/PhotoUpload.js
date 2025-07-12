import React, { useState } from 'react';
import { X, Upload, Calendar, MapPin, User } from 'lucide-react';
import { addPhotoToBird } from '../services/birdService';
import { uploadPhotoToDrive } from '../services/driveService';
import { useAuth } from '../contexts/AuthContext';

const PhotoUpload = ({ birdId, birdName, onUpload, onClose }) => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState('');
  const [dateCaptured, setDateCaptured] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a photo');
      return;
    }

    if (!location.trim()) {
      setError('Please enter the location where the photo was taken');
      return;
    }

    if (!dateCaptured) {
      setError('Please select the date when the photo was captured');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Upload to Google Drive
      const driveResponse = await uploadPhotoToDrive(file, birdName);
      
      // Add to Firestore
      const photoData = {
        url: driveResponse.webViewLink,
        driveFileId: driveResponse.id,
        location: location.trim(),
        dateCaptured: new Date(dateCaptured).toISOString(),
        uploadedBy: currentUser.displayName || currentUser.email,
        uploadedAt: new Date().toISOString()
      };

      const newPhoto = await addPhotoToBird(birdId, photoData);
      onUpload(newPhoto);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Photo</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                {preview ? (
                  <div className="space-y-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview('');
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="mt-4 btn-secondary cursor-pointer inline-flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Choose Photo</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field"
                placeholder="Where was this photo taken?"
                required
              />
            </div>

            {/* Date Captured */}
            <div>
              <label htmlFor="dateCaptured" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Captured
              </label>
              <input
                type="date"
                id="dateCaptured"
                value={dateCaptured}
                onChange={(e) => setDateCaptured(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Bird Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">Adding photo to:</span>
                <span className="italic">{birdName}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{loading ? 'Uploading...' : 'Upload Photo'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload; 