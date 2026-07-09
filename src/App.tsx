import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LoadingSpinner from './components/LoadingSpinner'
import { lazy, Suspense } from 'react'

// Lazy load pages
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const BirdDetail = lazy(() => import('./pages/BirdDetail'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bird/:commonCode" element={<BirdDetail />} />
            {!user && (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </>
            )}
            {user && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App 