import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Spin, Tag, message, Modal, Input, Select, Space } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, PayCircleOutlined } from '@ant-design/icons'
import { settlementApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'

interface SettlementDetail {
  _id: string
  settlementId: string
  farmerId: string
  farmerName: string
  farmerPhone: string
  acquisitionAmount: number
  seedDeduction: number
  agriculturalDeduction: number
  advanceDeduction: number
  totalDeduction: number
  actualPayment: number
  status: string
  createTime: string
  auditTime?: string
  auditBy?: string
  payTime?: string
  payBy?: string
  paymentMethod?: string
  remark?: string
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '待付款', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
}

const PAYMENT_METHODS: Record<string, string> = {
  wechat: '微信转账',
  alipay: '支付宝',
  bank: '银行转账',
  cash: '现金',
}

export default function SettlementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<SettlementDetail | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // 驳回弹窗
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // 付款弹窗
  const [payModalVisible, setPayModalVisible] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('wechat')
  const [payRemark, setPayRemark] = useState('')

  useEffect(() => {
    if (id) {
      loadDetail(id)
    }
  }, [id])

  const loadDetail = async (settlementId: string) => {
    setLoading(true)
    try {
      const result = await settlementApi.get(settlementId) as any
      if (result.success) {
        setDetail(result.data)
      } else {
        message.error(result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载结算详情失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 会计审核通过
  const handleAudit = async () => {
    if (!detail || !userInfo) return

    Modal.confirm({
      title: '确认审核通过',
      content: `确认审核通过该结算单？实付金额：¥${detail.actualPayment.toFixed(2)}`,
      onOk: async () => {
        setActionLoading(true)
        try {
          const result = await settlementApi.audit(detail._id, userInfo.id, userInfo.name) as any
          if (result.success) {
            message.success('审核通过')
            loadDetail(detail._id)
          } else {
            message.error(result.message || '操作失败')
          }
        } catch (error) {
          console.error('审核失败:', error)
          message.error('操作失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  // 会计驳回
  const handleReject = async () => {
    if (!detail || !userInfo || !rejectReason.trim()) {
      message.warning('请输入驳回原因')
      return
    }

    setActionLoading(true)
    try {
      const result = await settlementApi.reject(detail._id, userInfo.id, userInfo.name, rejectReason) as any
      if (result.success) {
        message.success('已驳回')
        setRejectModalVisible(false)
        setRejectReason('')
        loadDetail(detail._id)
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('驳回失败:', error)
      message.error('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  // 出纳付款
  const handlePay = async () => {
    if (!detail || !userInfo) return

    setActionLoading(true)
    try {
      const result = await settlementApi.pay(detail._id, userInfo.id, userInfo.name, paymentMethod, payRemark) as any
      if (result.success) {
        message.success('付款成功')
        setPayModalVisible(false)
        setPayRemark('')
        loadDetail(detail._id)
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('付款失败:', error)
      message.error('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  // 判断是否可以审核（会计 + 待审核状态）
  const canAudit = userInfo?.role === 'finance_admin' && detail?.status === 'pending'

  // 判断是否可以付款（出纳 + 待付款状态）
  const canPay = userInfo?.role === 'cashier' && detail?.status === 'approved'

  // 管理员可以做所有操作
  const isAdmin = userInfo?.role === 'admin'

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!detail) {
    return <div>结算记录不存在</div>
  }

  const statusConfig = STATUS_MAP[detail.status] || { text: '未知', color: 'default' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/settlements')}
        >
          返回列表
        </Button>

        {/* 操作按钮 */}
        <Space>
          {(canAudit || (isAdmin && detail.status === 'pending')) && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleAudit}
                loading={actionLoading}
              >
                审核通过
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectModalVisible(true)}
                loading={actionLoading}
              >
                驳回
              </Button>
            </>
          )}
          {(canPay || (isAdmin && detail.status === 'approved')) && (
            <Button
              type="primary"
              icon={<PayCircleOutlined />}
              onClick={() => setPayModalVisible(true)}
              loading={actionLoading}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              确认付款
            </Button>
          )}
        </Space>
      </div>

      <Card
        title={
          <span>
            结算详情
            <Tag color={statusConfig.color} style={{ marginLeft: 12 }}>
              {statusConfig.text}
            </Tag>
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="结算编号">{detail.settlementId}</Descriptions.Item>
          <Descriptions.Item label="农户姓名">{detail.farmerName}</Descriptions.Item>
          <Descriptions.Item label="手机号">{detail.farmerPhone}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {detail.createTime ? new Date(detail.createTime).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
          {detail.auditTime && (
            <Descriptions.Item label="审核时间">
              {new Date(detail.auditTime).toLocaleString('zh-CN')}
            </Descriptions.Item>
          )}
          {detail.auditBy && (
            <Descriptions.Item label="审核人">{detail.auditBy}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="金额明细" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="货款金额">
            <span style={{ fontSize: 18, fontWeight: 500 }}>
              ¥{(detail.acquisitionAmount || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="种苗扣款">
            <span style={{ color: '#f5222d' }}>
              -¥{(detail.seedDeduction || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="农资扣款">
            <span style={{ color: '#f5222d' }}>
              -¥{(detail.agriculturalDeduction || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="预支扣款">
            <span style={{ color: '#f5222d' }}>
              -¥{(detail.advanceDeduction || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="扣款合计">
            <span style={{ color: '#f5222d', fontWeight: 500 }}>
              -¥{(detail.totalDeduction || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="实付金额">
            <span style={{ color: '#52c41a', fontSize: 20, fontWeight: 600 }}>
              ¥{(detail.actualPayment || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {detail.status === 'completed' && (
        <Card title="付款信息">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="付款方式">
              {PAYMENT_METHODS[detail.paymentMethod || ''] || detail.paymentMethod || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="付款人">{detail.payBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="付款时间">
              {detail.payTime ? new Date(detail.payTime).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            {detail.remark && (
              <Descriptions.Item label="备注">{detail.remark}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 驳回弹窗 */}
      <Modal
        title="驳回结算"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => setRejectModalVisible(false)}
        confirmLoading={actionLoading}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          placeholder="请输入驳回原因"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* 付款弹窗 */}
      <Modal
        title="确认付款"
        open={payModalVisible}
        onOk={handlePay}
        onCancel={() => setPayModalVisible(false)}
        confirmLoading={actionLoading}
        okText="确认付款"
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>付款金额</div>
          <div style={{ fontSize: 24, color: '#52c41a', fontWeight: 600 }}>
            ¥{(detail.actualPayment || 0).toFixed(2)}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>付款方式</div>
          <Select
            value={paymentMethod}
            onChange={setPaymentMethod}
            style={{ width: '100%' }}
            options={[
              { value: 'wechat', label: '微信转账' },
              { value: 'alipay', label: '支付宝' },
              { value: 'bank', label: '银行转账' },
              { value: 'cash', label: '现金' },
            ]}
          />
        </div>
        <div>
          <div style={{ marginBottom: 8 }}>备注（选填）</div>
          <Input.TextArea
            placeholder="付款备注"
            rows={2}
            value={payRemark}
            onChange={(e) => setPayRemark(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
