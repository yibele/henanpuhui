import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Input, Card, Tag, Space, Button, Tooltip } from 'antd'
import { SearchOutlined, PlusOutlined, ExperimentOutlined } from '@ant-design/icons'
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
  seedTotal: number
  grade: string
  status: string
  createTime: string
  createByName?: string
  firstManager?: string
  seedDistributionComplete?: boolean
  stats?: {
    totalSeedDistributed?: number
    seedDistributionCount?: number
  }
}

const GRADE_MAP: Record<string, { text: string; color: string }> = {
  gold: { text: '金牌农户', color: 'gold' },
  silver: { text: '银牌农户', color: 'blue' },
  bronze: { text: '铜牌农户', color: 'default' },
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
      width: 80,
      align: 'right',
    },
    {
      title: '操作人',
      dataIndex: 'createByName',
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '发苗进度',
      width: 180,
      align: 'center',
      render: (_: any, record: Farmer) => {
        const distributed = record.stats?.totalSeedDistributed || 0
        const total = record.seedTotal || 0
        const isComplete = record.seedDistributionComplete
        if (isComplete) {
          return (
            <div>
              <Tag color="success">已完成</Tag>
              <div style={{ fontSize: 12, color: '#666' }}>{distributed}/{total} 万株</div>
            </div>
          )
        }
        if (total === 0) {
          return <span style={{ color: '#999' }}>未签约</span>
        }
        const percent = Math.min(100, Math.round((distributed / total) * 100))
        return (
          <Tooltip title={`已发 ${distributed} / 签约 ${total} 万株`}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <div style={{
                  width: 60,
                  height: 6,
                  background: '#f0f0f0',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: percent >= 100 ? '#52c41a' : '#1890ff',
                    borderRadius: 3
                  }} />
                </div>
                <span style={{ fontSize: 12, color: '#666' }}>{percent}%</span>
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>{distributed}/{total} 万株</div>
            </div>
          </Tooltip>
        )
      },
    },
    {
      title: '等级',
      dataIndex: 'grade',
      width: 100,
      align: 'center',
      render: (grade: string) => {
        const config = GRADE_MAP[grade] || { text: grade || '未设置', color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '操作',
      width: 100,
      align: 'center',
      render: (_: any, record: Farmer) => (
        <Tooltip title="发苗">
          <Button
            type="primary"
            size="small"
            icon={<ExperimentOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/seeds/new?farmerId=${record._id}&farmerName=${encodeURIComponent(record.name)}`)
            }}
          >
            发苗
          </Button>
        </Tooltip>
      ),
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
