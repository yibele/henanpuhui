import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Table, Button, Spin, Tag, message, Popconfirm } from 'antd'
import { ArrowLeftOutlined, PhoneOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'

interface FarmerDetail {
  _id: string
  farmerId: string
  name: string
  phone: string
  idCard: string
  addressText: string
  acreage: number
  grade: string
  deposit: number
  seedTotal: number
  seedDebt: number
  agriculturalDebt: number
  advancePayment: number
  status: string
  createTime: string
  createByName: string
}

interface BusinessRecord {
  _id: string
  type: string
  createTime: string
  amount?: number
  totalAmount?: number
  remark?: string
}

const TYPE_NAMES: Record<string, string> = {
  seed: '种苗发放',
  fertilizer: '化肥发放',
  pesticide: '农药发放',
  advance: '预付款',
  addendum: '追加签约',
  acquisition: '收购入库',
  settlement: '结算',
  payment: '结算付款',
}

export default function FarmerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null)
  const [records, setRecords] = useState<BusinessRecord[]>([])

  useEffect(() => {
    if (id) {
      loadDetail(id)
    }
  }, [id])

  const loadDetail = async (farmerId: string) => {
    setLoading(true)
    try {
      const [detailRes, recordsRes] = await Promise.all([
        farmerApi.get(farmerId),
        farmerApi.getBusinessRecords(farmerId),
      ]) as any[]

      if (detailRes.success) {
        setFarmer(detailRes.data)
      }
      if (recordsRes.success) {
        setRecords(recordsRes.data.list || [])
      }
    } catch (error) {
      console.error('加载农户详情失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !userInfo) return
    setDeleting(true)
    try {
      const result = await farmerApi.delete(userInfo.id, id) as any
      if (result.success) {
        message.success('删除成功')
        navigate('/farmers')
      } else {
        message.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除农户失败:', error)
      message.error('删除失败')
    } finally {
      setDeleting(false)
    }
  }

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

  const recordColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => (
        <Tag>{TYPE_NAMES[type] || type}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: BusinessRecord) => {
        const amount = record.totalAmount || record.amount
        return amount ? `¥${amount.toFixed(2)}` : '-'
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/farmers')}
        >
          返回列表
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/farmers/${id}/edit`)}
        >
          编辑农户
        </Button>
        <Popconfirm
          title="确认删除"
          description="删除后无法恢复，确定要删除该农户吗？"
          onConfirm={handleDelete}
          okText="确认删除"
          cancelText="取消"
          okButtonProps={{ danger: true, loading: deleting }}
        >
          <Button danger icon={<DeleteOutlined />} loading={deleting}>
            删除农户
          </Button>
        </Popconfirm>
      </div>

      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="农户编号">{farmer.farmerId}</Descriptions.Item>
          <Descriptions.Item label="姓名">{farmer.name}</Descriptions.Item>
          <Descriptions.Item label="手机号">
            <a href={`tel:${farmer.phone}`}>
              <PhoneOutlined /> {farmer.phone}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label="身份证号">{farmer.idCard}</Descriptions.Item>
          <Descriptions.Item label="种植地址" span={2}>{farmer.addressText}</Descriptions.Item>
          <Descriptions.Item label="种植面积">{farmer.acreage} 亩</Descriptions.Item>
          <Descriptions.Item label="等级">
            <Tag color={farmer.grade === 'A' ? 'gold' : farmer.grade === 'B' ? 'blue' : 'default'}>
              {farmer.grade}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="登记人">{farmer.createByName}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="财务信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="定金">¥{farmer.deposit || 0}</Descriptions.Item>
          <Descriptions.Item label="种苗合计">{farmer.seedTotal || 0} 万株</Descriptions.Item>
          <Descriptions.Item label="种苗欠款">
            <span style={{ color: farmer.seedDebt > 0 ? '#f5222d' : 'inherit' }}>
              ¥{farmer.seedDebt || 0}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="农资欠款">
            <span style={{ color: farmer.agriculturalDebt > 0 ? '#f5222d' : 'inherit' }}>
              ¥{farmer.agriculturalDebt || 0}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="预支款">¥{farmer.advancePayment || 0}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="业务记录">
        <Table
          rowKey="_id"
          columns={recordColumns}
          dataSource={records}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
