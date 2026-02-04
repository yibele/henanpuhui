import { useState, useEffect } from 'react'
import { Row, Col, Spin, Table, message } from 'antd'
import {
  UserOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  PropertySafetyOutlined
} from '@ant-design/icons'
import { Pie, Column } from '@ant-design/charts'
import { dashboardApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import './Dashboard.css'

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

// 统计卡片组件
const StatCard = ({ 
  title, 
  value, 
  prefix = '', 
  suffix = '', 
  icon, 
  theme = 'blue',
  footerValue = '',
  footerLabel = ''
}: {
  title: string
  value: number | string
  prefix?: React.ReactNode
  suffix?: string
  icon: React.ReactNode
  theme?: 'blue' | 'green' | 'gold' | 'red' | 'purple' | 'cyan' | 'orange'
  footerValue?: string | React.ReactNode
  footerLabel?: string
}) => (
  <div className={`stat-card theme-${theme}`}>
    <div className="stat-header">
      <span className="stat-title">{title}</span>
      <div className="stat-icon">{icon}</div>
    </div>
    <div className="stat-content">
      {typeof prefix === 'string' ? <span className="stat-unit" style={{ marginRight: 2, alignSelf: 'center' }}>{prefix}</span> : prefix}
      <span className="stat-value">{value}</span>
      {suffix && <span className="stat-unit" style={{ alignSelf: 'flex-end', marginBottom: 4 }}>{suffix}</span>}
    </div>
    {(footerValue || footerLabel) && (
      <div className="stat-footer">
        <span>{footerLabel}</span>
        <span style={{ fontWeight: 500, color: '#1f1f1f' }}>{footerValue}</span>
      </div>
    )}
  </div>
)

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="正在加载数据..." />
      </div>
    )
  }

  if (!data) {
    return <div>暂无数据</div>
  }

  const warehouseColumns = [
    { 
      title: '仓库名称', 
      dataIndex: 'name',
      render: (text: string, record: any) => (
        <span>{text} <span style={{ color: '#999', fontSize: 12 }}>({record.code})</span></span>
      )
    },
    { 
      title: '收购次数', 
      dataIndex: 'acquisitionCount', 
      align: 'right' as const,
      sorter: (a: any, b: any) => a.acquisitionCount - b.acquisitionCount,
    },
    {
      title: '收购重量',
      dataIndex: 'totalWeight',
      align: 'right' as const,
      sorter: (a: any, b: any) => a.totalWeight - b.totalWeight,
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v.toLocaleString()} <span style={{ fontSize: 12, color: '#999' }}>kg</span></span>,
    },
    {
      title: '收购金额',
      dataIndex: 'totalAmount',
      align: 'right' as const,
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{v.toLocaleString()}</span>,
    },
  ]

  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <h1 className="welcome-title">欢迎回来，{userInfo?.name} 👋</h1>
        <p className="welcome-subtitle">今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}，这里是目前的经营状况概览。</p>
      </div>

      {/* 核心指标区域 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="签约农户"
            value={data.farmer.count}
            suffix="户"
            icon={<UserOutlined />}
            theme="blue"
            footerLabel="签约面积"
            footerValue={`${data.farmer.totalAcreage} 亩`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="收购总量"
            value={data.acquisition.totalWeight.toLocaleString()}
            suffix="kg"
            icon={<ShoppingCartOutlined />}
            theme="green"
            footerLabel="收购次数"
            footerValue={`${data.acquisition.count} 次`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="累计发放"
            value={data.settlement.completedAmount.toLocaleString()}
            prefix="¥"
            icon={<BankOutlined />}
            theme="gold"
            footerLabel="待付金额"
            footerValue={`¥${data.settlement.approvedAmount.toLocaleString()}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="农资与欠款"
            value={(data.farmer.totalSeedDebt + data.farmer.totalAgriculturalDebt).toLocaleString()}
            prefix="¥"
            icon={<PropertySafetyOutlined />}
            theme="red"
            footerLabel="预支款"
            footerValue={`¥${data.farmer.totalAdvancePayment.toLocaleString()}`}
          />
        </Col>
      </Row>

      {/* 业务详情区域 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">仓库收购数据对比</span>
            </div>
            <div className="chart-body">
              <Column
                data={data.warehouses.map(w => ({
                  name: w.name,
                  value: w.totalWeight,
                  type: '收购重量(kg)',
                }))}
                xField="name"
                yField="value"
                height={280}
                color="#1890ff"
                label={{
                  position: 'top',
                  formatter: (datum: { value: number }) => `${datum.value.toLocaleString()}`,
                }}
                tooltip={{
                  items: [{ channel: 'y', valueFormatter: (v: number) => `${v.toLocaleString()} kg` }],
                }}
              />
            </div>
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <Row gutter={[0, 20]}>
            <Col span={24}>
              <div className="chart-card">
                <div className="chart-header">
                  <span className="chart-title">结算状态分布</span>
                </div>
                <div className="chart-body">
                  <Pie
                    data={[
                      { type: '待审核', value: data.settlement.pendingCount },
                      { type: '待付款', value: data.settlement.approvedCount },
                      { type: '已完成', value: data.settlement.completedCount },
                    ].filter(item => item.value > 0)}
                    angleField="value"
                    colorField="type"
                    radius={0.8}
                    innerRadius={0.6}
                    height={200}
                    color={['#faad14', '#1890ff', '#52c41a']}
                    legend={{ position: 'bottom' }}
                    tooltip={{
                      items: [{ channel: 'y', valueFormatter: (v: number) => `${v} 笔` }],
                    }}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* 详细数据区域 */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <div className="chart-card">
             <div className="chart-header">
              <span className="chart-title">农资发放详情</span>
            </div>
            <div className="chart-body" style={{ padding: '20px' }}>
              <Row gutter={[16, 16]}>
                 <Col span={8}>
                   <div style={{ textAlign: 'center', padding: '16px 0', background: '#fafafa', borderRadius: 8 }}>
                     <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>发苗总量</div>
                     <div style={{ fontSize: 20, fontWeight: 600, color: '#722ed1' }}>{data.seed.totalQuantity} <span style={{fontSize: 12}}>万株</span></div>
                     <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>金额: ¥{data.seed.totalAmount}</div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div style={{ textAlign: 'center', padding: '16px 0', background: '#fafafa', borderRadius: 8 }}>
                     <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>化肥发放</div>
                     <div style={{ fontSize: 20, fontWeight: 600, color: '#13c2c2' }}>{data.agricultural.fertilizerCount} <span style={{fontSize: 12}}>次</span></div>
                     <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>金额: ¥{data.agricultural.fertilizerAmount}</div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div style={{ textAlign: 'center', padding: '16px 0', background: '#fafafa', borderRadius: 8 }}>
                     <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>农药发放</div>
                     <div style={{ fontSize: 20, fontWeight: 600, color: '#fa8c16' }}>{data.agricultural.pesticideCount} <span style={{fontSize: 12}}>次</span></div>
                     <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>金额: ¥{data.agricultural.pesticideAmount}</div>
                   </div>
                 </Col>
              </Row>
              <div style={{ marginTop: 24 }}>
                <div className="chart-title" style={{ fontSize: 14, marginBottom: 16 }}>付款方式占比</div>
                 <Row gutter={[12, 12]}>
                  {Object.entries(data.paymentMethod).map(([key, val]: [string, any]) => {
                    const methodNames: Record<string, string> = { wechat: '微信', alipay: '支付宝', bank: '银行卡', cash: '现金' };
                    const methodColors: Record<string, string> = { wechat: '#52c41a', alipay: '#1890ff', bank: '#722ed1', cash: '#faad14' };
                    return (
                      <Col span={6} key={key}>
                        <div style={{ borderLeft: `3px solid ${methodColors[key]}`, paddingLeft: 12 }}>
                          <div style={{ fontSize: 12, color: '#999' }}>{methodNames[key]}</div>
                          <div style={{ fontWeight: 600 }}>¥{val.amount > 10000 ? `${(val.amount/10000).toFixed(1)}w` : val.amount}</div>
                        </div>
                      </Col>
                    )
                  })}
                 </Row>
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">各仓库实时数据</span>
            </div>
            <Table
              className="custom-table"
              rowKey="_id"
              columns={warehouseColumns}
              dataSource={data.warehouses}
              pagination={false}
              size="middle"
              scroll={{ y: 240 }}
            />
          </div>
        </Col>
      </Row>
    </div>
  )
}
