import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Camera, 
  Calendar, 
  MapPin, 
  User, 
  Trash2, 
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { getBirdById, deleteBird, deletePhotoFromBird } from '../services/birdService';
import PhotoUpload from '../components/PhotoUpload';
import PhotoGallery from '../components/PhotoGallery';

const BirdDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [bird, setBird] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchBird = async () => {
      try {
        const birdData = await getBirdById(id);
        setBird(birdData);
      } catch (error) {
        console.error('Error fetching bird:', error);
        setError('Bird not found');
      } finally {
        setLoading(false);
      }
    };

    fetchBird();
  }, [id]);

  const handleDeleteBird = async () => {
    if (!isAdmin) return;
    
    if (!window.confirm(`Are you sure you want to delete ${bird.commonName}? This will also delete all associated photos.`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteBird(id);
      navigate('/');
    } catch (error) {
      console.error('Error deleting bird:', error);
      setError('Failed to delete bird');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePhoto = async (photoId, uploadedBy) => {
    try {
      await deletePhotoFromBird(id, photoId, isAdmin, currentUser?.displayName);
      
      // Update local state
      setBird(prevBird => ({
        ...prevBird,
        photos: prevBird.photos.filter(photo => photo.id !== photoId)
      }));
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError(error.message);
    }
  };

  const handlePhotoUploaded = (newPhoto) => {
    setBird(prevBird => ({
      ...prevBird,
      photos: [...(prevBird.photos || []), newPhoto]
    }));
    setShowUpload(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bird details...</p>
        </div>
      </div>
    );
  }

  if (error || !bird) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bird Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The bird you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Gallery</span>
        </button>

        <div className="flex items-center space-x-4">
          {currentUser && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Photo</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleDeleteBird}
              disabled={deleting}
              className="btn-danger flex items-center space-x-2 disabled:opacity-50"
            >
              {deleting ? (
                <div className="loading-spinner"></div>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>{deleting ? 'Deleting...' : 'Delete Bird'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bird Info */}
      <div className="card p-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{bird.commonName}</h1>
            <p className="text-lg text-gray-600 italic">{bird.scientificName}</p>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>{bird.photos?.length || 0} photo{(bird.photos?.length || 0) !== 1 ? 's' : ''}</span>
            </div>
            
            {bird.createdAt && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Added {bird.createdAt.toDate().toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="bg-bird-50 border border-bird-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-bird-600" />
                <span className="text-sm font-medium text-bird-800">Admin Controls Active</span>
              </div>
              <p className="text-sm text-bird-700 mt-1">
                You can delete this bird and any photos. Use with caution.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Photo Gallery</h2>
        
        {bird.photos && bird.photos.length > 0 ? (
          <PhotoGallery
            photos={bird.photos}
            onDeletePhoto={handleDeletePhoto}
            currentUser={currentUser}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="card p-12 text-center">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600 mb-6">
              Be the first to share a photo of this beautiful bird!
            </p>
            {currentUser ? (
              <button
                onClick={() => setShowUpload(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Photo
              </button>
            ) : (
              <p className="text-sm text-gray-500">
                <a href="/login" className="text-primary-600 hover:text-primary-500">
                  Sign in
                </a>{' '}
                to contribute photos
              </p>
            )}
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showUpload && (
        <PhotoUpload
          birdId={id}
          birdName={bird.commonName}
          onUpload={handlePhotoUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};

export default BirdDetail; 