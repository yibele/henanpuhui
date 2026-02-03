import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Input, Card, Tag, Space, Tabs } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { settlementApi } from '../../services/cloudbase'
import type { ColumnsType } from 'antd/es/table'

interface Settlement {
  _id: string
  settlementId: string
  farmerName: string
  farmerPhone: string
  acquisitionAmount: number
  totalDeduction: number
  actualPayment: number
  status: string
  createTime: string
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '待付款', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
}

export default function SettlementList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Settlement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [page, pageSize, status])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await settlementApi.list({
        page,
        pageSize,
        keyword,
        status: status || undefined,
      }) as any

      if (result.success) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
      }
    } catch (error) {
      console.error('加载结算列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const handleTabChange = (key: string) => {
    setStatus(key === 'all' ? '' : key)
    setPage(1)
  }

  const columns: ColumnsType<Settlement> = [
    {
      title: '结算编号',
      dataIndex: 'settlementId',
      width: 180,
    },
    {
      title: '农户',
      dataIndex: 'farmerName',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'farmerPhone',
      width: 130,
    },
    {
      title: '货款金额',
      dataIndex: 'acquisitionAmount',
      width: 120,
      align: 'right',
      render: (val: number) => `¥${(val || 0).toFixed(2)}`,
    },
    {
      title: '扣款金额',
      dataIndex: 'totalDeduction',
      width: 120,
      align: 'right',
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#f5222d' : 'inherit' }}>
          ¥{(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '实付金额',
      dataIndex: 'actualPayment',
      width: 120,
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          ¥{(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      render: (s: string) => {
        const config = STATUS_MAP[s] || { text: '未知', color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
  ]

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '待付款' },
    { key: 'completed', label: '已完成' },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>结算管理</h2>
      <Card>
        <Tabs items={tabItems} onChange={handleTabChange} />
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索农户姓名或手机号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
        </Space>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/settlements/${record._id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  )
}
