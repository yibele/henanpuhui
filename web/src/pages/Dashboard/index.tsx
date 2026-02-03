import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Spin, Table, message } from 'antd'
import {
  UserOutlined,
  ShoppingCartOutlined,
  AccountBookOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { dashboardApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'

interface DashboardData {
  farmer: {
    count: number
    totalAcreage: number
    totalDeposit: number
    totalSeedDebt: number
    totalAgriculturalDebt: number
    totalAdvancePayment: number
  }
  seed: {
    count: number
    totalQuantity: number
    totalAmount: number
  }
  acquisition: {
    count: number
    totalWeight: number
    totalAmount: number
  }
  agricultural: {
    fertilizerCount: number
    fertilizerAmount: number
    pesticideCount: number
    pesticideAmount: number
    totalAmount: number
  }
  advance: {
    count: number
    totalAmount: number
  }
  settlement: {
    totalCount: number
    pendingCount: number
    pendingAmount: number
    approvedCount: number
    approvedAmount: number
    completedCount: number
    completedAmount: number
    totalDeduction: number
  }
  paymentMethod: {
    wechat: { count: number; amount: number }
    alipay: { count: number; amount: number }
    bank: { count: number; amount: number }
    cash: { count: number; amount: number }
  }
  warehouses: Array<{
    _id: string
    name: string
    code: string
    acquisitionCount: number
    totalWeight: number
    totalAmount: number
  }>
}

export default function Dashboard() {
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (userInfo?.id) {
      loadData()
    }
  }, [userInfo])

  const loadData = async () => {
    try {
      const result = await dashboardApi.getAdminDashboard(userInfo!.id) as any
      if (result.success) {
        setData(result.data)
      } else {
        message.error(result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
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

  if (!data) {
    return <div>暂无数据</div>
  }

  const warehouseColumns = [
    { title: '仓库', dataIndex: 'name', width: 120 },
    { title: '收购次数', dataIndex: 'acquisitionCount', width: 100, align: 'right' as const },
    {
      title: '收购重量',
      dataIndex: 'totalWeight',
      width: 120,
      align: 'right' as const,
      render: (v: number) => `${v.toLocaleString()} kg`,
    },
    {
      title: '收购金额',
      dataIndex: 'totalAmount',
      width: 140,
      align: 'right' as const,
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>仪表盘</h2>

      {/* 签约统计 */}
      <Card title="签约统计" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="签约农户"
              value={data.farmer.count}
              prefix={<UserOutlined />}
              suffix="户"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="签约面积"
              value={data.farmer.totalAcreage}
              precision={1}
              suffix="亩"
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="定金总额"
              value={data.farmer.totalDeposit}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="种苗欠款"
              value={data.farmer.totalSeedDebt}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="农资欠款"
              value={data.farmer.totalAgriculturalDebt}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="预支款"
              value={data.farmer.totalAdvancePayment}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 发苗与收购 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="发苗统计">
            <Row gutter={[24, 24]}>
              <Col span={8}>
                <Statistic
                  title="发苗次数"
                  value={data.seed.count}
                  suffix="次"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="发苗总量"
                  value={data.seed.totalQuantity}
                  precision={2}
                  suffix="万株"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="发苗金额"
                  value={data.seed.totalAmount}
                  precision={2}
                  prefix="¥"
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="收购统计">
            <Row gutter={[24, 24]}>
              <Col span={8}>
                <Statistic
                  title="收购次数"
                  value={data.acquisition.count}
                  prefix={<ShoppingCartOutlined />}
                  suffix="次"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="收购重量"
                  value={data.acquisition.totalWeight}
                  precision={1}
                  suffix="kg"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="收购金额"
                  value={data.acquisition.totalAmount}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 农资与预支 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="农资发放">
            <Row gutter={[24, 24]}>
              <Col span={8}>
                <Statistic
                  title="化肥发放"
                  value={data.agricultural.fertilizerAmount}
                  precision={2}
                  prefix="¥"
                />
                <div style={{ color: '#999', fontSize: 12 }}>{data.agricultural.fertilizerCount} 次</div>
              </Col>
              <Col span={8}>
                <Statistic
                  title="农药发放"
                  value={data.agricultural.pesticideAmount}
                  precision={2}
                  prefix="¥"
                />
                <div style={{ color: '#999', fontSize: 12 }}>{data.agricultural.pesticideCount} 次</div>
              </Col>
              <Col span={8}>
                <Statistic
                  title="农资合计"
                  value={data.agricultural.totalAmount}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="预支款">
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Statistic
                  title="预支次数"
                  value={data.advance.count}
                  prefix={<DollarOutlined />}
                  suffix="次"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="预支总额"
                  value={data.advance.totalAmount}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 结算统计 */}
      <Card title="结算统计" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="待审核"
              value={data.settlement.pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix="笔"
            />
            <div style={{ color: '#faad14', fontSize: 14 }}>¥{data.settlement.pendingAmount.toLocaleString()}</div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="待付款"
              value={data.settlement.approvedCount}
              prefix={<AccountBookOutlined style={{ color: '#1890ff' }} />}
              suffix="笔"
            />
            <div style={{ color: '#1890ff', fontSize: 14 }}>¥{data.settlement.approvedAmount.toLocaleString()}</div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="已完成"
              value={data.settlement.completedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="笔"
            />
            <div style={{ color: '#52c41a', fontSize: 14 }}>¥{data.settlement.completedAmount.toLocaleString()}</div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="累计扣款"
              value={data.settlement.totalDeduction}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="结算总数"
              value={data.settlement.totalCount}
              suffix="笔"
            />
          </Col>
        </Row>
      </Card>

      {/* 付款方式统计 */}
      <Card title="付款方式统计" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="微信"
              value={data.paymentMethod.wechat.amount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#07c160' }}
            />
            <div style={{ color: '#999', fontSize: 12 }}>{data.paymentMethod.wechat.count} 笔</div>
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="支付宝"
              value={data.paymentMethod.alipay.amount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ color: '#999', fontSize: 12 }}>{data.paymentMethod.alipay.count} 笔</div>
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="银行转账"
              value={data.paymentMethod.bank.amount}
              precision={2}
              prefix={<BankOutlined />}
            />
            <div style={{ color: '#999', fontSize: 12 }}>{data.paymentMethod.bank.count} 笔</div>
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="现金"
              value={data.paymentMethod.cash.amount}
              precision={2}
              prefix="¥"
            />
            <div style={{ color: '#999', fontSize: 12 }}>{data.paymentMethod.cash.count} 笔</div>
          </Col>
        </Row>
      </Card>

      {/* 仓库统计 */}
      <Card title="仓库统计">
        <Table
          rowKey="_id"
          columns={warehouseColumns}
          dataSource={data.warehouses}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
