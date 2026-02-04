import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Card, Button, DatePicker, Space, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { seedApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface SeedRecord {
  _id: string
  recordId: string
  farmerId: string
  farmerName: string
  farmerPhone: string
  quantity: number
  distributedArea: number
  unitPrice: number
  amount: number
  distributionDate: string
  createByName: string
  createTime: string
  remark?: string
  distributionStatus?: 'distributed' | 'inProgress' | 'completed'
}

export default function SeedList() {
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SeedRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  useEffect(() => {
    loadData()
  }, [page, pageSize])

  const loadData = async () => {
    if (!userInfo?.id) return
    setLoading(true)
    try {
      const params: any = {
        page,
        pageSize,
        userId: userInfo.id,
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }
      const result = await seedApi.list(params) as any
      console.log('发苗列表API返回:', result)
      if (result.success) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
      } else {
        console.error('API返回失败:', result.message)
      }
    } catch (error) {
      console.error('加载发苗记录失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const columns: ColumnsType<SeedRecord> = [
    {
      title: '记录编号',
      dataIndex: 'recordId',
      width: 180,
    },
    {
      title: '农户姓名',
      dataIndex: 'farmerName',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'farmerPhone',
      width: 130,
    },
    {
      title: '发苗数量',
      dataIndex: 'quantity',
      width: 120,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v} <span style={{ fontSize: 12, color: '#999' }}>万株</span></span>,
    },
    {
      title: '发放面积',
      dataIndex: 'distributedArea',
      width: 100,
      align: 'right',
      render: (v: number) => `${v || 0} 亩`,
    },
    {
      title: '苗款金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) => <span style={{ color: '#fa8c16', fontWeight: 500 }}>¥{(v || 0).toFixed(2)}</span>,
    },
    {
      title: '发放日期',
      dataIndex: 'distributionDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作人',
      dataIndex: 'createByName',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'distributionStatus',
      width: 80,
      align: 'center',
      render: (status: string) => {
        if (status === 'completed') {
          return <Tag color="success">已完成</Tag>
        } else if (status === 'inProgress') {
          return <Tag color="processing">发苗中</Tag>
        } else {
          return <Tag color="default">已发放</Tag>
        }
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>发苗管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/seeds/new')}>
          新增发苗
        </Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            placeholder={['开始日期', '结束日期']}
          />
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
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
            onClick: () => navigate(`/seeds/${record._id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  )
}
