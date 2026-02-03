import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Input, Card, Tag, Space, Button, Select, message, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { userApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import type { ColumnsType } from 'antd/es/table'

interface User {
  _id: string
  name: string
  phone: string
  role: string
  status: string
  warehouseName?: string
  createTime: string
  lastLoginTime?: string
}

const ROLE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: 'admin', label: '管理员' },
  { value: 'finance_admin', label: '会计' },
  { value: 'cashier', label: '出纳' },
  { value: 'assistant', label: '助理' },
  { value: 'warehouse_manager', label: '仓管' },
]

const ROLE_NAMES: Record<string, string> = {
  admin: '管理员',
  finance_admin: '会计',
  cashier: '出纳',
  assistant: '助理',
  warehouse_manager: '仓管',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'red',
  finance_admin: 'purple',
  cashier: 'blue',
  assistant: 'green',
  warehouse_manager: 'orange',
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  active: { text: '正常', color: 'green' },
  inactive: { text: '停用', color: 'red' },
  banned: { text: '禁用', color: 'default' },
}

export default function UserList() {
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [page, pageSize, roleFilter])

  const loadData = async () => {
    if (!userInfo?.id) return

    setLoading(true)
    try {
      const result = await userApi.list({
        userId: userInfo.id,
        page,
        pageSize,
        keyword,
        role: roleFilter,
      }) as any

      if (result.success) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
      } else {
        message.error(result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const handleDelete = async (targetUserId: string) => {
    if (!userInfo?.id) return

    try {
      const result = await userApi.delete(userInfo.id, targetUserId) as any
      if (result.success) {
        message.success('删除成功')
        loadData()
      } else {
        message.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除用户失败:', error)
      message.error('删除失败')
    }
  }

  const handleToggleStatus = async (user: User) => {
    if (!userInfo?.id) return

    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      const result = await userApi.update(userInfo.id, user._id, { status: newStatus }) as any
      if (result.success) {
        message.success(newStatus === 'active' ? '已启用' : '已停用')
        loadData()
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('更新状态失败:', error)
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<User> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role] || 'default'}>
          {ROLE_NAMES[role] || role}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => {
        const config = STATUS_MAP[status] || { text: '未知', color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '所属仓库',
      dataIndex: 'warehouseName',
      width: 120,
      render: (val: string) => val || '-',
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      width: 160,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/users/${record._id}/edit`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
          {record._id !== userInfo?.id && (
            <Popconfirm
              title="确认删除"
              description="删除后无法恢复，确定要删除该用户吗？"
              onConfirm={() => handleDelete(record._id)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/users/new')}>
          新增用户
        </Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索姓名或手机号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            options={ROLE_OPTIONS}
            style={{ width: 120 }}
          />
          <Button onClick={handleSearch}>搜索</Button>
        </Space>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>
    </div>
  )
}
