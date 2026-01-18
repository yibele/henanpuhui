# 普惠农录 - 云函数开发指南

## 📁 目录结构

```
cloudfunctions/
├── database-schema.md          # 数据库设计文档
├── database-init.js            # 数据库初始化脚本
├── farmer-manage/              # 农户管理云函数
│   ├── index.js
│   └── package.json
├── acquisition-manage/         # 收购管理云函数
│   ├── index.js
│   └── package.json
└── settlement-manage/          # 结算管理云函数
    ├── index.js
    └── package.json
```

---

## 🚀 部署步骤

### 1. 开通云开发

1. 登录[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开小程序项目
3. 点击工具栏的"云开发"按钮
4. 创建云开发环境（建议创建两个环境：dev 开发环境、prod 生产环境）
5. 等待环境初始化完成

### 2. 初始化数据库

**方式一：使用云函数初始化（推荐）**

1. 右键点击 `cloudfunctions` 文件夹
2. 选择"新建 Node.js 云函数"
3. 命名为 `database-init`
4. 将 `database-init.js` 的内容复制到云函数中
5. 右键点击 `database-init` 文件夹，选择"上传并部署：云端安装依赖"
6. 部署完成后，右键点击 `database-init`，选择"云函数测试"
7. 点击"调用"，查看日志，确认初始化成功

**方式二：手动创建集合（备选）**

在云开发控制台 → 数据库 → 添加集合，创建以下集合：
- `users` - 用户表
- `warehouses` - 仓库表
- `farmers` - 农户档案表
- `seed_records` - 种苗发放记录表
- `acquisitions` - 收购记录表
- `settlements` - 结算单表
- `planting_guidance` - 种植指导记录表
- `notifications` - 消息通知表
- `operation_logs` - 操作日志表

### 3. 创建数据库索引

在云开发控制台 → 数据库 → 选择对应集合 → 索引管理，按照 `database-schema.md` 中的索引配置创建索引。

**重要索引（必须创建）：**

**farmers 集合：**
```json
{
  "name": "farmerId_unique",
  "keys": [{ "name": "farmerId", "direction": "asc" }],
  "unique": true
}
```
```json
{
  "name": "idCard_unique",
  "keys": [{ "name": "idCard", "direction": "asc" }],
  "unique": true
}
```

**acquisitions 集合：**
```json
{
  "name": "acquisitionId_unique",
  "keys": [{ "name": "acquisitionId", "direction": "asc" }],
  "unique": true
}
```

**settlements 集合：**
```json
{
  "name": "settlementId_unique",
  "keys": [{ "name": "settlementId", "direction": "asc" }],
  "unique": true
}
```
```json
{
  "name": "acquisitionId_unique",
  "keys": [{ "name": "acquisitionId", "direction": "asc" }],
  "unique": true
}
```

### 4. 部署云函数

依次部署三个核心云函数：

**部署 farmer-manage：**
1. 右键点击 `cloudfunctions/farmer-manage` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

**部署 acquisition-manage：**
1. 右键点击 `cloudfunctions/acquisition-manage` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

**部署 settlement-manage：**
1. 右键点击 `cloudfunctions/settlement-manage` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

### 5. 配置云函数权限

在 `project.config.json` 中添加云函数权限配置：

```json
{
  "cloudfunctionRoot": "cloudfunctions/",
  "cloudfunctionConfig": {
    "permissions": {
      "openapi": [
        "subscribeMessage.send",
        "templateMessage.send"
      ]
    }
  }
}
```

---

## 📝 云函数使用说明

### 1. farmer-manage（农户管理）

#### 创建农户

```javascript
wx.cloud.callFunction({
  name: 'farmer-manage',
  data: {
    action: 'create',
    name: '张三',
    phone: '13800138000',
    idCard: '410123199001011234',
    address: {
      county: '新郑市',
      township: '龙湖镇',
      village: '张庄村'
    },
    acreage: 10,
    firstManager: '李助理',
    secondManager: '王助理',
    seedTotal: 9.3,
    seedUnitPrice: 3000,
    receivableAmount: 27900,
    seedDebt: 5000,
    bankAccount: '6222 xxxx xxxx 1234',
    bankName: '中国农业银行',
    accountHolder: '张三'
  },
  success: res => {
    console.log('创建成功', res.result);
    // res.result.data.farmerId 是农户ID
  },
  fail: err => {
    console.error('创建失败', err);
  }
});
```

#### 获取农户详情

```javascript
wx.cloud.callFunction({
  name: 'farmer-manage',
  data: {
    action: 'get',
    farmerId: 'FAR_20260116_0001'
  },
  success: res => {
    console.log('农户信息', res.result.data);
  }
});
```

#### 获取农户列表

```javascript
wx.cloud.callFunction({
  name: 'farmer-manage',
  data: {
    action: 'list',
    page: 1,
    pageSize: 20,
    keyword: '张三',    // 可选：搜索关键词
    status: 'active',   // 可选：筛选状态
    managerId: ''       // 可选：筛选负责人
  },
  success: res => {
    console.log('农户列表', res.result.data);
    // res.result.data.list 是农户数组
    // res.result.data.total 是总数
  }
});
```

#### 更新农户信息

```javascript
wx.cloud.callFunction({
  name: 'farmer-manage',
  data: {
    action: 'update',
    farmerId: 'FAR_20260116_0001',
    updateData: {
      phone: '13900139000',
      acreage: 12,
      seedDebt: 3000
    }
  },
  success: res => {
    console.log('更新成功', res.result);
  }
});
```

---

### 2. acquisition-manage（收购管理）

#### 创建收购记录

```javascript
wx.cloud.callFunction({
  name: 'acquisition-manage',
  data: {
    action: 'create',
    farmerId: 'FAR_20260116_0001',
    grossWeight: 3500,      // 手重（kg）
    tareWeight: 604,        // 皮重（kg）
    moistureRate: 4.0,      // 水杂率（%）
    unitPrice: 18,          // 单价（元/kg）
    remark: '质量良好'
  },
  success: res => {
    console.log('收购成功', res.result);
    // res.result.data.acquisitionId 是收购单号
    // res.result.data.settlementId 是结算单号
    wx.showToast({
      title: '收购登记成功',
      icon: 'success'
    });
  },
  fail: err => {
    console.error('收购失败', err);
    wx.showToast({
      title: err.errMsg || '收购登记失败',
      icon: 'none'
    });
  }
});
```

#### 获取收购列表

```javascript
wx.cloud.callFunction({
  name: 'acquisition-manage',
  data: {
    action: 'list',
    page: 1,
    pageSize: 20,
    warehouseId: 'WH_LZ',   // 可选：筛选仓库
    farmerId: '',           // 可选：筛选农户
    startDate: '2026-01-01', // 可选：开始日期
    endDate: '2026-01-31',   // 可选：结束日期
    status: 'confirmed'      // 可选：筛选状态
  },
  success: res => {
    console.log('收购列表', res.result.data);
  }
});
```

---

### 3. settlement-manage（结算管理）

#### 获取结算单列表

```javascript
wx.cloud.callFunction({
  name: 'settlement-manage',
  data: {
    action: 'list',
    page: 1,
    pageSize: 20,
    auditStatus: 'pending',     // 可选：筛选审核状态
    paymentStatus: 'unpaid',    // 可选：筛选支付状态
    warehouseId: 'WH_LZ'        // 可选：筛选仓库
  },
  success: res => {
    console.log('结算单列表', res.result.data);
  }
});
```

#### 审核结算单（通过）

```javascript
wx.cloud.callFunction({
  name: 'settlement-manage',
  data: {
    action: 'audit',
    settlementId: 'STL_20260116_0001',
    approved: true,
    auditRemark: '审核通过'
  },
  success: res => {
    wx.showToast({
      title: '审核通过',
      icon: 'success'
    });
  }
});
```

#### 审核结算单（驳回）

```javascript
wx.cloud.callFunction({
  name: 'settlement-manage',
  data: {
    action: 'audit',
    settlementId: 'STL_20260116_0001',
    approved: false,
    auditRemark: '净重与预估重量差异过大，请核实'
  },
  success: res => {
    wx.showToast({
      title: '已驳回',
      icon: 'success'
    });
  }
});
```

#### 标记支付中

```javascript
wx.cloud.callFunction({
  name: 'settlement-manage',
  data: {
    action: 'markPayment',
    settlementId: 'STL_20260116_0001',
    paymentMethod: 'bank_transfer'  // bank_transfer/cash/other
  },
  success: res => {
    wx.showToast({
      title: '已标记为支付中',
      icon: 'success'
    });
  }
});
```

#### 完成支付

```javascript
// 1. 先上传支付凭证图片到云存储
wx.cloud.uploadFile({
  cloudPath: `payment-vouchers/${Date.now()}.jpg`,
  filePath: tempFilePath, // 本地临时文件路径
  success: uploadRes => {
    // 2. 完成支付
    wx.cloud.callFunction({
      name: 'settlement-manage',
      data: {
        action: 'completePayment',
        settlementId: 'STL_20260116_0001',
        paymentVoucher: uploadRes.fileID,
        paymentRemark: '已转账'
      },
      success: res => {
        wx.showToast({
          title: '支付完成',
          icon: 'success'
        });
      }
    });
  }
});
```

---

## 🔐 权限控制说明

### 角色权限

**assistant（助理）：**
- ✅ 创建/查看/修改自己负责的农户
- ✅ 创建种苗发放记录
- ✅ 创建种植指导记录
- ❌ 不能查看其他助理的农户
- ❌ 不能创建收购记录
- ❌ 不能审核结算

**warehouse（仓库管理员）：**
- ✅ 查看所有农户（只读）
- ✅ 创建收购记录
- ✅ 查看本仓库的收购记录和结算单
- ✅ 修正被驳回的收购记录
- ❌ 不能创建农户
- ❌ 不能审核结算
- ❌ 不能查看其他仓库的数据

**finance（财务）：**
- ✅ 查看所有结算单
- ✅ 审核结算单
- ✅ 支付款项
- ✅ 查看所有收购记录（只读）
- ❌ 不能修改收购记录的称重数据

**admin（管理员）：**
- ✅ 所有权限

---

## ⚠️ 重要提示

### 1. 云函数超时

默认云函数超时时间为 3 秒，如果业务逻辑复杂，可以在云函数配置中增加超时时间：

在云开发控制台 → 云函数 → 选择对应函数 → 配置 → 超时时间，修改为 10 秒或 20 秒。

### 2. 并发限制

免费版云开发有并发限制（1000 次/秒），如果用户量大，需要升级套餐。

### 3. 数据库读写

- 单次读取最多 100 条记录，如需更多数据，使用分页
- 单次写入最多 100 条记录
- 云函数中可以突破 20 条的限制

### 4. 日志调试

在云开发控制台 → 云函数 → 日志，可以查看云函数的调用日志和错误信息。

### 5. 安全规则

建议在云开发控制台 → 数据库 → 权限设置，将所有集合的权限设置为"仅创建者及管理员可读写"，所有数据操作通过云函数进行，确保数据安全。

---

## 🧪 测试云函数

### 在开发者工具中测试

1. 右键点击云函数文件夹
2. 选择"云函数测试"
3. 输入测试数据（JSON 格式）
4. 点击"调用"
5. 查看返回结果和日志

### 测试数据示例

**测试 farmer-manage（创建农户）：**

```json
{
  "action": "create",
  "name": "测试农户",
  "phone": "13800138888",
  "idCard": "410123199001019999",
  "address": {
    "county": "新郑市",
    "township": "龙湖镇",
    "village": "测试村"
  },
  "acreage": 10,
  "firstManager": "测试助理",
  "secondManager": "",
  "seedTotal": 10,
  "seedUnitPrice": 3000,
  "receivableAmount": 30000,
  "seedDebt": 0
}
```

---

## 📊 性能优化建议

### 1. 数据库查询优化

- 为常用查询字段创建索引
- 使用复合索引优化多条件查询
- 避免使用正则表达式（性能较差）

### 2. 云函数优化

- 减少数据库查询次数
- 使用批量操作代替循环操作
- 合理使用缓存

### 3. 前端优化

- 使用分页加载，避免一次性加载大量数据
- 合理使用缓存，减少重复请求
- 使用防抖和节流优化频繁操作

---

## 📞 技术支持

如有问题，请参考：
- [微信小程序云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [云函数开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/functions.html)
- [云数据库文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database.html)

---

**祝开发顺利！🎉**
