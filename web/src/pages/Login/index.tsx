import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../stores/AuthContext'
import './Login.css'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true)
    const result = await login(values.phone, values.password)
    setLoading(false)

    if (result.success) {
      message.success('登录成功')
      navigate('/')
    } else {
      message.error(result.message || '登录失败')
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <h1>普惠农录</h1>
          <p>管理后台</p>
        </div>
        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="手机号"
              maxLength={11}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
