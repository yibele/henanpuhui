# 云函数现状基线（以代码为准）

生成时间：2026-02-06
范围：`cloudfunctions/` 目录下业务相关函数（农户、发苗、收购、结算、统计、用户）

## 1. 主业务链路

1. 助理建档/维护农户：`farmer-manage`
2. 助理发苗：`seed-manage/distribute`
3. 仓管收购入库：`acquisition-manage/create`
4. 自动生成结算单：在步骤3内同步写入 `settlements`
5. 会计审核结算：`settlement-manage/audit`
6. 出纳付款：`settlement-manage/completePayment`

## 2. 状态机（当前实现）

### 2.1 收购单 `acquisitions.status`
- `confirmed`：创建成功
- `audit_rejected`：结算审核驳回后同步设置
- `deleted`：财务/管理员软删除

### 2.2 结算单 `settlements`
- `status`：`pending -> approved -> paying -> completed`，或 `rejected`，或 `deleted`
- `auditStatus`：`pending/approved/rejected`
- `paymentStatus`：`unpaid/paying/paid`

## 3. 角色枚举（代码实值）

- `assistant`
- `warehouse_manager`
- `finance_admin`
- `cashier`
- `admin`

说明：旧文档出现的 `warehouse`、`finance` 不是当前代码判权值。

## 4. 云函数 action 对照

### 4.1 farmer-manage
- `create` 创建农户
- `get` 农户详情
- `list` 农户列表
- `update` 更新农户
- `delete` 软删除农户
- `addendum` 追加签约
- `getBusinessRecords` 业务往来记录
- `searchByPhone` 手机号检索农户
- `getStatusStats` 发苗状态统计
- `advancePayment` 预支款登记
- `addAgriculturalSupply` 农资发放登记

### 4.2 seed-manage
- `distribute` 发苗
- `getByFarmer` 农户发苗记录
- `list` 发苗列表
- `getDetail` 发苗详情
- `update` 更新发苗
- `delete` 删除发苗
- `getDistributionStats` 发苗统计

### 4.3 acquisition-manage
- `create` 创建收购（自动生成结算单）
- `get` 收购详情
- `list` 收购列表
- `update` 驳回后修正收购
- `getFarmerSummary` 农户收购汇总
- `delete` 软删除收购
- `financeUpdate` 财务修改收购
- `getDetail` 收购详情（兼容 `_id`/`acquisitionId`）

### 4.4 settlement-manage
- `get` / `getDetail` 结算详情
- `list` 结算列表
- `audit` 审核
- `markPayment` 标记支付中
- `completePayment` 确认付款
- `recalculate` 重新计算
- `getCashierStats` 出纳统计
- `previewDeduction` 预览扣款
- `backfillSettlements` 字段回填
- `backfillFarmersSeedDebt` 农户欠款回填
- `purgeBusinessData` 清空业务数据
- `getStatistics` 结算统计

## 5. 鉴权与数据范围（当前实现）

### 5.1 鉴权现状
- 当前多数云函数以 `event.userId` 为主进行身份与权限判断。
- `settlement-manage/list`、`settlement-manage/get` 已要求用户存在且做角色校验。

### 5.2 数据范围限制（已落地）
- `settlement-manage/list`：仅 `warehouse_manager/finance_admin/cashier/admin` 可访问。
- `settlement-manage/get`：仅上述角色可访问；`warehouse_manager` 限本仓库。

## 6. 仍需继续收口的点（下一步）

1. 收口 `acquisition-manage` 与 `seed-manage` 的身份校验一致性。
2. 清理所有接口里 `userId` 既作“身份”又作“业务参数”的混用。
3. 对齐前端登录态语义：本地 `token` 仅作 UI 会话，不作为后端鉴权依据。
