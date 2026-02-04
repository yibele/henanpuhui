import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Card, Input, Space, Tag, Tabs, Statistic, Row, Col, Button } from 'antd'
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import type { ColumnsType } from 'antd/es/table'

interface FarmerSeedInfo {
  _id: string
  farmerId: string
  name: string
  phone: string
  acreage: number
  seedTotal: number
  stats?: {
    totalSeedDistributed?: number
    totalSeedAmount?: number
    totalSeedArea?: number
    seedDistributionCount?: number
  }
  seedDistributionComplete?: boolean
}

type SeedStatus = 'all' | 'completed' | 'inProgress' | 'pending'

export default function SeedManagement() {
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FarmerSeedInfo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('all')
  const [stats, setStats] = useState({ all: 0, completed: 0, inProgress: 0, pending: 0 })

  useEffect(() => {
    loadData()
  }, [page, pageSize, seedStatus, userInfo?.id])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    if (!userInfo?.id) return
    try {
      const result = await farmerApi.getStatusStats(userInfo.id) as any
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  const loadData = async () => {
    if (!userInfo?.id) return
    setLoading(true)
    try {
      const params: any = {
        page,
        pageSize,
        userId: userInfo.id,
        keyword: keyword.trim(),
      }
      if (seedStatus !== 'all') {
        params.seedStatus = seedStatus
      }
      const result = await farmerApi.list(params) as any
      if (result.success) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (page === 1) {
      loadData()
    } else {
      setPage(1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getSeedStatus = (record: FarmerSeedInfo): { label: string; color: string } => {
    if (record.seedDistributionComplete) {
      return { label: '已完成', color: 'success' }
    }
    const count = record.stats?.seedDistributionCount || 0
    if (count > 0) {
      return { label: '发苗中', color: 'processing' }
    }
    return { label: '未发苗', color: 'default' }
  }

  const getProgress = (record: FarmerSeedInfo): number => {
    const total = record.seedTotal || 0
    const distributed = record.stats?.totalSeedDistributed || 0
    if (total <= 0) return 0
    return Math.min(100, Math.round((distributed / total) * 100))
  }

  const columns: ColumnsType<FarmerSeedInfo> = [
    {
      title: '农户姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
    },
    {
      title: '签约面积',
      dataIndex: 'acreage',
      width: 100,
      align: 'right',
      render: (v: number) => `${v || 0} 亩`,
    },
    {
      title: '签约种苗',
      dataIndex: 'seedTotal',
      width: 120,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v || 0} <span style={{ fontSize: 12, color: '#999' }}>万株</span></span>,
    },
    {
      title: '已发次数',
      width: 90,
      align: 'center',
      render: (_, record) => record.stats?.seedDistributionCount || 0,
    },
    {
      title: '已发数量',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const distributed = record.stats?.totalSeedDistributed || 0
        return <span style={{ color: '#1890ff', fontWeight: 500 }}>{distributed.toFixed(1)} <span style={{ fontSize: 12, color: '#999' }}>万株</span></span>
      },
    },
    {
      title: '发苗进度',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const progress = getProgress(record)
        const color = progress >= 100 ? '#52c41a' : progress > 0 ? '#1890ff' : '#d9d9d9'
        return <span style={{ color, fontWeight: 500 }}>{progress}%</span>
      },
    },
    {
      title: '苗款金额',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const amount = record.stats?.totalSeedAmount || 0
        return <span style={{ color: '#fa8c16', fontWeight: 500 }}>¥{amount.toFixed(2)}</span>
      },
    },
    {
      title: '状态',
      width: 90,
      align: 'center',
      render: (_, record) => {
        const status = getSeedStatus(record)
        return <Tag color={status.color}>{status.label}</Tag>
      },
    },
  ]

  const tabItems = [
    { key: 'all', label: `全部 (${stats.all})` },
    { key: 'completed', label: `已完成 (${stats.completed})` },
    { key: 'inProgress', label: `发苗中 (${stats.inProgress})` },
    { key: 'pending', label: `未发苗 (${stats.pending})` },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>发苗管理</h2>
        <Button
          icon={<UnorderedListOutlined />}
          onClick={() => navigate('/seeds/records')}
        >
          查看全部记录
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="农户总数" value={stats.all} suffix="户" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已完成" value={stats.completed} suffix="户" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="发苗中" value={stats.inProgress} suffix="户" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="未发苗" value={stats.pending} suffix="户" valueStyle={{ color: '#999' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={seedStatus}
          onChange={(key) => {
            setSeedStatus(key as SeedStatus)
            setPage(1)
          }}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索农户姓名/手机号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ width: 240 }}
            allowClear
            onClear={() => { setKeyword(''); setTimeout(() => loadData(), 0) }}
          />
          <Button type="primary" onClick={handleSearch}>搜索</Button>
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
            onClick: () => navigate(`/seeds/farmer/${record._id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  )
}
