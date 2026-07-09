import { Github, ExternalLink, Bird, Camera, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const [stats, setStats] = useState({ totalBirds: 0, totalPhotos: 0, totalUsers: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/.netlify/functions/publicStats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalBirds: data.totalBirds,
            totalPhotos: data.totalPhotos,
            totalUsers: data.totalUsers
          })
        }
      } catch (e) {
        // fail silently
      }
    }
    fetchStats()
  }, [])

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        {/* System Stats */}
        <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-8 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Bird className="h-5 w-5 text-primary-600" />
            <b>{stats.totalBirds}</b> Birds
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Camera className="h-5 w-5 text-bird-600" />
            <b>{stats.totalPhotos}</b> Photos
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Users className="h-5 w-5 text-green-600" />
            <b>{stats.totalUsers}</b> Users
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Copyright */}
          <div className="text-sm text-gray-600">
            © {currentYear} IITR Bird-watching Community
          </div>
          {/* Links */}
          <div className="flex items-center space-x-6">
            <Link
              to="/about"
              className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
            >
              About
            </Link>
            <Link
              to="/guidelines"
              className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
            >
              Guidelines
            </Link>
            <Link
              to="/terms"
              className="text-sm text-gray-600 hover:text-blue-700 transition-colors"
            >
              Terms & Conditions
            </Link>
            <a
              href="https://github.com/mohak300501/blazingfeathers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://ccf.iitr.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>IITR CCF</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 