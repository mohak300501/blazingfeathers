import { Link } from 'react-router-dom'
import { Bird, Camera } from 'lucide-react'

interface BirdCardProps {
  id: string
  commonName: string
  scientificName: string
  photoCount: number
  featuredPhoto?: string
}

const BirdCard = ({ id, commonName, scientificName, photoCount, featuredPhoto }: BirdCardProps) => {
  return (
    <Link to={`/bird/${id}`}>
      <div className="bird-card group">
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          {featuredPhoto ? (
            <img
              src={featuredPhoto}
              alt={commonName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-bird-100">
              <Bird className="h-16 w-16 text-gray-400" />
            </div>
          )}
          <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
            <Camera className="h-3 w-3" />
            <span>{photoCount}</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600 transition-colors">
            {commonName}
          </h3>
          <p className="text-sm text-gray-600 italic">
            {scientificName}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default BirdCard 