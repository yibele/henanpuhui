# 云函数 API 文档

> 版本：v1.1  
> 更新日期：2026-01-27  
> 状态：与代码同步

本文档记录所有云函数的功能说明、参数和返回值。

---

## 目录

1. [user-manage](#user-manage) - 用户管理
2. [farmer-manage](#farmer-manage) - 农户管理
3. [seed-manage](#seed-manage) - 种苗发放
4. [acquisition-manage](#acquisition-manage) - 收购管理
5. [settlement-manage](#settlement-manage) - 结算管理
6. [dashboard-stats](#dashboard-stats) - 报表统计

---

## user-manage

### action: `login`
用户登录。

**参数：**
- `phone`: string (必填)
- `password`: string (必填)

**返回：**
返回用户信息、角色 (`role`)、以及关联的仓库信息 (`warehouseInfo`，仅限仓管)。

### action: `getUserInfo`
获取当前用户信息。

---

## farmer-manage

### action: `create`
创建农户档案。
**关键逻辑**：校验手机号/身份证唯一性。

### action: `addendum`
**[新增]** 追加签约信息（扩种）。
**参数：**
- `farmerId`: string
- `data.addedAcreage`: number (追加面积)
- `data.addedSeedTotal`: number (追加种苗量)
- `data.addedDeposit`: number (追加定金)

### action: `getBusinessRecords`
**[新增]** 获取农户的业务流水（时间轴）。
**返回**：包含 `seed` (发苗), `addendum` (追加), `acquisition` (收购) 等类型的混合列表。

### action: `list`
获取农户列表。
**权限**：助理只能看到自己创建的农户 (`createBy` 过滤)。

### action: `getStatusStats`
获取农户状态统计（全部/进行中/已完成）。

---

## seed-manage

### action: `distribute`
发放种苗。
**副作用**：
1. 增加 `seed_records` 记录。
2. 累加 `farmers.stats.totalSeedDistributed`。
3. 增加 `farmers.seedDebt` (欠款)。

### action: `update`
更新发苗记录。
**逻辑**：自动计算新旧差值，并同步修正 `farmers.stats`。

### action: `delete`
删除发苗记录。
**逻辑**：自动回滚（减去）农户的领苗量和欠款统计。

### action: `getDistributionStats`
获取全量发苗统计（按农户分组）。

---

## acquisition-manage

### action: `create`
创建收购记录。
**参数：**
- `grossWeight`: 毛重
- `tareWeight`: 皮重
- `moistureRate`: 水杂率
- `warehouseId`: 仓库ID

**核心逻辑**：
1. 自动计算净重 = 毛重 - 皮重 - 水杂。
2. **自动生成结算单** (`settlements` 表)，初始状态为 `pending_audit`。
3. 触发风控检测：若 (净重 - 预估产量) / 预估产量 > 50%，标记 `isAbnormal=true`。

### action: `financeUpdate`
**[新增]** 财务强制修改收购记录。
**权限**：仅限 `finance_admin` / `admin`。
**用途**：处理数据录入错误的紧急修正。

### action: `delete`
删除收购记录。
**逻辑**：软删除 (`status: deleted`)，并回滚仓库和农户的统计数据。

---

## settlement-manage

### action: `audit`
审核结算单。
**参数：**
- `settlementId`: string
- `approved`: boolean (true通过/false驳回)
- `auditRemark`: string

**逻辑**：
- 通过：状态变更为 `unpaid` (待支付)，通知仓管。
- 驳回：状态变更为 `rejected`，关联收购单变为 `audit_rejected`，通知仓管修正。

### action: `recalculate`
**[重要]** 重新计算结算金额。
**权限**：`finance_admin` 专用。
**参数：**
- `agriculturalDebt`: number (农资扣款)
- `advancePayment`: number (预支款扣除)
- `remark`: string

**用途**：在审核前，财务手动录入系统未记录的线下扣款项。

### action: `markPayment`
标记支付中。状态变为 `paying`。

### action: `completePayment`
完成支付。
**参数：**
- `paymentVoucher`: string (凭证图片URL)
**逻辑**：
1. 状态变为 `completed`。
2. 从农户档案中正式扣除 `seedDebt`。
3. 累加农户的 `totalPaidAmount`。

---

## 角色权限对照表

| 功能 | 助理 (Assistant) | 仓管 (Warehouse) | 财务 (Finance) |
| :--- | :---: | :---: | :---: |
| **农户建档** | ✅ (仅限私有) | ❌ | ✅ (全部) |
| **发苗** | ✅ | ❌ | ❌ |
| **收购登记** | ❌ | ✅ (仅限本仓) | ❌ |
| **删除收购单**| ❌ | ❌ | ✅ |
| **结算审核** | ❌ | ❌ | ✅ |
| **支付操作** | ❌ | ❌ | ✅ |
| **报表查看** | ✅ (个人业绩) | ✅ (仓库数据) | ✅ (全局经营) |