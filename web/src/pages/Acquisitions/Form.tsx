import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, InputNumber, message, AutoComplete } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { farmerApi, acquisitionApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'

interface FarmerOption {
  value: string
  label: string
  farmer: any
}

export default function AcquisitionForm() {
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [form] = Form.useForm()
  const [submitLoading, setSubmitLoading] = useState(false)
  const [farmerOptions, setFarmerOptions] = useState<FarmerOption[]>([])
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null)
  const [, setSearchLoading] = useState(false)

  // 搜索农户
  const handleFarmerSearch = async (value: string) => {
    if (!value || value.length < 2) {
      setFarmerOptions([])
      return
    }

    setSearchLoading(true)
    try {
      const result = await farmerApi.list({
        keyword: value,
        pageSize: 10,
        userId: userInfo?.id || '',
      }) as any

      if (result.success && result.data.list) {
        const options = result.data.list.map((f: any) => ({
          value: f._id,
          label: `${f.name} - ${f.phone}`,
          farmer: f,
        }))
        setFarmerOptions(options)
      }
    } catch (error) {
      console.error('搜索农户失败:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  // 选择农户
  const handleFarmerSelect = (_value: string, option: any) => {
    setSelectedFarmer(option.farmer)
    form.setFieldsValue({
      farmerName: option.farmer.name,
      farmerPhone: option.farmer.phone,
    })
  }

  // 计算净重和金额
  const handleWeightChange = () => {
    const grossWeight = form.getFieldValue('grossWeight') || 0
    const tareWeight = form.getFieldValue('tareWeight') || 0
    const unitPrice = form.getFieldValue('unitPrice') || 0

    const netWeight = Math.max(0, grossWeight - tareWeight)
    const amount = netWeight * unitPrice

    form.setFieldsValue({
      netWeight: Math.round(netWeight * 10) / 10,
      amount: Math.round(amount * 100) / 100,
    })
  }

  const handleSubmit = async (values: any) => {
    if (!userInfo) {
      message.error('请先登录')
      return
    }

    if (!selectedFarmer) {
      message.error('请选择农户')
      return
    }

    setSubmitLoading(true)
    try {
      const data = {
        farmerId: selectedFarmer._id,
        farmerName: selectedFarmer.name,
        farmerPhone: selectedFarmer.phone,
        grossWeight: values.grossWeight,
        tareWeight: values.tareWeight,
        netWeight: values.netWeight,
        unitPrice: values.unitPrice,
        amount: values.amount,
        remark: values.remark || '',
      }

      const result = await acquisitionApi.create({
        userId: userInfo.id,
        userName: userInfo.name,
        ...data,
      }) as any

      if (result.success) {
        message.success('收购登记成功')
        navigate('/acquisitions')
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('保存收购失败:', error)
      message.error('保存失败')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/acquisitions')}>
          返回列表
        </Button>
      </div>

      <Card title="新增收购">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 600 }}
          initialValues={{ unitPrice: 9 }}
        >
          <Form.Item
            name="farmerSearch"
            label="选择农户"
            rules={[{ required: true, message: '请选择农户' }]}
          >
            <AutoComplete
              options={farmerOptions}
              onSearch={handleFarmerSearch}
              onSelect={handleFarmerSelect}
              placeholder="输入农户姓名或手机号搜索"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {selectedFarmer && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <div>农户：{selectedFarmer.name}</div>
              <div>手机：{selectedFarmer.phone}</div>
              <div>地址：{selectedFarmer.addressText}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="grossWeight"
              label="毛重（kg）"
              rules={[{ required: true, message: '请输入毛重' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="毛重"
                onChange={handleWeightChange}
              />
            </Form.Item>

            <Form.Item
              name="tareWeight"
              label="皮重（kg）"
              rules={[{ required: true, message: '请输入皮重' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="皮重"
                onChange={handleWeightChange}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="netWeight" label="净重（kg）">
              <InputNumber min={0} style={{ width: '100%' }} disabled />
            </Form.Item>

            <Form.Item
              name="unitPrice"
              label="单价（元/kg）"
              rules={[{ required: true, message: '请输入单价' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="单价"
                onChange={handleWeightChange}
              />
            </Form.Item>
          </div>

          <Form.Item name="amount" label="金额（元）">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              disabled
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息（选填）" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitLoading}
              size="large"
            >
              确认收购
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
