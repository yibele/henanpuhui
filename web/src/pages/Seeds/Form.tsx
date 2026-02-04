import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Form, Input, Button, InputNumber, DatePicker, message, Spin, AutoComplete } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { seedApi, farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import dayjs from 'dayjs'

interface FarmerOption {
  value: string
  label: string
  farmer: {
    _id: string
    name: string
    phone: string
    acreage: number
    seedTotal: number
    seedUnitPrice: number
    stats?: {
      totalSeedDistributed?: number
      totalSeedArea?: number
      seedDistributionCount?: number
    }
  }
}

export default function SeedForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userInfo } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [farmerOptions, setFarmerOptions] = useState<FarmerOption[]>([])
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerOption['farmer'] | null>(null)

  // 从 URL 参数获取农户信息
  const urlFarmerId = searchParams.get('farmerId')

  useEffect(() => {
    if (urlFarmerId) {
      loadFarmerFromUrl(urlFarmerId)
    }
  }, [urlFarmerId])

  const loadFarmerFromUrl = async (farmerId: string) => {
    setLoading(true)
    try {
      const result = await farmerApi.get(farmerId) as any
      if (result.success && result.data) {
        const f = result.data
        const farmer = {
          _id: f._id,
          name: f.name,
          phone: f.phone,
          acreage: f.acreage || 0,
          seedTotal: f.seedTotal || 0,
          seedUnitPrice: f.seedUnitPrice || 0,
          stats: f.stats || {},
        }
        setSelectedFarmer(farmer)
        form.setFieldsValue({
          farmerName: f.name,
          unitPrice: f.seedUnitPrice || 0,
          receiverName: f.name,
        })
      }
    } catch (error) {
      console.error('加载农户信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchFarmers = async (keyword: string) => {
    if (!keyword || !userInfo?.id) return
    try {
      const result = await farmerApi.list({
        keyword,
        userId: userInfo.id,
        page: 1,
        pageSize: 10,
      }) as any
      if (result.success && result.data.list) {
        const options = result.data.list.map((f: any) => ({
          value: f.name,
          label: `${f.name} - ${f.phone}`,
          farmer: {
            _id: f._id,
            name: f.name,
            phone: f.phone,
            acreage: f.acreage || 0,
            seedTotal: f.seedTotal || 0,
            seedUnitPrice: f.seedUnitPrice || 0,
            stats: f.stats || {},
          },
        }))
        setFarmerOptions(options)
      }
    } catch (error) {
      console.error('搜索农户失败:', error)
    }
  }

  const handleFarmerSelect = (_: string, option: FarmerOption) => {
    setSelectedFarmer(option.farmer)
    form.setFieldsValue({
      unitPrice: option.farmer.seedUnitPrice || 0,
      receiverName: option.farmer.name,
    })
    calculateAmount()
  }

  const calculateAmount = () => {
    const quantity = form.getFieldValue('quantity') || 0
    const unitPrice = form.getFieldValue('unitPrice') || 0
    form.setFieldsValue({
      amount: quantity * unitPrice,
    })
  }

  const handleSubmit = async (values: any) => {
    if (!userInfo || !selectedFarmer) {
      message.error('请先选择农户')
      return
    }

    setSubmitLoading(true)
    try {
      const data = {
        quantity: values.quantity,
        distributedArea: values.area || 0,
        unitPrice: values.unitPrice || 0,
        amount: values.amount || 0,
        distributionDate: values.distributionDate ? values.distributionDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        receiverName: values.receiverName || selectedFarmer.name,
        receiveLocation: values.receiveLocation || '',
        managerName: values.managerName || userInfo.name,
        remark: values.remark || '',
      }

      const result = await seedApi.distribute(
        userInfo.id,
        userInfo.name,
        selectedFarmer._id,
        data
      ) as any

      if (result.success) {
        message.success('发苗记录创建成功')
        navigate('/seeds')
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('保存发苗记录失败:', error)
      message.error('保存失败')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  // 计算已发和剩余（处理浮点数精度问题）
  const distributed = Number((selectedFarmer?.stats?.totalSeedDistributed || 0).toFixed(2))
  const distributedArea = Number((selectedFarmer?.stats?.totalSeedArea || 0).toFixed(2))
  const totalSeed = Number((selectedFarmer?.seedTotal || 0).toFixed(2))
  const totalAcreage = Number((selectedFarmer?.acreage || 0).toFixed(2))
  const remaining = Number(Math.max(0, totalSeed - distributed).toFixed(2))
  const remainingArea = Number(Math.max(0, totalAcreage - distributedArea).toFixed(2))

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/seeds')}>
          返回列表
        </Button>
      </div>

      <Card title="新增发苗记录">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 900 }}
          initialValues={{
            distributionDate: dayjs(),
            managerName: userInfo?.name || '',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="farmerName"
              label="选择农户"
              rules={[{ required: true, message: '请选择农户' }]}
            >
              <AutoComplete
                options={farmerOptions}
                onSearch={searchFarmers}
                onSelect={handleFarmerSelect}
                placeholder="输入农户姓名或手机号搜索"
                disabled={!!urlFarmerId}
              />
            </Form.Item>

            <Form.Item label="手机号">
              <Input
                value={selectedFarmer?.phone || ''}
                disabled
                placeholder="选择农户后显示"
              />
            </Form.Item>
          </div>

          {/* 农户签约信息展示 */}
          {selectedFarmer && (
            <div style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24
            }}>
              <div style={{ fontWeight: 500, marginBottom: 12, color: '#52c41a' }}>农户签约信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ color: '#999', fontSize: 12 }}>签约面积</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{totalAcreage} <span style={{ fontSize: 12 }}>亩</span></div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: 12 }}>签约苗数</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{totalSeed} <span style={{ fontSize: 12 }}>万株</span></div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: 12 }}>已发苗数</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>{distributed} <span style={{ fontSize: 12 }}>万株</span></div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: 12 }}>剩余苗数</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: remaining > 0 ? '#fa8c16' : '#52c41a' }}>{remaining} <span style={{ fontSize: 12 }}>万株</span></div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: 12 }}>签约单价</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>¥{selectedFarmer.seedUnitPrice} <span style={{ fontSize: 12 }}>/万株</span></div>
                </div>
              </div>
              {distributed > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                  已发放 {selectedFarmer?.stats?.seedDistributionCount || 0} 次，已发面积 {distributedArea} 亩，剩余面积 {remainingArea} 亩
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="quantity"
              label="本次发苗数量（万株）"
              rules={[{ required: true, message: '请输入发苗数量' }]}
            >
              <InputNumber
                min={0}
                step={0.1}
                style={{ width: '100%' }}
                placeholder={remaining > 0 ? `剩余 ${remaining} 万株` : '请输入数量'}
                onChange={calculateAmount}
              />
            </Form.Item>

            <Form.Item
              name="area"
              label="本次发放面积（亩）"
              rules={[{ required: true, message: '请输入发放面积' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder={remainingArea > 0 ? `剩余 ${remainingArea} 亩` : '请输入面积'}
              />
            </Form.Item>

            <Form.Item
              name="unitPrice"
              label="单价（元/万株）"
              rules={[{ required: true, message: '请输入单价' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="单价"
                onChange={calculateAmount}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="amount" label="苗款金额（元）">
              <InputNumber min={0} style={{ width: '100%' }} disabled />
            </Form.Item>

            <Form.Item
              name="distributionDate"
              label="发放日期"
              rules={[{ required: true, message: '请选择发放日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="receiverName"
              label="领取人"
              rules={[{ required: true, message: '请输入领取人' }]}
            >
              <Input placeholder="领取人姓名" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="receiveLocation" label="领取地点">
              <Input placeholder="领取地点（可选）" />
            </Form.Item>

            <Form.Item
              name="managerName"
              label="发苗负责人"
              rules={[{ required: true, message: '请输入发苗负责人' }]}
            >
              <Input placeholder="负责人姓名" />
            </Form.Item>

            <Form.Item name="remark" label="备注">
              <Input placeholder="可选" />
            </Form.Item>
          </div>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitLoading}
              size="large"
            >
              提交发苗记录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
