import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Input, Card, Tag, Space, Button } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import type { ColumnsType } from 'antd/es/table'

interface Farmer {
  _id: string
  farmerId: string
  name: string
  phone: string
  addressText: string
  acreage: number
  grade: string
  status: string
  createTime: string
}

const GRADE_COLORS: Record<string, string> = {
  A: 'gold',
  B: 'blue',
  C: 'default',
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  active: { text: '正常', color: 'green' },
  inactive: { text: '停用', color: 'red' },
}

export default function FarmerList() {
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Farmer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    loadData()
  }, [page, pageSize])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await farmerApi.list({
        page,
        pageSize,
        keyword,
        userId: userInfo?.id || '',
      }) as any

      if (result.success) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
      }
    } catch (error) {
      console.error('加载农户列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const columns: ColumnsType<Farmer> = [
    {
      title: '农户编号',
      dataIndex: 'farmerId',
      width: 180,
    },
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
      title: '地址',
      dataIndex: 'addressText',
      ellipsis: true,
    },
    {
      title: '面积(亩)',
      dataIndex: 'acreage',
      width: 100,
      align: 'right',
    },
    {
      title: '等级',
      dataIndex: 'grade',
      width: 80,
      align: 'center',
      render: (grade: string) => (
        <Tag color={GRADE_COLORS[grade] || 'default'}>{grade}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      align: 'center',
      render: (status: string) => {
        const config = STATUS_MAP[status] || { text: '未知', color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>农户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/farmers/new')}>
          新增农户
        </Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索姓名或手机号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
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
          onRow={(record) => ({
            onClick: () => navigate(`/farmers/${record._id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  )
}
