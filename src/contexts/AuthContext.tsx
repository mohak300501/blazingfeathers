import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Admin emails list - this should be moved to environment variables in production
const ADMIN_EMAILS = [
  'admin@blazingfeathers.com',
  // Add more admin emails here
]

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        // Check if user is admin
        const isUserAdmin = ADMIN_EMAILS.includes(user.email || '')
        setIsAdmin(isUserAdmin)
      } else {
        setIsAdmin(false)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      if (!user.emailVerified) {
        toast.error('Please verify your email before logging in')
        await signOut(auth)
        return
      }
      
      toast.success('Successfully logged in!')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to login')
      throw error
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Send email verification
      await sendEmailVerification(user)
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        createdAt: new Date(),
        isAdmin: ADMIN_EMAILS.includes(email)
      })
      
      toast.success('Registration successful! Please check your email to verify your account.')
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Failed to register')
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      toast.success('Successfully logged out!')
    } catch (error: any) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
      throw error
    }
  }

  const value = {
    user,
    loading,
    isAdmin,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 