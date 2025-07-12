import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Calendar, MapPin } from 'lucide-react';

const BirdCard = ({ bird }) => {
  const featuredPhoto = bird.photos && bird.photos.length > 0 ? bird.photos[0] : null;

  return (
    <Link to={`/bird/${bird.id}`} className="group">
      <div className="card hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-gray-100">
          {featuredPhoto ? (
            <img
              src={featuredPhoto.url}
              alt={`${bird.commonName} by ${featuredPhoto.uploadedBy}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No photos yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {bird.commonName}
            </h3>
            <p className="text-sm text-gray-600 italic">
              {bird.scientificName}
            </p>
            
            {/* Photo count and latest photo info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Camera className="h-3 w-3" />
                <span>{bird.photos?.length || 0} photo{(bird.photos?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
              
              {featuredPhoto && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(featuredPhoto.dateCaptured).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Location if available */}
            {featuredPhoto?.location && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{featuredPhoto.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BirdCard; 