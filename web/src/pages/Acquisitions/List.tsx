import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Input, Card, Space, DatePicker, Button } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { acquisitionApi } from '../../services/cloudbase'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface Acquisition {
  _id: string
  acquisitionId: string
  farmerName: string
  farmerPhone: string
  warehouseName: string
  grossWeight: number
  tareWeight: number
  netWeight: number
  unitPrice: number
  amount: number
  createTime: string
}

export default function AcquisitionList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Acquisition[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)

  useEffect(() => {
    loadData()
  }, [page, pageSize, dateRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = { page, pageSize, keyword }
      if (dateRange) {
        params.startDate = dateRange[0]
        params.endDate = dateRange[1]
      }

      const result = await acquisitionApi.list(params) as any

      if (result.success) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
      }
    } catch (error) {
      console.error('加载收购列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const handleDateChange = (dates: any) => {
    if (dates) {
      setDateRange([
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD'),
      ])
    } else {
      setDateRange(null)
    }
    setPage(1)
  }

  const columns: ColumnsType<Acquisition> = [
    {
      title: '收购编号',
      dataIndex: 'acquisitionId',
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
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 120,
    },
    {
      title: '毛重(kg)',
      dataIndex: 'grossWeight',
      width: 100,
      align: 'right',
      render: (val: number) => (val || 0).toFixed(1),
    },
    {
      title: '皮重(kg)',
      dataIndex: 'tareWeight',
      width: 100,
      align: 'right',
      render: (val: number) => (val || 0).toFixed(1),
    },
    {
      title: '净重(kg)',
      dataIndex: 'netWeight',
      width: 100,
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 500 }}>{(val || 0).toFixed(1)}</span>
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 80,
      align: 'right',
      render: (val: number) => `¥${(val || 0).toFixed(2)}`,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (val: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          ¥{(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 160,
      render: (time: string) => time ? dayjs(time).format('MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, record: Acquisition) => (
        <Button type="link" size="small" onClick={() => navigate(`/acquisitions/${record._id}`)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>收购管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/acquisitions/new')}>
          新增收购
        </Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索农户姓名或手机号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 220 }}
            allowClear
          />
          <RangePicker
            onChange={handleDateChange}
            placeholder={['开始日期', '结束日期']}
          />
        </Space>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1200 }}
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
        />
      </Card>
    </div>
  )
}
