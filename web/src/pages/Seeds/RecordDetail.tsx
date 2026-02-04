import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Spin, Tag, message, Popconfirm } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { seedApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import dayjs from 'dayjs'

interface SeedDetail {
  _id: string
  recordId: string
  farmerId: string
  farmerName: string
  farmerPhone: string
  quantity: number
  distributedArea: number
  unitPrice: number
  amount: number
  distributionDate: string
  createByName: string
  createById: string
  createTime: string
  remark?: string
  distributionStatus?: 'distributed' | 'inProgress' | 'completed'
}

export default function SeedDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [record, setRecord] = useState<SeedDetail | null>(null)

  useEffect(() => {
    if (id && userInfo?.id) {
      loadDetail(id)
    }
  }, [id, userInfo])

  const loadDetail = async (recordId: string) => {
    setLoading(true)
    try {
      const result = await seedApi.get(recordId, userInfo!.id) as any
      if (result.success) {
        setRecord(result.data)
      } else {
        message.error(result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载发苗详情失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !userInfo) return
    setDeleting(true)
    try {
      const result = await seedApi.delete(id, userInfo.id) as any
      if (result.success) {
        message.success('删除成功')
        navigate('/seeds/records')
      } else {
        message.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除发苗记录失败:', error)
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

  if (!record) {
    return <div>记录不存在</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/seeds/records')}
        >
          返回列表
        </Button>
        <Popconfirm
          title="确认删除"
          description="删除后无法恢复，确定要删除该发苗记录吗？"
          onConfirm={handleDelete}
          okText="确认删除"
          cancelText="取消"
          okButtonProps={{ danger: true, loading: deleting }}
        >
          <Button danger icon={<DeleteOutlined />} loading={deleting}>
            删除记录
          </Button>
        </Popconfirm>
      </div>

      <Card title="发苗记录详情" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="记录编号">{record.recordId}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {record.distributionStatus === 'completed' ? (
              <Tag color="success">已完成</Tag>
            ) : record.distributionStatus === 'inProgress' ? (
              <Tag color="processing">发苗中</Tag>
            ) : (
              <Tag color="default">已发放</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="发放日期">
            {record.distributionDate ? dayjs(record.distributionDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="农户信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="农户姓名">{record.farmerName}</Descriptions.Item>
          <Descriptions.Item label="手机号">
            <a href={`tel:${record.farmerPhone}`}>{record.farmerPhone}</a>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="发苗信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="发苗数量">
            <span style={{ fontWeight: 500 }}>{record.quantity} 万株</span>
          </Descriptions.Item>
          <Descriptions.Item label="发放面积">{record.distributedArea || 0} 亩</Descriptions.Item>
          <Descriptions.Item label="单价">{record.unitPrice || 0} 元/万株</Descriptions.Item>
          <Descriptions.Item label="苗款金额">
            <span style={{ color: '#fa8c16', fontWeight: 500 }}>¥{(record.amount || 0).toFixed(2)}</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="操作信息">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="操作人">{record.createByName}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注">{record.remark || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
