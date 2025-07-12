import React, { useState } from 'react';
import { Trash2, Calendar, MapPin, User, X, ChevronLeft, ChevronRight } from 'lucide-react';

const PhotoGallery = ({ photos, onDeletePhoto, currentUser, isAdmin }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleDelete = (photoId, uploadedBy) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      onDeletePhoto(photoId, uploadedBy);
    }
  };

  const canDeletePhoto = (photo) => {
    return isAdmin || photo.uploadedBy === currentUser?.displayName;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, index) => (
          <div key={photo.id} className="card group">
            {/* Image */}
            <div className="aspect-square overflow-hidden bg-gray-100 relative">
              <img
                src={photo.url}
                alt={`Bird photo by ${photo.uploadedBy}`}
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                onClick={() => openLightbox(photo, index)}
                loading="lazy"
              />
              
              {/* Delete button */}
              {canDeletePhoto(photo) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id, photo.uploadedBy);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700"
                  title="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Photo info */}
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="font-medium">{photo.uploadedBy}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{new Date(photo.dateCaptured).toLocaleDateString()}</span>
              </div>

              {photo.location && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
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
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>

            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={photos[currentIndex].url}
              alt={`Bird photo by ${photos[currentIndex].uploadedBy}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Photo info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{photos[currentIndex].uploadedBy}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(photos[currentIndex].dateCaptured).toLocaleDateString()}</span>
                </div>
                {photos[currentIndex].location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{photos[currentIndex].location}</span>
                  </div>
                )}
                <div className="text-sm text-gray-300">
                  {currentIndex + 1} of {photos.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery; 