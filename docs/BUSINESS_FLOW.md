# 农业收购管理系统业务流程文档

## 一、完整业务流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  ① 收购入库  │ -> │  ② 会计审核  │ -> │  ③ 出纳付款  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
  仓库管理员操作        会计操作            出纳操作
  创建收购记录          审核结算单          确认付款
  status=confirmed      status=approved     status=completed
                      │
                      ▼
                   审核驳回
                 status=rejected
```

---

## 二、各阶段详细说明

### ① 收购入库 (`acquisition-manage/createAcquisition`)

**位置**: `cloudfunctions/acquisition-manage/index.js:99-437`

**操作角色**: 仓库管理员

**关键动作**:
1. 创建收购记录，状态为 `confirmed`
2. **自动生成结算单**，初始状态为 `pending`（待审核）
3. 更新农户和仓库统计数据
4. 发送通知给财务

```javascript
// 结算单初始状态
const settlementData = {
  status: 'pending',  // 待审核
  // 扣款明细初始为0，审核时才计算
  advanceDeduction: 0,
  seedDeduction: 0,
  agriculturalDeduction: 0,
  actualPayment: 0,
};
```

---

### ② 会计审核 (`settlement-manage/auditSettlement`)

**位置**: `cloudfunctions/settlement-manage/index.js:197-477`

**操作角色**: 会计（finance_admin）或管理员

**关键动作**:
1. **实时读取农户最新欠款数据**
2. **按优先级计算扣款**（预付款 > 种苗欠款 > 农资欠款）
3. 更新结算单，写入扣款明细
4. 更新农户欠款余额
5. 状态变为 `approved`（待付款）
6. 发送通知给出纳

```javascript
// 扣款计算逻辑
let remaining = acquisitionAmount;  // 收购货款
let deductAdvance = 0;
let deductSeed = 0;
let deductAgri = 0;

// 优先扣预付款
if (remaining > 0 && currentAdvance > 0) {
  deductAdvance = Math.min(remaining, currentAdvance);
  remaining -= deductAdvance;
}
// 其次扣种苗欠款
if (remaining > 0 && currentSeedDebt > 0) {
  deductSeed = Math.min(remaining, currentSeedDebt);
  remaining -= deductSeed;
}
// 最后扣农资欠款
if (remaining > 0 && currentAgriDebt > 0) {
  deductAgri = Math.min(remaining, currentAgriDebt);
  remaining -= deductAgri;
}

const actualPayment = remaining;  // 剩余的就是实付金额
```

**驳回逻辑**:
- 状态变为 `rejected`
- 同步更新收购记录状态为 `audit_rejected`
- 仓库管理员可以修正后重新提交

---

### ③ 出纳付款 (`settlement-manage/completePayment`)

**位置**: `cloudfunctions/settlement-manage/index.js:598-719`

**操作角色**: 出纳或管理员

**关键动作**:
1. 确认付款（线下付款后系统确认）
2. 选择付款方式（现金/微信/银行转账）
3. 状态变为 `completed`（已完成）
4. 更新农户支付统计

```javascript
// 确认付款
await db.collection('settlements')
  .where({ settlementId })
  .update({
    data: {
      status: 'completed',
      paymentMethod: paymentMethod || 'cash',
      cashierId: currentUser._id,
      cashierName: currentUser.name,
      paymentTime: db.serverDate(),
      completeTime: db.serverDate(),
    }
  });
```

---

## 三、结算单状态流转

```
pending（待审核）
    │
    ├─ 审核通过 ──────> approved（待付款） ──────> completed（已完成）
    │                                        (出纳确认付款)
    │
    └─ 审核驳回 ──────> rejected
                      (收购记录状态变为 audit_rejected，
                       仓库管理员修正后重新提交)
```

---

## 四、关键业务规则

| 规则 | 说明 |
|------|------|
| **结算单生成** | 收购记录创建时自动生成，无需手动创建 |
| **扣款计算时机** | 会计审核时实时计算，确保数据准确 |
| **扣款优先级** | 预付款 > 种苗欠款 > 农资欠款 |
| **实付金额公式** | 实付金额 = 收购货款 - 预付款 - 种苗欠款 - 农资欠款 |

---

## 五、云函数对应关系

| 阶段 | 云函数 | 主要方法 | 代码行数 |
|------|--------|----------|----------|
| 收购入库 | `acquisition-manage` | `createAcquisition` | 99-437 |
| 会计审核 | `settlement-manage` | `auditSettlement` | 197-477 |
| 出纳付款 | `settlement-manage` | `completePayment` | 598-719 |

---

## 六、用户角色与权限

| 角色 | 主要职责 |
|------|----------|
| **助理** | 农户签约、种苗发放 |
| **仓库管理员** | 收购入库、库存管理 |
| **会计** | 审核结算单、计算扣款 |
| **出纳** | 确认付款、记录支付状态 |
| **管理员** | 超级管理员权限 |

---

## 七、数据流转

```
农户签约 → 种苗发放 → 收购入库 → 会计审核 → 出纳付款
   ↓          ↓          ↓          ↓          ↓
种苗欠款   发苗记录   收购记录   结算单    付款记录
预支款     农资欠款   库存更新   欠款抵扣   完成结算
```
