import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import PhotoCard from '../components/PhotoCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Bird, Camera, MapPin, Calendar, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface BirdData {
  id: string
  commonName: string
  scientificName: string
  photoCount: number
}

interface Photo {
  id: string
  url: string
  location: string
  dateOfCapture: Date
  uploadedBy: string
  uploadedByUsername: string
}

const BirdDetail = () => {
  const { commonCode } = useParams<{ commonCode: string }>()
  const { user } = useAuth()
  const [bird, setBird] = useState<BirdData | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchBirdData = async () => {
      if (!commonCode) return

      try {
        // Get all birds and filter by commonCode (case-insensitive)
        const birdsQuery = query(collection(db, 'birds'))
        const birdsSnapshot = await getDocs(birdsQuery)
        
        // Filter to find the bird with matching commonCode (case-insensitive)
        const matchingBird = birdsSnapshot.docs.find(doc => {
          const data = doc.data()
          return data.commonCode && data.commonCode.toLowerCase() === commonCode.toLowerCase()
        })
        
        if (matchingBird) {
          // Found by commonCode
          const birdData = matchingBird.data()
          
          setBird({
            id: matchingBird.id,
            commonName: birdData.commonName,
            scientificName: birdData.scientificName,
            photoCount: birdData.photoCount || 0
          })

          // Fetch photos
          const photosQuery = query(collection(db, 'birds', matchingBird.id, 'photos'), orderBy('dateOfCapture', 'desc'))
          const photosSnapshot = await getDocs(photosQuery)
          
          const photosData: Photo[] = []
          photosSnapshot.forEach((doc) => {
            const data = doc.data()
            photosData.push({
              id: doc.id,
              url: data.url,
              location: data.location,
              dateOfCapture: data.dateOfCapture.toDate(),
              uploadedBy: data.uploadedBy,
              uploadedByUsername: data.uploadedByUsername
            })
          })
          
          setPhotos(photosData)
        } else {
          // If not found by commonCode, try by ID (for backward compatibility)
          try {
            const birdDoc = await getDoc(doc(db, 'birds', commonCode))
            if (birdDoc.exists()) {
              const birdData = birdDoc.data()
              setBird({
                id: birdDoc.id,
                commonName: birdData.commonName,
                scientificName: birdData.scientificName,
                photoCount: birdData.photoCount || 0
              })
              
              // Fetch photos
              const photosQuery = query(collection(db, 'birds', birdDoc.id, 'photos'), orderBy('dateOfCapture', 'desc'))
              const photosSnapshot = await getDocs(photosQuery)
              
              const photosData: Photo[] = []
              photosSnapshot.forEach((doc) => {
                const data = doc.data()
                photosData.push({
                  id: doc.id,
                  url: data.url,
                  location: data.location,
                  dateOfCapture: data.dateOfCapture.toDate(),
                  uploadedBy: data.uploadedBy,
                  uploadedByUsername: data.uploadedByUsername
                })
              })
              
              setPhotos(photosData)
            } else {
              toast.error('Bird not found')
            }
          } catch (error) {
            toast.error('Bird not found')
          }
        }
      } catch (error) {
        console.error('Error fetching bird data:', error)
        toast.error('Failed to load bird data')
      } finally {
        setLoading(false)
      }
    }

    fetchBirdData()
  }, [commonCode])

  const handlePhotoDelete = async (photoId: string) => {
    try {
      // Call Netlify function to delete photo
              const response = await fetch('/.netlify/functions/deletePhoto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birdId: bird?.id,
          photoId: photoId,
          userId: user?.uid
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      // Remove photo from local state
      setPhotos(photos.filter(photo => photo.id !== photoId))
      
      // Update bird photo count locally (serverless function handles the actual update)
      if (bird) {
        setBird(prev => prev ? { ...prev, photoCount: prev.photoCount - 1 } : null)
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      throw error
    }
  }

  const handlePhotoUpload = async (formData: FormData) => {
    if (!user || !bird) return

    setUploading(true)
    try {
      // Extract data from FormData
      const file = formData.get('photo') as File
      const location = formData.get('location') as string
      const dateOfCapture = formData.get('dateOfCapture') as string

      if (!file || !location || !dateOfCapture) {
        throw new Error('Missing required fields')
      }

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Send JSON data to the new upload function
              const response = await fetch('/.netlify/functions/addPhoto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name,
          contentType: file.type,
          birdId: bird.id,
          userId: user.uid,
          location: location,
          dateOfCapture: dateOfCapture,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload photo')
      }

      const result = await response.json()
      
      // Add new photo to local state
      const newPhoto: Photo = {
        id: result.photoId,
        url: result.url,
        location: result.location,
        dateOfCapture: new Date(result.dateOfCapture),
        uploadedBy: user.uid,
        uploadedByUsername: result.username
      }
      
      setPhotos([newPhoto, ...photos])
      
      // Update bird photo count locally (serverless function handles the actual update)
      if (bird) {
        setBird(prev => prev ? { ...prev, photoCount: prev.photoCount + 1 } : null)
      }

      setShowUploadModal(false)
      toast.success('Photo uploaded successfully!')
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!bird) {
    return (
      <div className="text-center py-12">
        <Bird className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bird not found</h3>
        <p className="text-gray-600">The bird you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Bird Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">{bird.commonName}</h1>
        <p className="text-xl text-gray-600 italic">{bird.scientificName}</p>
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Camera className="h-4 w-4" />
            <span>{bird.photoCount} photo{bird.photoCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      {user && (
        <div className="text-center">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <Upload className="h-5 w-5" />
            <span>Add Photo</span>
          </button>
        </div>
      )}

      {/* Photo Gallery */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-600">
            {user ? 'Be the first to add a photo of this bird!' : 'Sign in to add photos of this bird.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              id={photo.id}
              url={photo.url}
              location={photo.location}
              dateOfCapture={photo.dateOfCapture}
              uploadedBy={photo.uploadedBy}
              uploadedByUsername={photo.uploadedByUsername}
              onDelete={handlePhotoDelete}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handlePhotoUpload}
          uploading={uploading}
        />
      )}
    </div>
  )
}

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void
  onUpload: (formData: FormData) => Promise<void>
  uploading: boolean
}

const UploadModal = ({ onClose, onUpload, uploading }: UploadModalProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [location, setLocation] = useState('')
  const [dateOfCapture, setDateOfCapture] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file || !location || !dateOfCapture) {
      toast.error('Please fill in all fields')
      return
    }

    const formData = new FormData()
    formData.append('photo', file)
    formData.append('location', location)
    formData.append('dateOfCapture', dateOfCapture)

    await onUpload(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Upload Photo</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field pl-10"
                placeholder="Where was this photo taken?"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Capture
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="date"
                value={dateOfCapture}
                onChange={(e) => setDateOfCapture(e.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary flex-1 flex justify-center items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BirdDetail 