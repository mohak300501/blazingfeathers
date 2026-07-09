import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { Bird, Plus, Trash2, Settings, Users, Camera, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Bird {
  id: string
  commonName: string
  scientificName: string
  familyName: string
  photoCount: number
  commonCode: string
}

interface Stats {
  totalBirds: number
  totalPhotos: number
  totalUsers: number
}

const AdminPanel = () => {
  const { user, isAdmin } = useAuth()
  const [birds, setBirds] = useState<Bird[]>([])
  const [stats, setStats] = useState<Stats>({ totalBirds: 0, totalPhotos: 0, totalUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBird, setEditingBird] = useState<Bird | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.')
      return
    }

    fetchData()
  }, [isAdmin])

  const fetchData = async () => {
    try {
      // Call Netlify function to fetch public data
      const response = await fetch('/.netlify/functions/publicStats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch public data')
      }

      const data = await response.json()
      
      setBirds(data.birds)
      setStats({
        totalBirds: data.totalBirds,
        totalPhotos: data.totalPhotos,
        totalUsers: data.totalUsers
      })
    } catch (error: any) {
      console.error('Error fetching public data:', error)
      toast.error('Failed to load public data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBird = async (commonName: string, scientificName: string, familyName: string) => {
    setAdding(true)
    try {
      // Call Netlify function to add bird
      const response = await fetch('/.netlify/functions/addBird', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commonName,
          scientificName,
          familyName,
          userId: user?.uid
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add bird')
      }

      await response.json()
      toast.success('Bird added successfully!')
      setShowAddModal(false)
      fetchData() // Refresh data
    } catch (error: any) {
      console.error('Error adding bird:', error)
      toast.error(error.message || 'Failed to add bird')
    } finally {
      setAdding(false)
    }
  }

  const handleEditBird = async (birdId: string, commonName: string, scientificName: string, familyName: string) => {
    setEditing(true)
    try {
      // Call Netlify function to edit bird
      const response = await fetch('/.netlify/functions/editBird', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birdId,
          commonName,
          scientificName,
          familyName,
          userId: user?.uid
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to edit bird')
      }

      await response.json()
      toast.success('Bird updated successfully!')
      setShowEditModal(false)
      fetchData() // Refresh data
    } catch (error: any) {
      console.error('Error editing bird:', error)
      toast.error(error.message || 'Failed to edit bird')
    } finally {
      setEditing(false)
    }
  }

  const handleDeleteBird = async (birdId: string, birdName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${birdName}"? This will also delete all associated photos.`)) {
      return
    }

    try {
      // Call Netlify function to delete bird and all its photos
      const response = await fetch('/.netlify/functions/deleteBird', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birdId: birdId,
          userId: user?.uid
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete bird')
      }

      toast.success('Bird deleted successfully!')
      fetchData() // Refresh data
    } catch (error: any) {
      console.error('Error deleting bird:', error)
      toast.error('Failed to delete bird')
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You need admin privileges to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-xl text-gray-600">Manage birds and admin features</p>
      </div>

      {/* Birds Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Birds Management</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Bird</span>
          </button>
        </div>

        {birds.length === 0 ? (
          <div className="text-center py-8">
            <Bird className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No birds yet</h3>
            <p className="text-gray-600">Add the first bird to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Common Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scientific Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Common Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {birds.map((bird) => (
                  <tr key={bird.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bird.commonName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 italic">
                      {bird.scientificName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bird.familyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {bird.commonCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bird.photoCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingBird(bird)
                            setShowEditModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBird(bird.id, bird.commonName)}
                          className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Bird Modal */}
      {showAddModal && (
        <AddBirdModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBird}
          adding={adding}
        />
      )}

      {/* Edit Bird Modal */}
      {showEditModal && editingBird && (
        <EditBirdModal
          bird={editingBird}
          onClose={() => {
            setShowEditModal(false)
            setEditingBird(null)
          }}
          onEdit={handleEditBird}
          editing={editing}
        />
      )}
    </div>
  )
}

// Add Bird Modal Component
interface AddBirdModalProps {
  onClose: () => void
  onAdd: (commonName: string, scientificName: string, familyName: string) => Promise<void>
  adding: boolean
}

const AddBirdModal = ({ onClose, onAdd, adding }: AddBirdModalProps) => {
  const [commonName, setCommonName] = useState('')
  const [scientificName, setScientificName] = useState('')
  const [familyName, setFamilyName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commonName || !scientificName) {
      toast.error('Please fill in required fields')
      return
    }

    await onAdd(commonName, scientificName, familyName)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Add New Bird</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Common Name *
            </label>
            <input
              type="text"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              className="input-field"
              placeholder="e.g., Indian Roller"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scientific Name *
            </label>
            <input
              type="text"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              className="input-field"
              placeholder="e.g., Coracias benghalensis"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Family Name *
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="input-field"
              placeholder="e.g., Coraciidae"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={adding}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="btn-primary flex-1 flex justify-center items-center space-x-2"
            >
              {adding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add Bird</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Bird Modal Component
interface EditBirdModalProps {
  bird: Bird
  onClose: () => void
  onEdit: (id: string, commonName: string, scientificName: string, familyName: string) => Promise<void>
  editing: boolean
}

const EditBirdModal = ({ bird, onClose, onEdit, editing }: EditBirdModalProps) => {
  const [commonName, setCommonName] = useState(bird.commonName)
  const [scientificName, setScientificName] = useState(bird.scientificName)
  const [familyName, setFamilyName] = useState(bird.familyName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commonName || !scientificName) {
      toast.error('Please fill in required fields')
      return
    }

    await onEdit(bird.id, commonName, scientificName, familyName)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Edit Bird</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Common Name *
            </label>
            <input
              type="text"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              className="input-field"
              placeholder="e.g., Indian Roller"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scientific Name *
            </label>
            <input
              type="text"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              className="input-field"
              placeholder="e.g., Coracias benghalensis"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Family Name *
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="input-field"
              placeholder="e.g., Coraciidae"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={editing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editing}
              className="btn-primary flex-1 flex justify-center items-center space-x-2"
            >
              {editing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminPanel