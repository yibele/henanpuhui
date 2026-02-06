import { useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from 'antd'
import { farmerApi } from '../services/cloudbase'
import dayjs from 'dayjs'

interface ModalProps {
  visible: boolean
  farmerId: string
  farmerName: string
  userId: string
  userName: string
  onClose: () => void
  onSuccess: () => void
}

// 预支款弹窗
export function AdvancePaymentModal({ visible, farmerId, farmerName, userId, userName, onClose, onSuccess }: ModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const result = await farmerApi.addAdvancePayment(userId, userName, farmerId, {
        amount: values.amount,
        remark: values.remark || '',
        paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      }) as any
      if (result.success) {
        message.success('预支款登记成功')
        form.resetFields()
        onSuccess()
        onClose()
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('预支款登记失败:', error)
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={`预支款登记 - ${farmerName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ paymentDate: dayjs() }}>
        <Form.Item
          name="amount"
          label="预支金额（元）"
          rules={[{ required: true, message: '请输入预支金额' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入金额" />
        </Form.Item>
        <Form.Item name="paymentDate" label="支付日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 农资发放弹窗
export function AgriculturalSupplyModal({ visible, farmerId, farmerName, userId, userName, onClose, onSuccess }: ModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const amount = (values.quantity || 0) * (values.unitPrice || 0)
      const result = await farmerApi.addAgriculturalSupply(userId, userName, farmerId, {
        type: values.type,
        name: values.name,
        category: values.category || '',
        quantity: values.quantity,
        unit: values.unit || (values.type === 'fertilizer' ? '袋' : '瓶'),
        unitPrice: values.unitPrice,
        amount,
        supplyDate: values.supplyDate ? values.supplyDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        remark: values.remark || '',
      }) as any
      if (result.success) {
        message.success(`${values.type === 'fertilizer' ? '化肥' : '农药'}发放成功`)
        form.resetFields()
        onSuccess()
        onClose()
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('农资发放失败:', error)
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  const type = Form.useWatch('type', form)
  const quantity = Form.useWatch('quantity', form)
  const unitPrice = Form.useWatch('unitPrice', form)
  const totalAmount = (quantity || 0) * (unitPrice || 0)

  return (
    <Modal
      title={`农资发放 - ${farmerName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnClose
      width={500}
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'fertilizer', supplyDate: dayjs() }}>
        <Form.Item
          name="type"
          label="类型"
          rules={[{ required: true, message: '请选择类型' }]}
        >
          <Select
            options={[
              { value: 'fertilizer', label: '化肥' },
              { value: 'pesticide', label: '农药' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入名称' }]}
        >
          <Input placeholder={type === 'fertilizer' ? '如：复合肥、尿素' : '如：吡虫啉、草甘膦'} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="quantity"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="数量" />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder={type === 'fertilizer' ? '袋' : '瓶'} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="unitPrice"
            label="单价（元）"
            rules={[{ required: true, message: '请输入单价' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="单价" />
          </Form.Item>
          <Form.Item label="金额（元）">
            <InputNumber value={totalAmount} style={{ width: '100%' }} disabled />
          </Form.Item>
        </div>
        <Form.Item name="supplyDate" label="发放日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 定金处理弹窗（退还 / 扣除）
interface DepositHandleModalProps {
  visible: boolean
  handleType: 'return' | 'forfeit'
  farmerId: string
  farmerName: string
  depositAmount: number
  userId: string
  userName: string
  onClose: () => void
  onSuccess: () => void
}

export function DepositHandleModal({
  visible,
  handleType,
  farmerId,
  farmerName,
  depositAmount,
  userId,
  userName,
  onClose,
  onSuccess,
}: DepositHandleModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const isReturn = handleType === 'return'
  const title = isReturn ? '退还定金' : '扣除定金'
  const okText = isReturn ? '确认退还' : '确认扣除'

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const result = await farmerApi.handleDeposit(userId, userName, farmerId, {
        handleType,
        paymentMethod: isReturn ? (values.paymentMethod || 'cash') : undefined,
        reason: !isReturn ? values.reason : undefined,
        remark: values.remark || '',
      }) as any
      if (result.success) {
        message.success(`${title}成功`)
        form.resetFields()
        onSuccess()
        onClose()
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error(`${title}失败:`, error)
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={`${title} - ${farmerName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={okText}
      okButtonProps={isReturn ? { style: { background: '#52c41a', borderColor: '#52c41a' } } : { danger: true }}
      destroyOnClose
    >
      <div style={{ background: isReturn ? '#f6ffed' : '#fff2f0', padding: 16, borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 4 }}>{isReturn ? '退还金额' : '扣除金额'}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: isReturn ? '#52c41a' : '#f5222d' }}>¥{depositAmount.toFixed(2)}</div>
      </div>
      <Form form={form} layout="vertical" initialValues={{ paymentMethod: 'cash' }}>
        {isReturn ? (
          <Form.Item name="paymentMethod" label="退还方式" rules={[{ required: true, message: '请选择退还方式' }]}>
            <Select
              options={[
                { value: 'cash', label: '现金' },
                { value: 'wechat', label: '微信转账' },
                { value: 'bank', label: '银行转账' },
              ]}
            />
          </Form.Item>
        ) : (
          <Form.Item name="reason" label="扣除原因" rules={[{ required: true, message: '请输入扣除原因' }]}>
            <Input.TextArea rows={2} placeholder="如：农户违约未交货、逾期未履约等" />
          </Form.Item>
        )}
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 追加签约弹窗
export function AddendumModal({ visible, farmerId, farmerName, userId, userName, onClose, onSuccess }: ModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const result = await farmerApi.addAddendum(userId, userName, farmerId, {
        addedAcreage: values.addedAcreage,
        addedSeedTotal: values.addedSeedTotal || 0,
        addedSeedUnitPrice: values.addedSeedUnitPrice || 0,
        addedReceivable: values.addedReceivable || 0,
        addedDeposit: values.addedDeposit || 0,
        remark: values.remark || '',
      }) as any
      if (result.success) {
        message.success('追加签约成功')
        form.resetFields()
        onSuccess()
        onClose()
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('追加签约失败:', error)
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  const seedTotal = Form.useWatch('addedSeedTotal', form)
  const seedUnitPrice = Form.useWatch('addedSeedUnitPrice', form)
  const calculatedReceivable = (seedTotal || 0) * (seedUnitPrice || 0)

  return (
    <Modal
      title={`追加签约 - ${farmerName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      destroyOnClose
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="addedAcreage"
          label="追加面积（亩）"
          rules={[{ required: true, message: '请输入追加面积' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="追加面积" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="addedSeedTotal" label="追加苗数（万株）">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="万株" />
          </Form.Item>
          <Form.Item name="addedSeedUnitPrice" label="单价（元/万株）">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="单价" />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="addedReceivable" label="追加应收款（元）">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder={calculatedReceivable > 0 ? `自动计算: ${calculatedReceivable}` : '应收款'}
            />
          </Form.Item>
          <Form.Item name="addedDeposit" label="追加定金（元）">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="定金" />
          </Form.Item>
        </div>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
