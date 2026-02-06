import { useState, useEffect } from 'react'
import { Row, Col, Spin, message, Tooltip } from 'antd'
import { 
  UserOutlined, 
  ShopOutlined, 
  AccountBookOutlined, 
  PayCircleOutlined, 
  InfoCircleOutlined,
  ExperimentOutlined,
  GoldOutlined
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
    totalSeedTotal: number
    totalReceivable: number
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="正在加载数据..." />
      </div>
    )
  }

  if (!data) {
    return <div>暂无数据</div>
  }

  // 图表数据准备
  const settlementChartData = [
    { type: '待审核', value: data.settlement.pendingCount },
    { type: '待付款', value: data.settlement.approvedCount },
    { type: '已完成', value: data.settlement.completedCount },
  ].filter(d => d.value > 0)

  const paymentChartData = [
    { type: '微信支付', value: data.paymentMethod.wechat?.amount || 0 },
    { type: '支付宝', value: data.paymentMethod.alipay?.amount || 0 },
    { type: '银行转账', value: data.paymentMethod.bank?.amount || 0 },
    { type: '现金', value: data.paymentMethod.cash?.amount || 0 },
  ].filter(d => d.value > 0)
  
  const warehouseChartData = data.warehouses.map(w => ({
    name: w.name,
    weight: w.totalWeight,
    amount: w.totalAmount
  })).sort((a, b) => b.weight - a.weight)

  // 图表配置
  const pieConfig = {
    appendPadding: 10,
    radius: 0.8,
    innerRadius: 0.6,
    angleField: 'value',
    colorField: 'type',
    label: {
      type: 'inner',
      offset: '-50%',
      content: '{value}',
      style: {
        textAlign: 'center',
        fontSize: 14,
      },
    },
    interactions: [{ type: 'element-active' }],
    legend: {
      position: 'bottom' as const,
    },
  }

  const columnConfig = {
    xField: 'name',
    yField: 'weight',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    meta: {
      name: { alias: '仓库' },
      weight: { alias: '收购重量(kg)' },
    },
    color: '#1890ff',
  }

  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <h1 className="welcome-title">早安，{userInfo?.name} 👋</h1>
        <p className="welcome-subtitle">
          今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          ，这是目前的经营概览。
        </p>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <div className="modern-card overview-stat-card">
            <div>
              <div className="card-header-flex">
                <span className="card-title">签约农户</span>
                <div className="card-title-icon bg-blue-light"><UserOutlined className="text-blue" /></div>
              </div>
              <div className="overview-value">{data.farmer.count} <span style={{fontSize: 14, color: '#999', fontWeight: 400}}>户</span></div>
              <div className="overview-label">签约总面积 {(data.farmer.totalAcreage || 0).toFixed(1)} 亩</div>
            </div>
            <div className="overview-footer">
              <span>预计营收</span>
              <span className="footer-value">¥{(data.farmer.totalReceivable || 0).toLocaleString()}</span>
            </div>
          </div>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <div className="modern-card overview-stat-card">
            <div>
              <div className="card-header-flex">
                <span className="card-title">收购总量</span>
                <div className="card-title-icon bg-purple-light"><ShopOutlined className="text-purple" /></div>
              </div>
              <div className="overview-value">{(data.acquisition.totalWeight || 0).toLocaleString()} <span style={{fontSize: 14, color: '#999', fontWeight: 400}}>kg</span></div>
              <div className="overview-label">总共收购 {data.acquisition.count} 次</div>
            </div>
            <div className="overview-footer">
              <span>收购总额</span>
              <span className="footer-value">¥{(data.acquisition.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="modern-card overview-stat-card">
            <div>
              <div className="card-header-flex">
                <span className="card-title">已付金额</span>
                <div className="card-title-icon bg-green-light"><AccountBookOutlined className="text-green" /></div>
              </div>
              <div className="overview-value text-green">¥{(data.settlement.completedAmount || 0).toLocaleString()}</div>
              <div className="overview-label">已完成 {data.settlement.completedCount} 笔结算</div>
            </div>
            <div className="overview-footer">
              <span>已收定金</span>
              <span className="footer-value text-green">¥{(data.farmer.totalDeposit || 0).toLocaleString()}</span>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="modern-card overview-stat-card">
            <div>
              <div className="card-header-flex">
                <span className="card-title">
                  待办事项
                  <Tooltip title="包括待审核和待付款的结算单"><InfoCircleOutlined style={{fontSize: 12, color: '#ccc', marginLeft: 4}} /></Tooltip>
                </span>
                <div className="card-title-icon bg-orange-light"><PayCircleOutlined className="text-orange" /></div>
              </div>
              <div className="overview-value text-orange">{data.settlement.pendingCount + data.settlement.approvedCount} <span style={{fontSize: 14, color: '#999', fontWeight: 400}}>笔</span></div>
              <div className="overview-label">待处理金额 ¥{(data.settlement.pendingAmount + data.settlement.approvedAmount).toLocaleString()}</div>
            </div>
            <div className="overview-footer">
              <span>农户总欠款</span>
              <span className="footer-value text-red">¥{(data.farmer.totalSeedDebt + data.farmer.totalAgriculturalDebt).toLocaleString()}</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <div className="modern-card">
            <div className="card-header-flex">
              <span className="card-title">结算状态分布</span>
            </div>
            <div style={{ height: 260 }}>
              {settlementChartData.length > 0 ? (
                // @ts-ignore
                <Pie {...pieConfig} data={settlementChartData} />
              ) : (
                <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#ccc' }}>暂无数据</div>
              )}
            </div>
          </div>
        </Col>
        
        <Col xs={24} lg={8}>
          <div className="modern-card">
            <div className="card-header-flex">
              <span className="card-title">支付方式占比 (金额)</span>
            </div>
            <div style={{ height: 260 }}>
              {paymentChartData.length > 0 ? (
                // @ts-ignore
                <Pie {...pieConfig} data={paymentChartData} />
              ) : (
                <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#ccc' }}>暂无数据</div>
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div className="modern-card">
            <div className="card-header-flex">
              <span className="card-title">各仓库收购量排行</span>
            </div>
            <div style={{ height: 260 }}>
              {warehouseChartData.length > 0 ? (
                // @ts-ignore
                <Column {...columnConfig} data={warehouseChartData} />
              ) : (
                <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#ccc' }}>暂无数据</div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* 详细数据概览 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <div className="modern-card">
            <div className="card-header-flex">
              <span className="card-title"><ExperimentOutlined /> 种苗与农资</span>
            </div>
            <div className="stats-grid-container">
              <div className="mini-stat-item">
                <div className="mini-stat-value text-blue">{(data.seed.totalQuantity || 0).toFixed(1)} <span style={{fontSize: 12}}>万株</span></div>
                <div className="mini-stat-label">已发种苗</div>
              </div>
              <div className="mini-stat-item">
                <div className="mini-stat-value">¥{(data.seed.totalAmount || 0).toLocaleString()}</div>
                <div className="mini-stat-label">苗款总额</div>
              </div>
              <div className="mini-stat-item">
                <div className="mini-stat-value text-green">{data.agricultural.fertilizerCount + data.agricultural.pesticideCount} <span style={{fontSize: 12}}>次</span></div>
                <div className="mini-stat-label">农资发放次数</div>
              </div>
              <div className="mini-stat-item">
                <div className="mini-stat-value">¥{(data.agricultural.totalAmount || 0).toLocaleString()}</div>
                <div className="mini-stat-label">农资总额</div>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className="modern-card">
            <div className="card-header-flex">
              <span className="card-title"><GoldOutlined /> 资金与风控</span>
            </div>
            <div className="stats-grid-container">
              <div className="mini-stat-item">
                <div className="mini-stat-value text-orange">¥{(data.farmer.totalAdvancePayment || 0).toLocaleString()}</div>
                <div className="mini-stat-label">预支款总额</div>
              </div>
              <div className="mini-stat-item">
                <div className="mini-stat-value text-red">¥{(data.farmer.totalSeedDebt || 0).toLocaleString()}</div>
                <div className="mini-stat-label">种苗欠款</div>
              </div>
              <div className="mini-stat-item">
                <div className="mini-stat-value text-red">¥{(data.farmer.totalAgriculturalDebt || 0).toLocaleString()}</div>
                <div className="mini-stat-label">农资欠款</div>
              </div>
              <div className="mini-stat-item">
                <div className="mini-stat-value text-green">¥{(data.settlement.totalDeduction || 0).toLocaleString()}</div>
                <div className="mini-stat-label">结算累计扣回</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}