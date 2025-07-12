import { useState } from 'react'
import { Calendar, MapPin, User, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface PhotoCardProps {
  id: string
  url: string
  location: string
  dateOfCapture: Date
  uploadedBy: string
  uploadedByUsername: string
  onDelete: (photoId: string) => Promise<void>
}

const PhotoCard = ({ 
  id, 
  url, 
  location, 
  dateOfCapture, 
  uploadedBy, 
  uploadedByUsername,
  onDelete 
}: PhotoCardProps) => {
  const { user, isAdmin } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)

  const canDelete = isAdmin || (user && user.uid === uploadedBy)

  const handleDelete = async () => {
    if (!canDelete) return
    
    if (!confirm('Are you sure you want to delete this photo?')) return
    
    setIsDeleting(true)
    try {
      await onDelete(id)
      toast.success('Photo deleted successfully')
    } catch (error) {
      toast.error('Failed to delete photo')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="photo-card">
        <div className="relative group">
          <img
            src={url}
            alt={`Bird photo taken at ${location}`}
            className="w-full h-64 object-cover cursor-pointer"
            onClick={() => setShowFullImage(true)}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
            <button
              onClick={() => setShowFullImage(true)}
              className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 p-2 rounded-full transition-all duration-300 hover:bg-opacity-100"
            >
              <Eye className="h-5 w-5 text-gray-700" />
            </button>
          </div>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors duration-200 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <Calendar className="h-4 w-4" />
            <span>{format(dateOfCapture, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{uploadedByUsername}</span>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={url}
              alt={`Bird photo taken at ${location}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default PhotoCard 