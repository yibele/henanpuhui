import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Form, Input, Button, Select, InputNumber, message, Spin } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'

export default function FarmerForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  const isEdit = !!id

  useEffect(() => {
    if (isEdit && id) {
      loadFarmer(id)
    }
  }, [id])

  const loadFarmer = async (farmerId: string) => {
    setLoading(true)
    try {
      const result = await farmerApi.get(farmerId) as any
      if (result.success && result.data) {
        const data = result.data
        form.setFieldsValue({
          name: data.name,
          phone: data.phone,
          idCard: data.idCard,
          county: data.address?.county || '',
          township: data.address?.township || '',
          village: data.address?.village || '',
          acreage: data.acreage,
          grade: data.grade || 'C',
          deposit: data.deposit || 0,
          firstManager: data.firstManager || '',
          secondManager: data.secondManager || '',
          seedTotal: data.seedTotal || 0,
          seedUnitPrice: data.seedUnitPrice || 0,
        })
      } else {
        message.error('农户不存在')
        navigate('/farmers')
      }
    } catch (error) {
      console.error('加载农户失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    if (!userInfo) {
      message.error('请先登录')
      return
    }

    setSubmitLoading(true)
    try {
      const data = {
        name: values.name,
        phone: values.phone,
        idCard: values.idCard,
        address: {
          county: values.county,
          township: values.township,
          village: values.village,
        },
        acreage: values.acreage,
        grade: values.grade,
        deposit: values.deposit || 0,
        firstManager: values.firstManager,
        secondManager: values.secondManager || '',
        seedTotal: values.seedTotal || 0,
        seedUnitPrice: values.seedUnitPrice || 0,
        receivableAmount: (values.seedTotal || 0) * (values.seedUnitPrice || 0),
      }

      let result: any
      if (isEdit) {
        result = await farmerApi.update(userInfo.id, id!, data)
      } else {
        result = await farmerApi.create(userInfo.id, data)
      }

      if (result.success) {
        message.success(isEdit ? '更新成功' : '创建成功')
        navigate('/farmers')
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('保存农户失败:', error)
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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/farmers')}>
          返回列表
        </Button>
      </div>

      <Card title={isEdit ? '编辑农户' : '新增农户'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 800 }}
          initialValues={{ grade: 'C' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入农户姓名" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
              ]}
            >
              <Input placeholder="请输入手机号" maxLength={11} />
            </Form.Item>

            <Form.Item
              name="idCard"
              label="身份证号"
              rules={[
                { required: true, message: '请输入身份证号' },
                { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号' },
              ]}
            >
              <Input placeholder="请输入身份证号" maxLength={18} />
            </Form.Item>

            <Form.Item
              name="grade"
              label="等级"
              rules={[{ required: true, message: '请选择等级' }]}
            >
              <Select
                options={[
                  { value: 'A', label: 'A级' },
                  { value: 'B', label: 'B级' },
                  { value: 'C', label: 'C级' },
                ]}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="county"
              label="县/区"
              rules={[{ required: true, message: '请输入县/区' }]}
            >
              <Input placeholder="如：新野县" />
            </Form.Item>

            <Form.Item
              name="township"
              label="乡/镇"
              rules={[{ required: true, message: '请输入乡/镇' }]}
            >
              <Input placeholder="如：溧河铺镇" />
            </Form.Item>

            <Form.Item
              name="village"
              label="村"
              rules={[{ required: true, message: '请输入村' }]}
            >
              <Input placeholder="如：张庄村" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="acreage"
              label="种植面积（亩）"
              rules={[{ required: true, message: '请输入种植面积' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入面积" />
            </Form.Item>

            <Form.Item name="seedTotal" label="种苗数量（万株）">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="种苗数量" />
            </Form.Item>

            <Form.Item name="seedUnitPrice" label="种苗单价（元/万株）">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="单价" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="deposit" label="定金（元）">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="已收定金" />
            </Form.Item>

            <Form.Item
              name="firstManager"
              label="第一负责人"
              rules={[{ required: true, message: '请输入负责人' }]}
            >
              <Input placeholder="负责人姓名" />
            </Form.Item>

            <Form.Item name="secondManager" label="第二负责人">
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
              {isEdit ? '保存修改' : '创建农户'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
