import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { userLogin } from '../services/cloudbase'

interface UserInfo {
  id: string
  name: string
  phone: string
  role: string
  avatar?: string
}

interface AuthContextType {
  isLoggedIn: boolean
  loading: boolean
  userInfo: UserInfo | null
  login: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  // 初始化时检查本地存储的登录状态
  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserInfo(user)
        setIsLoggedIn(true)
      } catch (e) {
        localStorage.removeItem('userInfo')
      }
    }
    setLoading(false)
  }, [])

  // 登录
  const login = async (phone: string, password: string) => {
    try {
      const result = await userLogin(phone, password) as any

      if (result.success) {
        const userData = result.data
        const user: UserInfo = {
          id: userData.userId,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          avatar: userData.avatar,
        }

        setUserInfo(user)
        setIsLoggedIn(true)
        localStorage.setItem('userInfo', JSON.stringify(user))

        return { success: true }
      } else {
        return { success: false, message: result.message || '登录失败' }
      }
    } catch (error: any) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '网络错误' }
    }
  }

  // 登出
  const logout = () => {
    setUserInfo(null)
    setIsLoggedIn(false)
    localStorage.removeItem('userInfo')
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, userInfo, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
