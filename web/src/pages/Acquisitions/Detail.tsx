import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Spin, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { acquisitionApi } from '../../services/cloudbase'
import dayjs from 'dayjs'

interface AcquisitionDetail {
  _id: string
  acquisitionId: string
  farmerId: string
  farmerName: string
  farmerPhone: string
  warehouseId?: string
  warehouseName?: string
  grossWeight: number
  tareWeight: number
  netWeight: number
  unitPrice: number
  amount: number
  remark?: string
  createTime: string
  createByName: string
  status: string
}

export default function AcquisitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<AcquisitionDetail | null>(null)

  useEffect(() => {
    if (id) {
      loadDetail(id)
    }
  }, [id])

  const loadDetail = async (acquisitionId: string) => {
    setLoading(true)
    try {
      const result = await acquisitionApi.get(acquisitionId) as any
      if (result.success) {
        setDetail(result.data)
      } else {
        message.error(result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载收购详情失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!detail) {
    return <div>收购记录不存在</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/acquisitions')}
        >
          返回列表
        </Button>
      </div>

      <Card title="收购详情">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="收购编号">{detail.acquisitionId}</Descriptions.Item>
          <Descriptions.Item label="农户姓名">{detail.farmerName}</Descriptions.Item>
          <Descriptions.Item label="农户手机">{detail.farmerPhone}</Descriptions.Item>
          <Descriptions.Item label="仓库">{detail.warehouseName || '-'}</Descriptions.Item>
          <Descriptions.Item label="登记人">{detail.createByName}</Descriptions.Item>
          <Descriptions.Item label="登记时间">
            {detail.createTime ? dayjs(detail.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="重量信息" style={{ marginTop: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} bordered>
          <Descriptions.Item label="毛重">{detail.grossWeight} kg</Descriptions.Item>
          <Descriptions.Item label="皮重">{detail.tareWeight} kg</Descriptions.Item>
          <Descriptions.Item label="净重">
            <span style={{ fontWeight: 600, color: '#1890ff' }}>{detail.netWeight} kg</span>
          </Descriptions.Item>
          <Descriptions.Item label="单价">¥{detail.unitPrice}/kg</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="金额信息" style={{ marginTop: 16 }}>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="收购金额">
            <span style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>
              ¥{detail.amount.toFixed(2)}
            </span>
          </Descriptions.Item>
          {detail.remark && (
            <Descriptions.Item label="备注">{detail.remark}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  )
}
