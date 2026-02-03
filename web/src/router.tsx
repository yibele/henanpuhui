import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './stores/AuthContext'
import MainLayout from './components/Layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FarmerList from './pages/Farmers/List'
import FarmerDetail from './pages/Farmers/Detail'
import FarmerForm from './pages/Farmers/Form'
import AcquisitionList from './pages/Acquisitions/List'
import AcquisitionForm from './pages/Acquisitions/Form'
import AcquisitionDetail from './pages/Acquisitions/Detail'
import SettlementList from './pages/Settlements/List'
import SettlementDetail from './pages/Settlements/Detail'
import Reports from './pages/Reports'
import UserList from './pages/Users/List'
import UserForm from './pages/Users/Form'

// 角色权限配置：每个角色可访问的路由路径前缀
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['/dashboard', '/farmers', '/acquisitions', '/settlements', '/reports', '/users'],
  finance_admin: ['/dashboard', '/farmers', '/settlements', '/reports'],
  cashier: ['/dashboard', '/settlements', '/reports'],
  assistant: ['/dashboard', '/farmers', '/acquisitions'],
  warehouse_manager: ['/dashboard', '/acquisitions'],
}

// 需要登录才能访问的路由
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading, userInfo } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div style={{ padding: 100, textAlign: 'center' }}>加载中...</div>
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  // 路由权限检查
  const userRole = userInfo?.role || ''
  const allowedPaths = ROLE_PERMISSIONS[userRole] || []
  const currentPath = location.pathname

  // 检查当前路径是否在允许的路径列表中
  const hasPermission = currentPath === '/' || allowedPaths.some(path =>
    currentPath === path || currentPath.startsWith(path + '/')
  )

  if (!hasPermission && currentPath !== '/') {
    // 无权限访问，重定向到仪表盘
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      {/* 登录页 */}
      <Route path="/login" element={<Login />} />

      {/* 需要登录的页面 */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="farmers" element={<FarmerList />} />
        <Route path="farmers/new" element={<FarmerForm />} />
        <Route path="farmers/:id" element={<FarmerDetail />} />
        <Route path="farmers/:id/edit" element={<FarmerForm />} />
        <Route path="acquisitions" element={<AcquisitionList />} />
        <Route path="acquisitions/new" element={<AcquisitionForm />} />
        <Route path="acquisitions/:id" element={<AcquisitionDetail />} />
        <Route path="settlements" element={<SettlementList />} />
        <Route path="settlements/:id" element={<SettlementDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<UserList />} />
        <Route path="users/new" element={<UserForm />} />
        <Route path="users/:id/edit" element={<UserForm />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
