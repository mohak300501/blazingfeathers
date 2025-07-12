import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { addBird } from '../services/birdService';

const AddBird = () => {
  const navigate = useNavigate();
  const [commonName, setCommonName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!commonName.trim() || !scientificName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const birdData = {
        commonName: commonName.trim(),
        scientificName: scientificName.trim(),
        photos: []
      };

      await addBird(birdData);
      setSuccess(true);
      
      // Reset form
      setCommonName('');
      setScientificName('');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error adding bird:', error);
      setError('Failed to add bird. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bird Added Successfully!
          </h2>
          <p className="text-gray-600 mb-4">
            The new bird species has been added to the database.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to gallery...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Bird</h1>
        <p className="text-gray-600">
          Add a new bird species to our community gallery.
        </p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="commonName" className="block text-sm font-medium text-gray-700 mb-2">
              Common Name *
            </label>
            <input
              type="text"
              id="commonName"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              className="input-field"
              placeholder="e.g., American Robin, Blue Jay"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The common name used by birdwatchers and the general public
            </p>
          </div>

          <div>
            <label htmlFor="scientificName" className="block text-sm font-medium text-gray-700 mb-2">
              Scientific Name *
            </label>
            <input
              type="text"
              id="scientificName"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              className="input-field"
              placeholder="e.g., Turdus migratorius, Cyanocitta cristata"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The Latin binomial name (Genus species)
            </p>
          </div>

          <div className="bg-bird-50 border border-bird-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-bird-600" />
              <span className="text-sm font-medium text-bird-800">Admin Action</span>
            </div>
            <p className="text-sm text-bird-700 mt-1">
              Only administrators can add new bird species to maintain data quality.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{loading ? 'Adding...' : 'Add Bird'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBird; 