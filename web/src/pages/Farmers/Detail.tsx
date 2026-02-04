import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Table, Button, Spin, Tag, message, Popconfirm, Space, Dropdown, Row, Col, Statistic } from 'antd'
import { ArrowLeftOutlined, PhoneOutlined, EditOutlined, DeleteOutlined, ExperimentOutlined, CheckCircleOutlined, DollarOutlined, ShopOutlined, PlusCircleOutlined, DownOutlined } from '@ant-design/icons'
import { farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import { AdvancePaymentModal, AgriculturalSupplyModal, AddendumModal } from '../../components/BusinessModals'

interface FarmerDetail {
  _id: string
  farmerId: string
  name: string
  phone: string
  idCard: string
  addressText: string
  acreage: number
  grade: string
  deposit: number
  seedTotal: number
  seedDebt: number
  agriculturalDebt: number
  advancePayment: number
  status: string
  createTime: string
  createByName: string
  // 新增字段 - 与小程序对齐
  receivableAmount: number      // 签约金额/应收款
  fertilizerAmount: number      // 化肥金额
  pesticideAmount: number       // 农药金额
  firstManager: string          // 负责人
  seedDistributionComplete: boolean  // 发苗完成状态
}

interface SeedStats {
  recordCount: number           // 发苗次数
  totalQuantity: number         // 发苗数量(万株)
  totalArea: number             // 发放面积(亩)
  totalAmount: number           // 苗款金额
}

interface BusinessRecord {
  _id: string
  type: string
  createTime: string
  amount?: number
  totalAmount?: number
  remark?: string
}

const TYPE_NAMES: Record<string, string> = {
  seed: '种苗发放',
  fertilizer: '化肥发放',
  pesticide: '农药发放',
  advance: '预付款',
  addendum: '追加签约',
  acquisition: '收购入库',
  settlement: '结算',
  payment: '结算付款',
}

export default function FarmerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null)
  const [records, setRecords] = useState<BusinessRecord[]>([])
  const [seedStats, setSeedStats] = useState<SeedStats>({
    recordCount: 0,
    totalQuantity: 0,
    totalArea: 0,
    totalAmount: 0
  })

  // 业务操作弹窗状态
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false)
  const [agriModalVisible, setAgriModalVisible] = useState(false)
  const [addendumModalVisible, setAddendumModalVisible] = useState(false)

  useEffect(() => {
    if (id) {
      loadDetail(id)
    }
  }, [id])

  const loadDetail = async (farmerId: string) => {
    setLoading(true)
    try {
      const [detailRes, recordsRes, seedRes] = await Promise.all([
        farmerApi.get(farmerId),
        farmerApi.getBusinessRecords(farmerId),
        farmerApi.getSeedStats(farmerId),
      ]) as any[]

      if (detailRes.success) {
        setFarmer(detailRes.data)
      }
      if (recordsRes.success) {
        setRecords(recordsRes.data.list || [])
      }
      if (seedRes?.success && seedRes.data) {
        setSeedStats({
          recordCount: seedRes.data.recordCount || 0,
          totalQuantity: seedRes.data.totalQuantity || 0,
          totalArea: seedRes.data.totalArea || 0,
          totalAmount: seedRes.data.totalAmount || 0,
        })
      }
    } catch (error) {
      console.error('加载农户详情失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !userInfo) return
    setDeleting(true)
    try {
      const result = await farmerApi.delete(userInfo.id, id) as any
      if (result.success) {
        message.success('删除成功')
        navigate('/farmers')
      } else {
        message.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除农户失败:', error)
      message.error('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const handleMarkSeedComplete = async (complete: boolean) => {
    if (!id || !userInfo) return
    setMarkingComplete(true)
    try {
      const result = await farmerApi.markSeedComplete(userInfo.id, id, complete) as any
      if (result.success) {
        message.success(complete ? '已标记发苗完成' : '已取消发苗完成标记')
        loadDetail(id)
      } else {
        message.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('标记发苗完成失败:', error)
      message.error('操作失败')
    } finally {
      setMarkingComplete(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!farmer) {
    return <div>农户不存在</div>
  }

  const recordColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => (
        <Tag>{TYPE_NAMES[type] || type}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: BusinessRecord) => {
        const amount = record.totalAmount || record.amount
        return amount ? `¥${amount.toFixed(2)}` : '-'
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/farmers')}
        >
          返回列表
        </Button>
        <Space>
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={() => navigate(`/seeds/new?farmerId=${id}&farmerName=${encodeURIComponent(farmer.name)}`)}
          >
            发苗
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'advance',
                  icon: <DollarOutlined />,
                  label: '预支款登记',
                  onClick: () => setAdvanceModalVisible(true),
                },
                {
                  key: 'agricultural',
                  icon: <ShopOutlined />,
                  label: '农资发放',
                  onClick: () => setAgriModalVisible(true),
                },
                {
                  key: 'addendum',
                  icon: <PlusCircleOutlined />,
                  label: '追加签约',
                  onClick: () => setAddendumModalVisible(true),
                },
              ],
            }}
          >
            <Button>
              业务操作 <DownOutlined />
            </Button>
          </Dropdown>
          {farmer.seedDistributionComplete ? (
            <Popconfirm
              title="取消发苗完成"
              description="确定要取消发苗完成标记吗？"
              onConfirm={() => handleMarkSeedComplete(false)}
              okText="确认"
              cancelText="取消"
            >
              <Button icon={<CheckCircleOutlined />} loading={markingComplete}>
                取消完成
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="标记发苗完成"
              description="确定该农户的发苗已全部完成吗？"
              onConfirm={() => handleMarkSeedComplete(true)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="primary" ghost icon={<CheckCircleOutlined />} loading={markingComplete}>
                标记发苗完成
              </Button>
            </Popconfirm>
          )}
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/farmers/${id}/edit`)}
          >
            编辑农户
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确定要删除该农户吗？"
            onConfirm={handleDelete}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deleting }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>
              删除农户
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="农户编号">{farmer.farmerId}</Descriptions.Item>
          <Descriptions.Item label="姓名">{farmer.name}</Descriptions.Item>
          <Descriptions.Item label="手机号">
            <a href={`tel:${farmer.phone}`}>
              <PhoneOutlined /> {farmer.phone}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label="身份证号">{farmer.idCard}</Descriptions.Item>
          <Descriptions.Item label="种植地址" span={2}>{farmer.addressText}</Descriptions.Item>
          <Descriptions.Item label="等级">
            <Tag color={farmer.grade === 'gold' ? 'gold' : farmer.grade === 'silver' ? 'blue' : 'default'}>
              {farmer.grade === 'gold' ? '金牌农户' : farmer.grade === 'silver' ? '银牌农户' : '铜牌农户'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="负责人">{farmer.firstManager || farmer.createByName || '-'}</Descriptions.Item>
          <Descriptions.Item label="登记时间">{farmer.createTime ? new Date(farmer.createTime).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="签约信息" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="签约面积" value={farmer.acreage || 0} suffix="亩" />
          </Col>
          <Col span={6}>
            <Statistic title="已交定金" value={farmer.deposit || 0} prefix="¥" valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="种苗合计" value={farmer.seedTotal || 0} suffix="万株" />
          </Col>
          <Col span={6}>
            <Statistic title="签约金额" value={farmer.receivableAmount || 0} prefix="¥" valueStyle={{ color: '#fa8c16' }} />
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <span>
            种苗发放
            {farmer.seedDistributionComplete && (
              <Tag color="success" style={{ marginLeft: 12 }}>已完成</Tag>
            )}
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="发苗次数" value={seedStats.recordCount} suffix="次" />
          </Col>
          <Col span={6}>
            <Statistic title="发苗数量" value={seedStats.totalQuantity} suffix="万株" valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title="发放面积" value={seedStats.totalArea} suffix="亩" />
          </Col>
          <Col span={6}>
            <Statistic title="苗款金额" value={seedStats.totalAmount || 0} prefix="¥" valueStyle={{ color: '#fa8c16' }} />
          </Col>
        </Row>
      </Card>

      <Card title="农资发放" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="化肥金额" value={farmer.fertilizerAmount || 0} prefix="¥" valueStyle={{ color: '#13c2c2' }} />
          </Col>
          <Col span={6}>
            <Statistic title="农药金额" value={farmer.pesticideAmount || 0} prefix="¥" valueStyle={{ color: '#eb2f96' }} />
          </Col>
        </Row>
      </Card>

      <Card title="欠款汇总" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="种苗欠款"
              value={seedStats.recordCount > 0 ? (farmer.seedDebt || 0) : 0}
              prefix="¥"
              valueStyle={{ color: farmer.seedDebt > 0 ? '#f5222d' : undefined }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="农资欠款"
              value={farmer.agriculturalDebt || 0}
              prefix="¥"
              valueStyle={{ color: farmer.agriculturalDebt > 0 ? '#f5222d' : undefined }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="预支款"
              value={farmer.advancePayment || 0}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
        </Row>
      </Card>

      <Card title="业务记录">
        <Table
          rowKey="_id"
          columns={recordColumns}
          dataSource={records}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 业务操作弹窗 */}
      <AdvancePaymentModal
        visible={advanceModalVisible}
        farmerId={id || ''}
        farmerName={farmer.name}
        userId={userInfo?.id || ''}
        userName={userInfo?.name || ''}
        onClose={() => setAdvanceModalVisible(false)}
        onSuccess={() => loadDetail(id!)}
      />
      <AgriculturalSupplyModal
        visible={agriModalVisible}
        farmerId={id || ''}
        farmerName={farmer.name}
        userId={userInfo?.id || ''}
        userName={userInfo?.name || ''}
        onClose={() => setAgriModalVisible(false)}
        onSuccess={() => loadDetail(id!)}
      />
      <AddendumModal
        visible={addendumModalVisible}
        farmerId={id || ''}
        farmerName={farmer.name}
        userId={userInfo?.id || ''}
        userName={userInfo?.name || ''}
        onClose={() => setAddendumModalVisible(false)}
        onSuccess={() => loadDetail(id!)}
      />
    </div>
  )
}
