# 云函数 API 文档

本文档记录所有云函数的功能说明、参数和返回值。

---

## 目录

1. [user-manage](#user-manage) - 用户管理
2. [farmer-manage](#farmer-manage) - 农户管理
3. [acquisition-manage](#acquisition-manage) - 收购管理
4. [seed-manage](#seed-manage) - 种苗发放管理
5. [settlement-manage](#settlement-manage) - 结算管理
6. [dashboard-stats](#dashboard-stats) - 首页统计
7. [database-init](#database-init) - 数据库初始化

---

## user-manage

用户管理云函数，处理登录和用户信息获取。

### action: `login`

用户登录（手机号+密码）

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| phone | string | ✅ | 手机号 |
| password | string | ✅ | 密码 |

**返回：**
```json
{
  "success": true,
  "data": {
    "userId": "用户ID",
    "name": "姓名",
    "phone": "手机号",
    "role": "角色(assistant/warehouse_manager/finance_admin/admin)",
    "warehouseId": "仓库ID（仓管专用）",
    "warehouseName": "仓库名称",
    "warehouseInfo": { "id": "", "name": "", "code": "" }
  }
}
```

### action: `getUserInfo`

获取用户信息

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 用户ID |

---

## farmer-manage

农户管理云函数，处理农户档案的增删改查。

### action: `create`

创建农户档案

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| data.name | string | ✅ | 姓名 |
| data.phone | string | ✅ | 手机号 |
| data.idCard | string | ✅ | 身份证号 |
| data.address | object | ✅ | 地址 { county, township, village } |
| data.acreage | number | ✅ | 种植面积（亩） |
| data.grade | string | - | 等级 A/B/C |
| data.deposit | number | - | 定金 |
| data.firstManager | string | ✅ | 第一负责人 |

### action: `get`

获取农户详情

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| farmerId | string | ✅ | 农户ID |

### action: `list`

获取农户列表

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID（助理只能看自己的） |
| page | number | - | 页码，默认1 |
| pageSize | number | - | 每页数量，默认20 |
| keyword | string | - | 搜索关键词 |
| status | string | - | 状态筛选 |

### action: `update`

更新农户信息

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| farmerId | string | ✅ | 农户ID |
| data | object | ✅ | 更新的字段 |

### action: `delete`

删除农户（软删除）

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| farmerId | string | ✅ | 农户ID |

### action: `addendum`

追加签约信息

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| farmerId | string | ✅ | 农户ID |
| data.addedAcreage | number | ✅ | 追加面积 |
| data.addedSeedTotal | number | - | 追加种苗（万株） |
| data.addedSeedUnitPrice | number | - | 种苗单价 |
| data.addedDeposit | number | - | 追加定金 |

### action: `searchByPhone`

通过手机号搜索农户

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| phone | string | ✅ | 11位手机号 |

**返回：**
```json
{
  "success": true,
  "data": {
    "_id": "农户ID",
    "name": "姓名",
    "phone": "手机号",
    "grade": "等级",
    "acreage": 100,
    "addressText": "完整地址",
    "county": "县",
    "township": "乡镇",
    "village": "村"
  }
}
```

### action: `getBusinessRecords`

获取农户的业务往来记录

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| farmerId | string | ✅ | 农户ID |
| page | number | - | 页码 |
| pageSize | number | - | 每页数量 |

---

## acquisition-manage

收购管理云函数，处理收购记录的创建和管理。

### action: `create`

创建收购记录（会自动生成结算单）

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| data.date | string | ✅ | 收购日期 YYYY-MM-DD |
| data.warehouseId | string | ✅ | 仓库ID |
| data.farmerId | string | ✅ | 农户ID |
| data.grossWeight | number | ✅ | 毛重 KG |
| data.tareWeight | number | ✅ | 皮重 KG |
| data.moistureRate | number | ✅ | 水杂率 % |
| data.weight | number | ✅ | 净重 KG |
| data.unitPrice | number | ✅ | 单价 元/KG |
| data.totalAmount | number | ✅ | 总金额 |
| data.remark | string | - | 备注 |

### action: `get`

获取收购详情

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| acquisitionId | string | ✅ | 收购记录ID |

### action: `list`

获取收购列表

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| page | number | - | 页码 |
| pageSize | number | - | 每页数量 |
| warehouseId | string | - | 仓库筛选 |
| startDate | string | - | 开始日期 |
| endDate | string | - | 结束日期 |

### action: `update`

更新收购记录（仅限审核驳回后）

---

## seed-manage

种苗发放管理云函数。

### action: `distribute`

发放种苗

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| data.farmerId | string | ✅ | 农户ID |
| data.quantity | number | ✅ | 发放数量（株） |
| data.distributedArea | number | ✅ | 发放面积（亩） |
| data.unitPrice | number | - | 单价 |
| data.amount | number | - | 金额 |
| data.receiverName | string | - | 接收人姓名 |
| data.distributionDate | string | - | 发放日期 |

### action: `list`

获取发放记录列表

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| page | number | - | 页码 |
| pageSize | number | - | 每页数量 |

### action: `getByFarmer`

获取某农户的发放记录

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| farmerId | string | ✅ | 农户ID |

### action: `getDetail`

获取单条记录详情

### action: `update`

更新发放记录

### action: `delete`

删除发放记录

---

## settlement-manage

结算管理云函数，处理结算单的审核和支付。

### action: `get`

获取结算单详情

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| settlementId | string | ✅ | 结算单ID |

### action: `list`

获取结算单列表

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| page | number | - | 页码 |
| pageSize | number | - | 每页数量 |
| auditStatus | string | - | 审核状态筛选 |
| paymentStatus | string | - | 支付状态筛选 |

### action: `audit`

审核结算单（通过/驳回）

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| settlementId | string | ✅ | 结算单ID |
| action | string | ✅ | approve/reject |
| remark | string | - | 审核备注 |

### action: `markPayment`

标记支付中

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| settlementId | string | ✅ | 结算单ID |

### action: `completePayment`

完成支付

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 操作用户ID |
| settlementId | string | ✅ | 结算单ID |
| paymentMethod | string | - | 支付方式 |
| paymentRemark | string | - | 支付备注 |

---

## dashboard-stats

首页统计数据云函数，根据角色返回不同的统计数据。

### action: `getAssistantStats`

获取助理的统计数据

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 用户ID |

**返回：**
- 农户数量、总面积、应收款、欠款、定金
- 发苗总金额
- 最近10个农户列表

### action: `getWarehouseStats`

获取仓库管理员的统计数据

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 用户ID |

**返回：**
- 仓库信息
- 今日收购统计（数量、重量、金额）
- 累计收购统计
- 库存信息

### action: `getFinanceStats`

获取财务/管理层的统计数据

**参数：**
| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| userId | string | ✅ | 用户ID |

**返回：**
- 仓库列表
- 待审核/待支付结算单数量
- 待支付总额
- 农户总数
- 各仓库收购统计

---

## database-init

数据库初始化脚本，无需传参。

**功能：**
- 初始化8个仓库数据
- 初始化4个测试用户（助理、仓管、财务、管理员）

**测试账号：**
| 角色 | 手机号 | 密码 |
| --- | --- | --- |
| 助理 | 13800001111 | 123456 |
| 仓管 | 13800002222 | 123456 |
| 财务 | 13800003333 | 123456 |
| 管理员 | 13900000000 | admin123 |

---

## 通用返回格式

所有云函数返回格式统一为：

```json
{
  "success": true/false,
  "message": "提示信息",
  "code": "错误码（可选）",
  "data": { ... }
}
```

## 角色说明

| 角色代码 | 角色名称 | 说明 |
| --- | --- | --- |
| assistant | 助理 | 负责农户签约、种苗发放 |
| warehouse_manager | 仓库管理员 | 负责收购登记、库存管理 |
| finance_admin | 财务/管理层 | 审核结算单、查看全局数据 |
| admin | 超级管理员 | 全部权限 |
