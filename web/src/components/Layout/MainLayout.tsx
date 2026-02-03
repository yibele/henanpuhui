import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  AccountBookOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../stores/AuthContext'
import './MainLayout.css'

const { Header, Sider, Content } = Layout

// 角色名称映射
const ROLE_NAMES: Record<string, string> = {
  admin: '管理员',
  finance_admin: '会计',
  cashier: '出纳',
  assistant: '助理',
  warehouse_manager: '仓管',
}

// 角色权限配置：每个角色可访问的菜单路径
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['/dashboard', '/farmers', '/acquisitions', '/settlements', '/reports', '/users'],
  finance_admin: ['/dashboard', '/farmers', '/settlements', '/reports'],
  cashier: ['/dashboard', '/settlements', '/reports'],
  assistant: ['/dashboard', '/farmers', '/acquisitions'],
  warehouse_manager: ['/dashboard', '/acquisitions'],
}

// 所有菜单项定义
const ALL_MENU_ITEMS = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/farmers',
    icon: <UserOutlined />,
    label: '农户管理',
  },
  {
    key: '/acquisitions',
    icon: <ShoppingCartOutlined />,
    label: '收购管理',
  },
  {
    key: '/settlements',
    icon: <AccountBookOutlined />,
    label: '结算管理',
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '报表中心',
  },
  {
    key: '/users',
    icon: <TeamOutlined />,
    label: '用户管理',
  },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, logout } = useAuth()

  // 根据角色过滤菜单项
  const userRole = userInfo?.role || ''
  const allowedPaths = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['admin']
  const menuItems = ALL_MENU_ITEMS.filter((item) => allowedPaths.includes(item.key))

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  // 处理登出
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  return (
    <Layout className="main-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="logo">
          {collapsed ? '普惠' : '普惠农录'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="main-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          />
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span className="user-name">{userInfo?.name || '用户'}</span>
                <span className="user-role">{ROLE_NAMES[userInfo?.role || ''] || ''}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
