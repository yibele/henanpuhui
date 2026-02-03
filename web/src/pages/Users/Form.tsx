import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Select, message, Spin } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { userApi, warehouseApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'finance_admin', label: '会计' },
  { value: 'cashier', label: '出纳' },
  { value: 'assistant', label: '助理' },
  { value: 'warehouse_manager', label: '仓管' },
]

interface Warehouse {
  _id: string
  name: string
  code: string
}

export default function UserForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseLoading, setWarehouseLoading] = useState(false)
  const isEdit = !!id

  // 监听角色变化，加载仓库列表
  const selectedRole = Form.useWatch('role', form)

  useEffect(() => {
    if (selectedRole === 'warehouse_manager') {
      loadWarehouses()
    }
  }, [selectedRole])

  useEffect(() => {
    if (isEdit && id) {
      loadUser(id)
    }
  }, [id])

  const loadWarehouses = async () => {
    if (!userInfo?.id || warehouses.length > 0) return

    setWarehouseLoading(true)
    try {
      const result = await warehouseApi.list(userInfo.id) as any
      if (result.success) {
        setWarehouses(result.data || [])
      }
    } catch (error) {
      console.error('加载仓库列表失败:', error)
    } finally {
      setWarehouseLoading(false)
    }
  }

  const loadUser = async (userId: string) => {
    setLoading(true)
    try {
      const result = await userApi.list({
        userId: userInfo?.id || '',
        pageSize: 100,
      }) as any

      if (result.success) {
        const user = result.data.list.find((u: any) => u._id === userId)
        if (user) {
          form.setFieldsValue({
            name: user.name,
            phone: user.phone,
            role: user.role,
            warehouseId: user.warehouseId,
          })
          // 如果是仓管，需要加载仓库列表
          if (user.role === 'warehouse_manager') {
            loadWarehouses()
          }
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    if (!userInfo?.id) {
      message.error('请先登录')
      return
    }

    // 仓管必须选择仓库
    if (values.role === 'warehouse_manager' && !values.warehouseId) {
      message.error('仓管必须选择所属仓库')
      return
    }

    setSubmitLoading(true)
    try {
      let result: any

      // 获取仓库名称
      let warehouseName = ''
      if (values.warehouseId) {
        const warehouse = warehouses.find(w => w._id === values.warehouseId)
        warehouseName = warehouse?.name || ''
      }

      if (isEdit) {
        const updateData: any = {
          name: values.name,
          role: values.role,
        }
        if (values.password) {
          updateData.password = values.password
        }
        if (values.role === 'warehouse_manager') {
          updateData.warehouseId = values.warehouseId
          updateData.warehouseName = warehouseName
        } else {
          // 非仓管清空仓库信息
          updateData.warehouseId = ''
          updateData.warehouseName = ''
        }

        result = await userApi.update(userInfo.id, id!, updateData)
      } else {
        result = await userApi.create(userInfo.id, {
          name: values.name,
          phone: values.phone,
          password: values.password,
          role: values.role,
          warehouseId: values.role === 'warehouse_manager' ? values.warehouseId : '',
          warehouseName: values.role === 'warehouse_manager' ? warehouseName : '',
        })
      }

      if (result.success) {
        message.success(isEdit ? '更新成功' : '创建成功')
        navigate('/users')
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('保存用户失败:', error)
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
          返回列表
        </Button>
      </div>

      <Card title={isEdit ? '编辑用户' : '新增用户'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 500 }}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="用户姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="手机号（登录账号）" disabled={isEdit} />
          </Form.Item>

          <Form.Item
            name="password"
            label={isEdit ? '新密码' : '密码'}
            rules={isEdit ? [] : [{ required: true, message: '请输入密码' }]}
            extra={isEdit ? '留空则不修改密码' : ''}
          >
            <Input.Password placeholder={isEdit ? '留空则不修改' : '登录密码'} />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select options={ROLE_OPTIONS} placeholder="选择用户角色" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.role !== curr.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'warehouse_manager' ? (
                <Form.Item
                  name="warehouseId"
                  label="所属仓库"
                  rules={[{ required: true, message: '仓管必须选择所属仓库' }]}
                >
                  <Select
                    placeholder="选择仓库"
                    loading={warehouseLoading}
                    options={warehouses.map(w => ({
                      value: w._id,
                      label: `${w.name}（${w.code}）`,
                    }))}
                    notFoundContent={warehouseLoading ? <Spin size="small" /> : '暂无仓库'}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitLoading}
              size="large"
            >
              {isEdit ? '保存修改' : '创建用户'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
