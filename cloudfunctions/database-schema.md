# 普惠农录 - 云数据库设计文档

## 数据库集合（Collections）

### 1. users - 用户表

**集合名称：** `users`

**说明：** 存储系统用户信息（助理、仓库管理员、财务等）

**字段结构：**

```javascript
{
  _id: "auto_generated",           // 自动生成的文档ID
  _openid: "oXXXX",                 // 微信用户唯一标识
  
  // 基本信息
  name: "李助理",                   // 姓名
  phone: "13800138000",             // 手机号
  avatar: "https://xxx.jpg",        // 头像URL
  
  // 角色权限
  role: "assistant",                // 角色：assistant/warehouse/finance/admin
  
  // 仓库信息（仓库管理员专用）
  warehouseId: "WH_LZ",             // 所属仓库ID（仓管必填）
  warehouseName: "梁寨",            // 所属仓库名称
  
  // 状态
  status: "active",                 // 状态：active/inactive/banned
  
  // 时间戳
  createTime: Date,                 // 创建时间
  updateTime: Date,                 // 更新时间
  lastLoginTime: Date               // 最后登录时间
}
```

**索引：**
- `_openid`: 唯一索引
- `phone`: 普通索引
- `role`: 普通索引
- `warehouseId`: 普通索引

---

### 2. warehouses - 仓库表

**集合名称：** `warehouses`

**说明：** 存储仓库基本信息

**字段结构：**

```javascript
{
  _id: "WH_LZ",                     // 仓库ID（自定义）
  
  name: "梁寨",                      // 仓库名称
  code: "LZ",                        // 仓库代码（简称）
  
  // 联系信息
  manager: "老李",                   // 仓库负责人
  phone: "13900139000",              // 联系电话
  address: "河南省新郑市梁寨村",      // 详细地址
  
  // 统计数据
  stats: {
    // 今日数据
    todayAcquisitionCount: 0,        // 今日收购次数
    todayAcquisitionWeight: 0,       // 今日收购重量(kg)
    todayAcquisitionAmount: 0,       // 今日收购金额(元)
    
    // 累计数据
    totalAcquisitionCount: 0,        // 累计收购次数
    totalAcquisitionWeight: 0,       // 累计收购重量(kg)
    totalAcquisitionAmount: 0,       // 累计收购金额(元)
    
    // 库存数据
    currentStock: 0,                 // 当前库存(kg)
    stockStatus: "normal"            // 库存状态：normal/low/high
  },
  
  // 状态
  status: "active",                  // 状态：active/inactive
  
  // 时间戳
  createTime: Date,
  updateTime: Date,
  statsUpdateTime: Date              // 统计数据更新时间
}
```

**索引：**
- `_id`: 主键
- `code`: 唯一索引
- `status`: 普通索引

---

### 3. farmers - 农户档案表

**集合名称：** `farmers`

**说明：** 核心表，存储农户签约信息和统计数据

**字段结构：**

```javascript
{
  _id: "auto_generated",
  farmerId: "FAR_20260116_0001",    // 农户编号（自动生成）
  
  // 基本信息
  name: "张三",                      // 姓名
  phone: "13800138000",              // 手机号
  idCard: "410123199001011234",     // 身份证号
  
  // 种植地址（三级）
  address: {
    county: "新郑市",                // 县/区
    township: "龙湖镇",              // 乡镇（乡+镇合并）
    village: "张庄村"                // 村（去掉组）
  },
  
  // 种植信息
  acreage: 10,                       // 种植面积（亩）
  
  // 农户等级（用于统计各等级占比）
  grade: "gold",                     // 等级：gold(金牌)/silver(银牌)/bronze(铜牌)
  
  // 定金信息
  deposit: 4000,                     // 定金（元）
  
  // 负责人信息（助理）
  firstManager: "李助理",             // 第一负责人（必填）
  firstManagerId: "user_id_123",     // 第一负责人用户ID
  secondManager: "王助理",            // 第二负责人（选填）
  secondManagerId: "user_id_456",    // 第二负责人用户ID（可为空）
  
  // 签约信息
  seedTotal: 9.3,                    // 种苗合计（万株）
  seedUnitPrice: 3000,               // 单价（元/万株）
  receivableAmount: 27900,           // 应收款（元）= seedTotal × seedUnitPrice
  seedDebt: 5000,                    // 种苗欠款（元，默认0）
  
  // 银行账户信息
  bankAccount: "6222 xxxx xxxx 1234", // 银行卡号
  bankName: "中国农业银行",           // 开户行
  accountHolder: "张三",              // 持卡人
  
  // 统计数据（累计）
  stats: {
    // 种苗发放统计
    totalSeedDistributed: 0,         // 累计发放种苗（株）
    totalSeedAmount: 0,              // 累计发苗金额（元）
    seedDistributionCount: 0,        // 发苗次数
    
    // 收购统计
    totalAcquisitionCount: 0,        // 累计收购次数
    totalAcquisitionWeight: 0,       // 累计收购重量（kg）
    totalAcquisitionAmount: 0,       // 累计收购金额（元）
    
    // 结算统计
    totalPaidAmount: 0,              // 累计实付金额（元）
    currentDebt: 5000                // 当前欠款（元）
  },
  
  // 状态
  status: "active",                  // 状态：active/inactive/blacklist
  
  // 时间戳
  createTime: Date,                  // 创建时间
  createBy: "李助理",                // 创建人
  createById: "user_id_123",        // 创建人ID
  updateTime: Date,                  // 更新时间
  lastSeedTime: Date,                // 最后发苗时间
  lastAcquisitionTime: Date,         // 最后收购时间
  firstAcquisitionTime: Date         // 首次收购时间
}
```

**索引：**
- `farmerId`: 唯一索引
- `phone`: 普通索引
- `idCard`: 唯一索引
- `firstManagerId`: 普通索引（用于助理查询自己的农户）
- `status`: 普通索引
- `createTime`: 普通索引（按时间排序）

---

### 4. business_records - 业务记录表

**集合名称：** `business_records`

**说明：** 记录农户相关的业务变更，包括追加签约、追加定金、预付款等

**字段结构：**

```javascript
{
  _id: "auto_generated",
  recordId: "BIZ_20260118_0001",     // 业务记录编号
  
  // 关联信息
  farmerId: "farmer_xxx",            // 农户ID
  farmerName: "张三",                 // 农户姓名（冗余）
  
  // 记录类型
  type: "addendum",                  // 类型：addendum(追加签约) / deposit(追加定金) / advance(预付款) / fertilizer(发放化肥) / pesticide(发放农药)
  
  // ========== 追加签约类型专用字段 ==========
  addedAcreage: 5,                   // 追加面积（亩）
  addedSeedTotal: 4.6,               // 追加种苗（万株）
  addedSeedUnitPrice: 3000,          // 种苗单价（元/万株）
  addedReceivable: 13800,            // 追加应收款（元）
  addedDeposit: 2000,                // 追加定金（元）
  
  // 追加后的累计值（快照，便于追溯）
  snapshotAcreage: 15,               // 追加后总面积
  snapshotDeposit: 6000,             // 追加后总定金
  snapshotSeedTotal: 13.9,           // 追加后总种苗
  snapshotReceivable: 41700,         // 追加后总应收
  
  // ========== 定金/预付款类型专用字段 ==========
  amount: 2000,                      // 金额（元）
  paymentMethod: "cash",             // 支付方式：cash/wechat/transfer
  
  // ========== 发放化肥/农药类型专用字段 ==========
  itemName: "复合肥",                 // 物品名称
  quantity: 10,                      // 数量
  unit: "袋",                        // 单位
  unitPrice: 150,                    // 单价
  totalAmount: 1500,                 // 总金额
  
  // 通用字段
  remark: "二次扩种",                 // 备注
  
  // 操作信息
  createTime: Date,                  // 创建时间
  createBy: "user_xxx",              // 操作人ID
  createByName: "张助理"              // 操作人姓名
}
```

**索引：**
- `recordId`: 唯一索引
- `farmerId`: 普通索引（查询农户的业务记录）
- `type`: 普通索引（按类型筛选）
- `createTime`: 普通索引（按时间排序）
- `createBy`: 普通索引（查询助理的操作记录）

---

### 5. seed_records - 种苗发放记录表

**集合名称：** `seed_records`

**说明：** 记录每次种苗发放的详细信息

**字段结构：**

```javascript
{
  _id: "auto_generated",
  recordId: "SEED_20260116_0001",   // 发放记录编号
  
  // 关联信息
  farmerId: "FAR_20260116_0001",    // 农户ID
  farmerName: "张三",                // 农户姓名（冗余，方便查询）
  farmerPhone: "13800138000",       // 农户电话（冗余）
  
  // 发放信息
  quantity: 80000,                   // 发放数量（株）
  unitPrice: 0.03,                   // 单价（元/株）
  amount: 2400,                      // 已发放金额（元）= quantity × unitPrice
  distributedArea: 8,                // 已发放面积（亩）
  
  // 负责人信息
  managerName: "李助理",             // 发苗负责人（手动输入）
  managerId: "user_id_123",         // 发苗负责人ID（可选，如果是系统用户）
  
  // 其他信息
  distributionDate: "2024-02-15",   // 发放日期
  remark: "首次发苗",                // 备注
  
  // 操作信息
  createTime: Date,                  // 创建时间
  createBy: "李助理",                // 操作人
  createById: "user_id_123"         // 操作人ID
}
```

**索引：**
- `recordId`: 唯一索引
- `farmerId`: 普通索引（查询农户的发放记录）
- `distributionDate`: 普通索引（按日期查询）
- `createById`: 普通索引（查询助理的操作记录）

---

### 5. acquisitions - 收购记录表

**集合名称：** `acquisitions`

**说明：** 核心业务表，记录每次收购的详细信息

**字段结构：**

```javascript
{
  _id: "auto_generated",
  acquisitionId: "ACQ_20260116_0001", // 收购单号
  
  // 农户信息
  farmerId: "FAR_20260116_0001",    // 农户ID
  farmerName: "张三",                // 农户姓名
  farmerPhone: "13800138000",       // 农户电话
  farmerAcreage: 10,                 // 农户种植面积（冗余，用于计算预估重量）
  
  // 仓库信息
  warehouseId: "WH_LZ",             // 仓库ID
  warehouseName: "梁寨",             // 仓库名称
  
  // 预估重量（防止掺假）
  estimatedWeight: 3000,             // 预估收购重量（kg）= farmerAcreage × 300
  
  // 称重数据
  grossWeight: 3500,                 // 手重/毛重（kg）
  tareWeight: 604,                   // 皮重（kg）
  moistureRate: 4.0,                 // 水杂率（%）
  moistureWeight: 115.84,            // 水杂（kg）= (grossWeight - tareWeight) × (moistureRate / 100)
  netWeight: 2780.16,                // 净重（kg）= grossWeight - tareWeight - moistureWeight
  
  // 金额计算
  unitPrice: 18,                     // 单价（元/kg）
  totalAmount: 50042.88,             // 总金额（元）= netWeight × unitPrice
  
  // 差异分析
  weightDifference: -219.84,         // 重量差异（kg）= netWeight - estimatedWeight
  weightDifferenceRate: -7.33,       // 差异率（%）= (weightDifference / estimatedWeight) × 100
  isAbnormal: false,                 // 是否异常（差异率 > 50%）
  
  // 其他信息
  remark: "质量良好",                 // 备注
  photos: [],                        // 现场照片（可选）
  
  // 状态
  status: "confirmed",               // 状态：pending/confirmed/audit_rejected/completed/cancelled
  
  // 审核信息（如果被驳回）
  auditRemark: "",                   // 审核备注
  correctionRemark: "",              // 修正说明
  
  // 操作信息
  acquisitionDate: "2024-09-20",    // 收购日期
  createTime: Date,                  // 创建时间
  createBy: "仓管老李",              // 操作人
  createById: "user_id_789",        // 操作人ID
  confirmTime: Date,                 // 确认时间
  updateTime: Date                   // 更新时间
}
```

**索引：**
- `acquisitionId`: 唯一索引
- `farmerId`: 普通索引
- `warehouseId`: 普通索引
- `acquisitionDate`: 普通索引
- `status`: 普通索引
- `createTime`: 普通索引

---

### 6. settlements - 财务结算单表

**集合名称：** `settlements`

**说明：** 核心财务表，记录结算和支付信息

**字段结构：**

```javascript
{
  _id: "auto_generated",
  settlementId: "STL_20260116_0001", // 结算单号
  acquisitionId: "ACQ_20260116_0001", // 关联收购单号
  
  // 农户信息
  farmerId: "FAR_20260116_0001",    // 农户ID
  farmerName: "张三",                // 农户姓名
  farmerPhone: "13800138000",       // 农户电话
  farmerBankAccount: "6222 xxxx xxxx 1234", // 银行卡号
  farmerBankName: "中国农业银行",    // 开户行
  accountHolder: "张三",             // 持卡人
  
  // 收购信息
  warehouseId: "WH_LZ",             // 仓库ID
  warehouseName: "梁寨",             // 仓库名称
  acquisitionDate: "2024-09-20",    // 收购日期
  netWeight: 2780.16,                // 净重（kg）
  unitPrice: 18,                     // 单价（元/kg）
  
  // 金额计算
  grossAmount: 50042.88,             // 应付总额（元）
  seedDebt: 5000,                    // 种苗欠款（元）
  otherDeductions: 0,                // 其他扣款（元）
  actualPayment: 45042.88,           // 实际应付（元）= grossAmount - seedDebt - otherDeductions
  
  // 审核信息
  auditStatus: "approved",           // 审核状态：pending/approved/rejected
  auditBy: "财务张姐",               // 审核人
  auditById: "user_id_999",         // 审核人ID
  auditTime: Date,                   // 审核时间
  auditRemark: "审核通过",           // 审核备注
  
  // 支付信息
  paymentStatus: "paid",             // 支付状态：unpaid/paying/paid
  paymentMethod: "bank_transfer",    // 支付方式：bank_transfer/cash/other
  paymentBy: "财务张姐",             // 支付人
  paymentById: "user_id_999",       // 支付人ID
  paymentTime: Date,                 // 支付时间
  paymentVoucher: "https://xxx.jpg", // 支付凭证URL
  paymentRemark: "已转账",           // 支付备注
  
  // 状态
  status: "completed",               // 状态：pending_audit/approved/rejected/unpaid/paying/paid/completed/cancelled
  
  // 时间戳
  createTime: Date,                  // 创建时间
  updateTime: Date,                  // 更新时间
  completeTime: Date                 // 完成时间
}
```

**索引：**
- `settlementId`: 唯一索引
- `acquisitionId`: 唯一索引（一个收购单只能有一个结算单）
- `farmerId`: 普通索引
- `warehouseId`: 普通索引
- `auditStatus`: 普通索引
- `paymentStatus`: 普通索引
- `status`: 普通索引
- `createTime`: 普通索引

---

### 7. planting_guidance - 种植指导记录表

**集合名称：** `planting_guidance`

**说明：** 记录助理的种植指导活动

**字段结构：**

```javascript
{
  _id: "auto_generated",
  recordId: "GUID_20260116_0001",   // 指导记录编号
  
  // 关联信息
  farmerId: "FAR_20260116_0001",    // 农户ID
  farmerName: "张三",                // 农户姓名
  
  // 指导内容
  guidanceType: "field_visit",      // 指导类型：field_visit/phone/training/other
  content: "检查甜叶菊生长情况，指导施肥", // 指导内容
  photos: [                          // 现场照片
    "https://xxx/photo1.jpg",
    "https://xxx/photo2.jpg"
  ],
  
  // 问题与建议
  problems: "部分叶片发黄",          // 发现的问题
  suggestions: "建议增加氮肥用量",    // 给出的建议
  
  // 操作信息
  guidanceDate: "2024-05-15",       // 指导日期
  createTime: Date,                  // 创建时间
  createBy: "李助理",                // 操作人
  createById: "user_id_123"         // 操作人ID
}
```

**索引：**
- `farmerId`: 普通索引
- `guidanceDate`: 普通索引
- `createById`: 普通索引

---

### 8. notifications - 消息通知表

**集合名称：** `notifications`

**说明：** 存储系统消息和待办提醒

**字段结构：**

```javascript
{
  _id: "auto_generated",
  
  // 接收人信息
  userId: "user_id_999",            // 接收人ID
  userRole: "finance",               // 接收人角色
  
  // 消息内容
  type: "settlement_created",        // 消息类型：settlement_created/audit_result/payment_complete/etc
  title: "新收购待结算",             // 消息标题
  content: "梁寨仓库收购农户张三的甜叶菊，净重2780.16kg，应付金额4.5043万元，请审核。", // 消息内容
  
  // 关联数据
  data: {                            // 业务数据（JSON）
    settlementId: "STL_20260116_0001",
    farmerName: "张三",
    amount: 45042.88
  },
  
  // 跳转链接
  page: "/pages/finance/settlement-detail/index", // 点击后跳转的页面
  params: {                          // 页面参数
    id: "STL_20260116_0001"
  },
  
  // 状态
  isRead: false,                     // 是否已读
  readTime: Date,                    // 阅读时间
  
  // 优先级
  priority: "normal",                // 优先级：low/normal/high/urgent
  
  // 时间戳
  createTime: Date                   // 创建时间
}
```

**索引：**
- `userId`: 普通索引
- `isRead`: 普通索引
- `createTime`: 普通索引
- 复合索引：`userId + isRead`（查询未读消息）

---

### 9. operation_logs - 操作日志表

**集合名称：** `operation_logs`

**说明：** 记录所有关键操作，用于审计追溯

**字段结构：**

```javascript
{
  _id: "auto_generated",
  
  // 操作人信息
  userId: "user_id_123",            // 操作人ID
  userName: "李助理",                // 操作人姓名
  userRole: "assistant",             // 操作人角色
  
  // 操作信息
  action: "create_farmer",           // 操作类型：create/update/delete/audit/payment/etc
  module: "farmer",                  // 模块：farmer/acquisition/settlement/etc
  targetId: "FAR_20260116_0001",    // 操作对象ID
  targetName: "张三",                // 操作对象名称
  
  // 操作详情
  description: "创建农户档案",       // 操作描述
  before: {},                        // 操作前的数据（JSON，update时记录）
  after: {},                         // 操作后的数据（JSON）
  changes: [                         // 变更字段列表
    { field: "name", oldValue: "张三", newValue: "张三丰" }
  ],
  
  // 其他信息
  ip: "192.168.1.100",              // 操作IP
  device: "iPhone 13",               // 设备信息
  
  // 时间戳
  createTime: Date                   // 操作时间
}
```

**索引：**
- `userId`: 普通索引
- `module`: 普通索引
- `targetId`: 普通索引
- `createTime`: 普通索引

---

## 数据关系图

```
users (用户)
  ↓ 创建/操作
farmers (农户档案) ← 核心
  ↓ 关联
  ├─→ seed_records (种苗发放)
  ├─→ planting_guidance (种植指导)
  └─→ acquisitions (收购记录)
        ↓ 关联
      settlements (结算单)
        ↓ 审核/支付
      operation_logs (操作日志)

warehouses (仓库) ← 统计数据来源于 acquisitions

notifications (消息通知) ← 各个业务流程触发
```

---

## 数据安全规则

**权限控制原则：**

1. **助理（assistant）**
   - 只能查看和操作自己负责的农户（firstManagerId = userId）
   - 可以创建农户、种苗发放、种植指导

2. **仓库管理员（warehouse）**
   - 只能查看和操作自己仓库的数据（warehouseId = user.warehouseId）
   - 可以创建收购记录
   - 可以修正被驳回的收购记录

3. **财务（finance）**
   - 可以查看所有结算单
   - 可以审核和支付
   - 不能修改收购记录的称重数据

4. **管理员（admin）**
   - 可以查看所有数据
   - 可以导出报表

---

## 统计数据更新规则

**农户统计（farmers.stats）：**
- 每次创建 seed_records → 更新 totalSeedDistributed、totalSeedAmount
- 每次创建 acquisitions → 更新 totalAcquisitionCount、totalAcquisitionWeight、totalAcquisitionAmount
- 每次完成支付 → 更新 totalPaidAmount、currentDebt

**仓库统计（warehouses.stats）：**
- 每次创建 acquisitions → 更新今日和累计数据
- 每日0点 → 重置今日数据

---

## 索引优化建议

**高频查询场景：**
1. 助理查询自己的农户列表 → `farmers.firstManagerId`
2. 仓库管理员查询本仓库收购记录 → `acquisitions.warehouseId + acquisitionDate`
3. 财务查询待审核结算单 → `settlements.auditStatus + createTime`
4. 农户查询自己的收购记录 → `acquisitions.farmerId + acquisitionDate`

**复合索引建议：**
- `farmers`: `{ firstManagerId: 1, status: 1, createTime: -1 }`
- `acquisitions`: `{ warehouseId: 1, acquisitionDate: -1 }`
- `settlements`: `{ auditStatus: 1, createTime: -1 }`
- `notifications`: `{ userId: 1, isRead: 1, createTime: -1 }`
