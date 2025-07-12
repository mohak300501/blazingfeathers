import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Camera, Users, Heart } from 'lucide-react';
import BirdCard from '../components/BirdCard';
import { getBirds } from '../services/birdService';

const Home = () => {
  const [birds, setBirds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBirds, setFilteredBirds] = useState([]);

  useEffect(() => {
    const fetchBirds = async () => {
      try {
        const birdsData = await getBirds();
        setBirds(birdsData);
        setFilteredBirds(birdsData);
      } catch (error) {
        console.error('Error fetching birds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirds();
  }, []);

  useEffect(() => {
    const filtered = birds.filter(bird =>
      bird.commonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bird.scientificName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBirds(filtered);
  }, [searchTerm, birds]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading beautiful birds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            Discover the World of
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-bird-500 to-bird-700">
              {' '}Birds
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our community-driven bird photography gallery. Every photo tells a story of nature's beauty.
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center space-x-8 text-center">
          <div className="flex items-center space-x-2 text-gray-600">
            <Camera className="h-5 w-5" />
            <span>{birds.reduce((total, bird) => total + (bird.photos?.length || 0), 0)} Photos</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Users className="h-5 w-5" />
            <span>{birds.length} Species</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Heart className="h-5 w-5" />
            <span>Community Driven</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search birds by name or scientific name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="text-center">
        <p className="text-gray-600">
          {filteredBirds.length === birds.length
            ? `Showing all ${birds.length} bird species`
            : `Found ${filteredBirds.length} bird${filteredBirds.length !== 1 ? 's' : ''} matching "${searchTerm}"`
          }
        </p>
      </div>

      {/* Birds Grid */}
      {filteredBirds.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No birds found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or browse all birds.
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 btn-secondary"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBirds.map((bird) => (
            <BirdCard key={bird.id} bird={bird} />
          ))}
        </div>
      )}

      {/* Call to Action */}
      {!searchTerm && (
        <div className="text-center py-12 bg-gradient-to-r from-bird-50 to-primary-50 rounded-2xl">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Join Our Community
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Sign up to contribute your own bird photographs and help us document the incredible diversity of avian life.
          </p>
          <Link to="/register" className="btn-primary">
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home; 