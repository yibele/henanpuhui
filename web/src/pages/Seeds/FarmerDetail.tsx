import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Spin, Tag, Table, Statistic, Row, Col, Progress, message } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { farmerApi, seedApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface FarmerInfo {
  _id: string
  farmerId: string
  name: string
  phone: string
  acreage: number
  seedTotal: number
  seedUnitPrice: number
  receivableAmount: number
  deposit: number
  stats?: {
    totalSeedDistributed?: number
    totalSeedAmount?: number
    totalSeedArea?: number
    seedDistributionCount?: number
  }
  seedDistributionComplete?: boolean
}

interface SeedRecord {
  _id: string
  recordId: string
  quantity: number
  distributedArea: number
  unitPrice: number
  amount: number
  distributionDate: string
  createByName: string
  createTime: string
  remark?: string
}

export default function FarmerSeedDetail() {
  const { farmerId } = useParams<{ farmerId: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [farmer, setFarmer] = useState<FarmerInfo | null>(null)
  const [records, setRecords] = useState<SeedRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (farmerId && userInfo?.id) {
      loadFarmer()
      loadRecords()
    }
  }, [farmerId, userInfo])

  const loadFarmer = async () => {
    setLoading(true)
    try {
      const result = await farmerApi.get(farmerId!) as any
      if (result.success) {
        setFarmer(result.data)
      } else {
        message.error(result.message || '加载农户信息失败')
      }
    } catch (error) {
      console.error('加载农户信息失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async () => {
    setRecordsLoading(true)
    try {
      const result = await seedApi.getByFarmer({
        farmerId: farmerId!,
        userId: userInfo!.id,
        page,
        pageSize: 10,
      }) as any
      if (result.success) {
        setRecords(result.data.list || [])
        setTotal(result.data.total || 0)
      }
    } catch (error) {
      console.error('加载发苗记录失败:', error)
    } finally {
      setRecordsLoading(false)
    }
  }

  const getSeedStatus = (): { label: string; color: string } => {
    if (!farmer) return { label: '未知', color: 'default' }
    if (farmer.seedDistributionComplete) {
      return { label: '已完成', color: 'success' }
    }
    const count = farmer.stats?.seedDistributionCount || 0
    if (count > 0) {
      return { label: '发苗中', color: 'processing' }
    }
    return { label: '未发苗', color: 'default' }
  }

  const getProgress = (): number => {
    if (!farmer) return 0
    const total = farmer.seedTotal || 0
    const distributed = farmer.stats?.totalSeedDistributed || 0
    if (total <= 0) return 0
    return Math.min(100, Math.round((distributed / total) * 100))
  }

  const columns: ColumnsType<SeedRecord> = [
    {
      title: '记录编号',
      dataIndex: 'recordId',
      width: 180,
    },
    {
      title: '发苗数量',
      dataIndex: 'quantity',
      width: 120,
      align: 'right',
      render: (v: number) => `${v} 万株`,
    },
    {
      title: '发放面积',
      dataIndex: 'distributedArea',
      width: 100,
      align: 'right',
      render: (v: number) => `${v || 0} 亩`,
    },
    {
      title: '苗款金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) => <span style={{ color: '#fa8c16' }}>¥{(v || 0).toFixed(2)}</span>,
    },
    {
      title: '发放日期',
      dataIndex: 'distributionDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作人',
      dataIndex: 'createByName',
      width: 100,
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!farmer) {
    return <div>农户不存在</div>
  }

  const status = getSeedStatus()
  const progress = getProgress()
  const distributed = farmer.stats?.totalSeedDistributed || 0
  const remaining = Math.max(0, (farmer.seedTotal || 0) - distributed)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/seeds')}
        >
          返回列表
        </Button>
        <div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/seeds/new?farmerId=${farmer._id}&farmerName=${encodeURIComponent(farmer.name)}`)}
          >
            新增发苗
          </Button>
        </div>
      </div>

      <Card title="农户信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="农户姓名">{farmer.name}</Descriptions.Item>
          <Descriptions.Item label="手机号">
            <a href={`tel:${farmer.phone}`}>{farmer.phone}</a>
          </Descriptions.Item>
          <Descriptions.Item label="签约面积">{farmer.acreage || 0} 亩</Descriptions.Item>
          <Descriptions.Item label="发苗状态">
            <Tag color={status.color}>{status.label}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="发苗进度" style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>发苗进度</span>
                <span style={{ fontWeight: 500 }}>{progress}%</span>
              </div>
              <Progress percent={progress} status={progress >= 100 ? 'success' : 'active'} />
            </div>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="签约种苗" value={farmer.seedTotal || 0} suffix="万株" />
          </Col>
          <Col span={6}>
            <Statistic title="已发数量" value={distributed.toFixed(1)} suffix="万株" valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title="剩余待发" value={remaining.toFixed(1)} suffix="万株" valueStyle={{ color: remaining > 0 ? '#fa8c16' : '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="发放次数" value={farmer.stats?.seedDistributionCount || 0} suffix="次" />
          </Col>
        </Row>
      </Card>

      <Card title="苗款信息" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="应收苗款" value={farmer.receivableAmount || 0} prefix="¥" precision={2} />
          </Col>
          <Col span={6}>
            <Statistic title="已收定金" value={farmer.deposit || 0} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="累计苗款" value={farmer.stats?.totalSeedAmount || 0} prefix="¥" precision={2} valueStyle={{ color: '#fa8c16' }} />
          </Col>
          <Col span={6}>
            <Statistic title="种苗单价" value={farmer.seedUnitPrice || 0} prefix="¥" suffix="/万株" />
          </Col>
        </Row>
      </Card>

      <Card
        title="发苗记录"
        extra={<a onClick={() => navigate(`/seeds/records?phone=${farmer.phone}`)}>查看全部</a>}
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={records}
          loading={recordsLoading}
          pagination={{
            current: page,
            pageSize: 10,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => {
              setPage(p)
              loadRecords()
            },
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/seeds/records/${record._id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  )
}
