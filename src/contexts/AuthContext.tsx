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
  username: string | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setUsername(data.username)
            setIsAdmin(!!data.isAdmin)
          } else {
            setUsername(null)
            setIsAdmin(false)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUsername(null)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
        setUsername(null)
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
      await sendEmailVerification(user)
      // Save user data to Firestore (isAdmin defaults to false)
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        createdAt: new Date(),
        isAdmin: false
      })
      toast.success('Registration successful! Please check your email to verify your account.')
      // Do not log in user immediately after registration
      await signOut(auth)
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
    username,
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