import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Table, Upload, message, Progress, Space, Tag, Result, Tabs } from 'antd'
import { UploadOutlined, InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { read, utils } from 'xlsx'
import { farmerApi } from '../../services/cloudbase'
import { useAuth } from '../../stores/AuthContext'
import type { ColumnsType } from 'antd/es/table'

interface ImportFarmer {
  key: number
  farmerId: string
  name: string
  phone: string
  idCard: string
  address: { county: string; township: string; village: string }
  acreage: number
  firstManager: string
  secondManager: string
  assistantId: string
  errors: string[]
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

// 表头映射：key 为去掉所有空白/换行后的文本
const HEADER_MAP: Record<string, string> = {
  '客户编号': 'farmerId',
  '县（区）': 'county',
  '县(区)': 'county',
  '县': 'county',
  '乡（镇）': 'township',
  '乡(镇)': 'township',
  '乡镇': 'township',
  '村': 'village',
  '姓名': 'name',
  '身份证号码': 'idCard',
  '身份证号': 'idCard',
  '身份证': 'idCard',
  '联系电话': 'phone',
  '电话': 'phone',
  '手机号': 'phone',
  '种植面积（亩）': 'acreage',
  '种植面积(亩)': 'acreage',
  '种植面积': 'acreage',
  '面积': 'acreage',
  '面积（亩）': 'acreage',
  '面积(亩)': 'acreage',
  '负责人': 'firstManager',
  '一级负责人': 'firstManager',
  '二级负责人': 'secondManager',
  '助理ID': 'assistantId',
  '助理': 'assistantId',
  '助理id': 'assistantId',
}

// 将表头去掉所有空白字符后查找映射
function matchHeader(header: string): string | undefined {
  const normalized = header.replace(/\s+/g, '')
  // 先精确匹配去空白后的key
  for (const [key, value] of Object.entries(HEADER_MAP)) {
    if (normalized === key.replace(/\s+/g, '')) {
      return value
    }
  }
  return undefined
}

function validateRow(row: ImportFarmer): string[] {
  const errors: string[] = []
  if (!row.farmerId || !row.farmerId.startsWith('PH')) {
    errors.push('编号须以PH开头')
  }
  if (!row.name || !row.name.trim()) {
    errors.push('姓名为空')
  }
  if (row.phone && !/\d{11}/.test(row.phone)) {
    errors.push('手机号格式错误')
  }
  if (!row.idCard || !/^\d{17}[\dXx]$/.test(row.idCard)) {
    errors.push('身份证号格式错误')
  }
  if (!row.acreage || row.acreage <= 0) {
    errors.push('面积须大于0')
  }
  if (!row.firstManager || !row.firstManager.trim()) {
    errors.push('负责人为空')
  }
  return errors
}

export default function FarmerImport() {
  const navigate = useNavigate()
  const { userInfo } = useAuth()
  const [parsedData, setParsedData] = useState<ImportFarmer[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [filterTab, setFilterTab] = useState<string>('all')

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

        if (jsonData.length === 0) {
          message.warning('表格中没有数据')
          return
        }

        // Map headers to fields
        const rows: ImportFarmer[] = jsonData.map((raw, index) => {
          const mapped: Record<string, any> = {}
          for (const [header, value] of Object.entries(raw)) {
            const fieldName = matchHeader(header)
            if (fieldName) {
              mapped[fieldName] = typeof value === 'string' ? value.trim() : value
            }
          }

          const row: ImportFarmer = {
            key: index,
            farmerId: String(mapped.farmerId || ''),
            name: String(mapped.name || ''),
            phone: String(mapped.phone || ''),
            idCard: String(mapped.idCard || '').toUpperCase(),
            address: {
              county: String(mapped.county || ''),
              township: String(mapped.township || ''),
              village: String(mapped.village || ''),
            },
            acreage: parseFloat(mapped.acreage) || 0,
            firstManager: String(mapped.firstManager || ''),
            secondManager: String(mapped.secondManager || ''),
            assistantId: String(mapped.assistantId || ''),
            errors: [],
          }

          row.errors = validateRow(row)
          return row
        })

        setParsedData(rows)
        setResult(null)
        setFilterTab('all')

        const errorCount = rows.filter(r => r.errors.length > 0).length
        if (errorCount > 0) {
          message.warning(`${rows.length} 条数据已解析，其中 ${errorCount} 条有校验问题`)
        } else {
          message.success(`${rows.length} 条数据已解析，校验全部通过`)
        }
      } catch (err) {
        console.error('解析Excel失败:', err)
        message.error('Excel 解析失败，请检查文件格式')
      }
    }
    reader.readAsArrayBuffer(file)
    return false // prevent upload
  }

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.errors.length === 0)
    if (validRows.length === 0) {
      message.warning('没有可导入的有效数据')
      return
    }

    setImporting(true)
    setProgress(0)

    const batchSize = 50
    let totalImported = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(row => ({
        farmerId: row.farmerId,
        name: row.name,
        phone: row.phone,
        idCard: row.idCard,
        address: row.address,
        acreage: row.acreage,
        firstManager: row.firstManager,
        secondManager: row.secondManager,
        assistantId: row.assistantId,
      }))

      try {
        const res = await farmerApi.batchImport(userInfo?.id || '', batch) as any
        if (res.success) {
          totalImported += res.data?.imported || 0
          totalSkipped += res.data?.skipped || 0
          totalErrors += res.data?.errors || 0
        } else {
          totalErrors += batch.length
          message.error(`第 ${i + 1}-${i + batch.length} 条导入失败: ${res.message}`)
        }
      } catch (err) {
        totalErrors += batch.length
        console.error('批次导入失败:', err)
      }

      setProgress(Math.round(((i + batch.length) / validRows.length) * 100))
    }

    setImporting(false)
    setProgress(100)
    setResult({ imported: totalImported, skipped: totalSkipped, errors: totalErrors })

    if (totalImported > 0) {
      message.success(`导入完成：成功 ${totalImported} 条`)
    }
  }

  const errorCount = parsedData.filter(r => r.errors.length > 0).length
  const validCount = parsedData.length - errorCount

  const columns: ColumnsType<ImportFarmer> = [
    {
      title: '行号',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '编号',
      dataIndex: 'farmerId',
      width: 100,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 80,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      width: 180,
    },
    {
      title: '地址',
      width: 200,
      render: (_: any, record: ImportFarmer) => {
        const { county, township, village } = record.address
        return `${county}${township}${village}`
      },
    },
    {
      title: '面积(亩)',
      dataIndex: 'acreage',
      width: 80,
      align: 'right',
    },
    {
      title: '负责人',
      dataIndex: 'firstManager',
      width: 80,
    },
    {
      title: '二级负责人',
      dataIndex: 'secondManager',
      width: 90,
    },
    {
      title: '助理ID',
      dataIndex: 'assistantId',
      width: 100,
    },
    {
      title: '校验',
      width: 160,
      render: (_: any, record: ImportFarmer) => {
        if (record.errors.length === 0) {
          return <Tag color="success">通过</Tag>
        }
        return (
          <Space direction="vertical" size={0}>
            {record.errors.map((err, i) => (
              <Tag color="error" key={i}>{err}</Tag>
            ))}
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/farmers')} />
          导入农户
        </h2>
      </div>

      {result ? (
        <Card>
          <Result
            status="success"
            title="导入完成"
            subTitle={`成功导入 ${result.imported} 条，跳过 ${result.skipped} 条（身份证重复），失败 ${result.errors} 条`}
            extra={[
              <Button type="primary" key="list" onClick={() => navigate('/farmers')}>
                查看农户列表
              </Button>,
              <Button key="again" onClick={() => { setParsedData([]); setResult(null); setProgress(0) }}>
                继续导入
              </Button>,
            ]}
          />
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Upload.Dragger
              accept=".xlsx,.xls"
              beforeUpload={handleFile}
              showUploadList={false}
              disabled={importing}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽 Excel 文件到此处</p>
              <p className="ant-upload-hint">支持 .xlsx / .xls 格式，表头需包含：客户编号、姓名、身份证号码、联系电话、种植面积（亩）、负责人等</p>
            </Upload.Dragger>
          </Card>

          {parsedData.length > 0 && (
            <Card
              title={`数据预览（共 ${parsedData.length} 条，有效 ${validCount} 条${errorCount > 0 ? `，校验失败 ${errorCount} 条` : ''}）`}
              extra={
                <Space>
                  <Button onClick={() => { setParsedData([]); setProgress(0) }}>清空</Button>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={handleImport}
                    loading={importing}
                    disabled={validCount === 0}
                  >
                    确认导入（{validCount} 条）
                  </Button>
                </Space>
              }
            >
              {importing && (
                <Progress percent={progress} style={{ marginBottom: 16 }} />
              )}

              <Tabs
                activeKey={filterTab}
                onChange={setFilterTab}
                items={[
                  { key: 'all', label: `全部 (${parsedData.length})` },
                  { key: 'error', label: <span style={{ color: errorCount > 0 ? '#ff4d4f' : undefined }}>校验失败 ({errorCount})</span> },
                  { key: 'valid', label: `校验通过 (${validCount})` },
                ]}
              />

              <Table
                rowKey="key"
                columns={columns}
                dataSource={
                  filterTab === 'error'
                    ? parsedData.filter(r => r.errors.length > 0)
                    : filterTab === 'valid'
                      ? parsedData.filter(r => r.errors.length === 0)
                      : parsedData
                }
                size="small"
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
                rowClassName={(record) => record.errors.length > 0 ? 'import-row-error' : ''}
              />

              <style>{`
                .import-row-error td { background: #fff2f0 !important; }
              `}</style>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
