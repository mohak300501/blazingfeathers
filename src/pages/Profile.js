import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBirds } from '../services/birdService';
import { User, Camera, Calendar, MapPin, Crown, Mail, Shield } from 'lucide-react';

const Profile = () => {
  const { currentUser, isAdmin } = useAuth();
  const [birds, setBirds] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const birdsData = await getBirds();
        setBirds(birdsData);
        
        // Filter photos uploaded by current user
        const photos = [];
        birdsData.forEach(bird => {
          if (bird.photos) {
            bird.photos.forEach(photo => {
              if (photo.uploadedBy === currentUser.displayName) {
                photos.push({
                  ...photo,
                  birdId: bird.id,
                  birdName: bird.commonName,
                  scientificName: bird.scientificName
                });
              }
            });
          }
        });
        
        setUserPhotos(photos);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="card p-8">
        <div className="flex items-start space-x-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {currentUser.displayName || 'User'}
              </h1>
              {isAdmin && (
                <div className="flex items-center space-x-1 bg-bird-100 text-bird-800 px-3 py-1 rounded-full">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-medium">Admin</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-gray-600">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{currentUser.email}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>
                  {currentUser.emailVerified ? (
                    <span className="text-green-600">✓ Email Verified</span>
                  ) : (
                    <span className="text-yellow-600">⚠ Email Not Verified</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {userPhotos.length}
          </div>
          <div className="text-gray-600">Photos Uploaded</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-bird-600 mb-2">
            {new Set(userPhotos.map(photo => photo.birdId)).size}
          </div>
          <div className="text-gray-600">Bird Species</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-gray-600 mb-2">
            {birds.length}
          </div>
          <div className="text-gray-600">Total Species</div>
        </div>
      </div>

      {/* User's Photos */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Photos</h2>
        
        {userPhotos.length === 0 ? (
          <div className="card p-12 text-center">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600">
              Start contributing to our bird photography community!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPhotos.map((photo) => (
              <div key={photo.id} className="card">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={photo.url}
                    alt={`${photo.birdName} by ${photo.uploadedBy}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{photo.birdName}</h3>
                    <p className="text-sm text-gray-600 italic">{photo.scientificName}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(photo.dateCaptured).toLocaleDateString()}</span>
                    </div>
                    
                    {photo.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{photo.location}</span>
                      </div>
                    )}
                    
                    {photo.uploadedAt && (
                      <div className="text-xs text-gray-500">
                        Uploaded {new Date(photo.uploadedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Info */}
      {isAdmin && (
        <div className="card p-6 bg-bird-50 border border-bird-200">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-6 w-6 text-bird-600" />
            <h3 className="text-lg font-semibold text-bird-800">Admin Privileges</h3>
          </div>
          <div className="space-y-2 text-sm text-bird-700">
            <p>• Add new bird species to the database</p>
            <p>• Delete any bird species and all associated photos</p>
            <p>• Delete any photo uploaded by any user</p>
            <p>• Manage the overall content and quality of the gallery</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 