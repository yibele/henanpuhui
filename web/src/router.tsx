import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './stores/AuthContext'
import MainLayout from './components/Layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FarmerList from './pages/Farmers/List'
import FarmerDetail from './pages/Farmers/Detail'
import FarmerForm from './pages/Farmers/Form'
import FarmerImport from './pages/Farmers/Import'
import AcquisitionList from './pages/Acquisitions/List'
import AcquisitionForm from './pages/Acquisitions/Form'
import AcquisitionDetail from './pages/Acquisitions/Detail'
import SettlementList from './pages/Settlements/List'
import SettlementDetail from './pages/Settlements/Detail'
import Reports from './pages/Reports'
import UserList from './pages/Users/List'
import UserForm from './pages/Users/Form'
import SeedManagement from './pages/Seeds/index'
import FarmerSeedDetail from './pages/Seeds/FarmerDetail'
import SeedRecordList from './pages/Seeds/RecordList'
import SeedRecordDetail from './pages/Seeds/RecordDetail'
import SeedForm from './pages/Seeds/Form'

// 角色权限配置：每个角色可访问的路由路径前缀
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['/dashboard', '/farmers', '/seeds', '/acquisitions', '/settlements', '/reports', '/users'],
  finance_admin: ['/dashboard', '/farmers', '/seeds', '/settlements', '/reports'],
  cashier: ['/dashboard', '/settlements', '/reports'],
  assistant: ['/farmers', '/seeds'],
  warehouse_manager: ['/dashboard', '/acquisitions'],
}

function getDefaultPathByRole(role: string): string {
  const allowed = ROLE_PERMISSIONS[role] || []
  return allowed[0] || '/dashboard'
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
  const fallbackPath = getDefaultPathByRole(userRole)

  // 检查当前路径是否在允许的路径列表中
  const hasPermission = allowedPaths.some(path =>
    currentPath === path || currentPath.startsWith(path + '/')
  )

  if (currentPath === '/') {
    return <Navigate to={fallbackPath} replace />
  }

  if (!hasPermission) {
    return <Navigate to={fallbackPath} replace />
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="farmers" element={<FarmerList />} />
        <Route path="farmers/new" element={<FarmerForm />} />
        <Route path="farmers/:id" element={<FarmerDetail />} />
        <Route path="farmers/import" element={<FarmerImport />} />
        <Route path="farmers/:id/edit" element={<FarmerForm />} />
        <Route path="seeds" element={<SeedManagement />} />
        <Route path="seeds/farmer/:farmerId" element={<FarmerSeedDetail />} />
        <Route path="seeds/new" element={<SeedForm />} />
        <Route path="seeds/records" element={<SeedRecordList />} />
        <Route path="seeds/records/:id" element={<SeedRecordDetail />} />
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
