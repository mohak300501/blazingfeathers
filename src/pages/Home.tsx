import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../config/firebase'
import BirdCard from '../components/BirdCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Search, Bird } from 'lucide-react'

interface Bird {
  id: string
  commonName: string
  scientificName: string
  photoCount: number
  featuredPhoto?: string
  commonCode: string
}

const Home = () => {
  const [birds, setBirds] = useState<Bird[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchBirds = async () => {
      try {
        const birdsQuery = query(collection(db, 'birds'), orderBy('commonName'))
        const querySnapshot = await getDocs(birdsQuery)
        
        const birdsData: Bird[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          birdsData.push({
            id: doc.id,
            commonName: data.commonName,
            scientificName: data.scientificName,
            photoCount: data.photoCount || 0,
            featuredPhoto: data.featuredPhoto,
            commonCode: data.commonCode || ''
          })
        })
        
        setBirds(birdsData)
      } catch (error) {
        console.error('Error fetching birds:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBirds()
  }, [])

  const filteredBirds = birds.filter(bird =>
    bird.commonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bird.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bird.commonCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold text-gradient leading-tight">
          Blazing Feathers
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover the beauty of birds through stunning photography from around the world
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search birds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Birds Grid */}
      {filteredBirds.length === 0 ? (
        <div className="text-center py-12">
          <Bird className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No birds found' : 'No birds available'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Check back later for beautiful bird photos'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBirds.map((bird) => (
            <BirdCard
              key={bird.id}
              id={bird.id}
              commonName={bird.commonName}
              scientificName={bird.scientificName}
              photoCount={bird.photoCount}
              featuredPhoto={bird.featuredPhoto}
              commonCode={bird.commonCode}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="text-center pt-8 border-t border-gray-200">
        <p className="text-gray-600">
          {filteredBirds.length} bird{filteredBirds.length !== 1 ? 's' : ''} found
        </p>
      </div>
    </div>
  )
}

export default Home 