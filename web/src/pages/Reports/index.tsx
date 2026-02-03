import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, DatePicker, Space, Button, Spin, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { settlementApi, acquisitionApi } from '../../services/cloudbase'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ])
  const [stats, setStats] = useState({
    totalAcquisitionAmount: 0,
    totalAcquisitionWeight: 0,
    totalAcquisitionCount: 0,
    totalSettlementAmount: 0,
    totalSettlementCount: 0,
    totalDeduction: 0,
  })
  const [dailyStats, setDailyStats] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')

      const [settlementRes, acquisitionRes] = await Promise.all([
        settlementApi.getStatistics({ startDate, endDate }),
        acquisitionApi.getStats({ startDate, endDate }),
      ]) as any[]

      // 处理结算统计
      if (settlementRes.success && settlementRes.data) {
        const { summary, dailyStats: daily } = settlementRes.data
        setStats((prev) => ({
          ...prev,
          totalSettlementAmount: summary?.totalActualPayment || 0,
          totalSettlementCount: summary?.totalCount || 0,
          totalDeduction: summary?.totalDeduction || 0,
          totalAcquisitionAmount: summary?.totalAcquisitionAmount || prev.totalAcquisitionAmount,
        }))
        setDailyStats(daily || [])
      }

      // 处理收购统计
      if (acquisitionRes.success) {
        setStats((prev) => ({
          ...prev,
          totalAcquisitionAmount: acquisitionRes.data?.totalAmount || 0,
          totalAcquisitionWeight: acquisitionRes.data?.totalWeight || 0,
          totalAcquisitionCount: acquisitionRes.data?.totalCount || 0,
        }))
      }
    } catch (error) {
      console.error('加载报表数据失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0], dates[1]])
    }
  }

  const handleExport = () => {
    // 导出为 CSV
    const headers = ['日期', '结算笔数', '货款金额', '扣款金额', '实付金额']
    const rows = dailyStats.map((s) => [
      s.date,
      s.count,
      s.acquisitionAmount?.toFixed(2) || '0.00',
      s.deduction?.toFixed(2) || '0.00',
      s.actualPayment?.toFixed(2) || '0.00',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `结算报表_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.csv`
    link.click()

    message.success('导出成功')
  }

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 120,
    },
    {
      title: '结算笔数',
      dataIndex: 'count',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '货款金额',
      dataIndex: 'acquisitionAmount',
      width: 140,
      align: 'right' as const,
      render: (val: number) => `¥${(val || 0).toFixed(2)}`,
    },
    {
      title: '扣款金额',
      dataIndex: 'deduction',
      width: 140,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ color: '#f5222d' }}>-¥{(val || 0).toFixed(2)}</span>
      ),
    },
    {
      title: '实付金额',
      dataIndex: 'actualPayment',
      width: 140,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{(val || 0).toFixed(2)}</span>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>报表中心</h2>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            allowClear={false}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="收购总量"
              value={stats.totalAcquisitionWeight}
              precision={1}
              suffix="kg"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="收购金额"
              value={stats.totalAcquisitionAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="结算笔数"
              value={stats.totalSettlementCount}
              suffix="笔"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="结算金额"
              value={stats.totalSettlementAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="每日结算明细">
        <Table
          rowKey="date"
          columns={columns}
          dataSource={dailyStats}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
