# 普惠农户 CRM 小程序 API 接口文档

> 版本：v1.0.0  
> 更新日期：2024-12

## 目录

1. [通用说明](#通用说明)
2. [用户认证](#用户认证)
3. [农户管理](#农户管理)
4. [种苗发放](#种苗发放)
5. [种植指导](#种植指导)
6. [收购管理](#收购管理)
7. [库存查询](#库存查询)
8. [财务结算](#财务结算)
9. [AI助手](#ai助手)
10. [首页统计](#首页统计)

---

## 通用说明

### 基础 URL

```
https://api.example.com/v1
```

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token}，登录后获取 |
| Content-Type | 是 | application/json |

### 响应格式

所有接口返回统一格式：

```json
{
  "code": 0,           // 状态码，0 表示成功，非 0 表示失败
  "message": "success", // 提示信息
  "data": {}           // 响应数据
}
```

### 错误码说明

| Code | 说明 |
|------|------|
| 0 | 成功 |
| 401 | 未登录或 Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 分页参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，从 1 开始，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20，最大 100 |

### 分页响应

```json
{
  "list": [],      // 数据列表
  "total": 100,    // 总条数
  "page": 1,       // 当前页码
  "pageSize": 20   // 每页条数
}
```

---

## 用户认证

### 1. 发送验证码

**POST** `/auth/send-code`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号，11位 |

**响应示例**

```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": null
}
```

---

### 2. 手机号登录

**POST** `/auth/login`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号 |
| code | string | 是 | 验证码，4-6位数字 |

**响应示例**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_001",
      "phone": "13800138000",
      "name": "管理员",
      "role": "ADMIN",
      "avatar": "https://example.com/avatar.jpg",
      "createTime": "2023-01-01"
    }
  }
}
```

---

### 3. 退出登录

**POST** `/auth/logout`

**响应示例**

```json
{
  "code": 0,
  "message": "退出成功",
  "data": null
}
```

---

## 农户管理

### 1. 获取农户列表

**GET** `/farmers`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索关键词（姓名/手机号） |
| status | string | 否 | 状态筛选：active/pending/inactive |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "1",
        "name": "张三",
        "phone": "13800138000",
        "idCard": "510100197001011234",
        "bankAccount": "6222021001122334455",
        "address": "幸福村3组",
        "acreage": 15.5,
        "contractDate": "2023-01-15",
        "status": "active",
        "createTime": "2023-01-15"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 2. 获取农户详情

**GET** `/farmers/{id}`

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "1",
    "name": "张三",
    "phone": "13800138000",
    "idCard": "510100197001011234",
    "bankAccount": "6222021001122334455",
    "address": "幸福村3组",
    "acreage": 15.5,
    "contractDate": "2023-01-15",
    "status": "active",
    "contractImages": ["https://example.com/contract1.jpg"],
    "createTime": "2023-01-15",
    "updateTime": "2023-06-20"
  }
}
```

---

### 3. 新增农户

**POST** `/farmers`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 姓名 |
| phone | string | 是 | 联系电话 |
| address | string | 是 | 地址 |
| acreage | number | 否 | 种植面积（亩） |
| idCard | string | 否 | 身份证号 |
| bankAccount | string | 否 | 银行卡号 |
| contractImages | string[] | 否 | 合同照片URL列表 |

**响应示例**

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "new_farmer_id"
  }
}
```

---

### 4. 更新农户信息

**PUT** `/farmers/{id}`

**请求参数**

同新增农户参数，所有字段均为可选

---

### 5. 更新农户状态

**PATCH** `/farmers/{id}/status`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 是 | 状态：active/pending/inactive |

---

## 种苗发放

### 1. 获取发放记录

**GET** `/seeds`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 否 | 按农户ID筛选 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**响应数据项**

```json
{
  "id": "101",
  "farmerId": "1",
  "farmerName": "张三",
  "seedType": "优质稻谷A",
  "quantity": 50,
  "date": "2023-04-01",
  "distributor": "管理员",
  "remark": ""
}
```

---

### 2. 新增发放记录

**POST** `/seeds`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 是 | 农户ID |
| seedType | string | 是 | 种苗品类 |
| quantity | number | 是 | 发放数量（kg） |
| remark | string | 否 | 备注 |

---

## 种植指导

### 1. 获取指导记录

**GET** `/guidance`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 否 | 按农户ID筛选 |
| guidanceType | string | 否 | 类型：fertilizer/pesticide/technical/other |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**响应数据项**

```json
{
  "id": "201",
  "farmerId": "1",
  "farmerName": "张三",
  "guidanceType": "fertilizer",
  "notes": "建议每亩施用尿素20kg",
  "date": "2023-05-15",
  "technician": "管理员",
  "images": []
}
```

---

### 2. 新增指导记录

**POST** `/guidance`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 是 | 农户ID |
| guidanceType | string | 是 | 类型：fertilizer/pesticide/technical/other |
| notes | string | 是 | 指导内容 |
| images | string[] | 否 | 现场照片URL列表 |

---

## 收购管理

### 1. 获取收购记录

**GET** `/acquisitions`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 否 | 按农户ID筛选 |
| status | string | 否 | 状态：pending/settled |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**响应数据项**

```json
{
  "id": "301",
  "farmerId": "1",
  "farmerName": "张三",
  "productType": "成熟稻谷",
  "quantity": 5000,
  "pricePerKg": 2.4,
  "totalAmount": 12000,
  "date": "2023-10-20",
  "status": "settled"
}
```

---

### 2. 新增收购记录

**POST** `/acquisitions`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 是 | 农户ID |
| productType | string | 是 | 收购品类 |
| quantity | number | 是 | 收购重量（kg） |
| pricePerKg | number | 是 | 单价（元/kg） |

---

## 库存查询

### 1. 获取库存列表

**GET** `/inventory`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | string | 否 | 类别：seed/fertilizer/crop/other |

**响应数据项**

```json
{
  "id": "501",
  "name": "优质稻谷A (种子)",
  "category": "seed",
  "quantity": 450,
  "unit": "kg",
  "location": "1号库 A区"
}
```

---

## 财务结算

### 1. 获取结算列表

**GET** `/settlements`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| farmerId | string | 否 | 按农户ID筛选 |
| status | string | 否 | 状态：paid/unpaid |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**响应数据项**

```json
{
  "id": "401",
  "farmerId": "1",
  "farmerName": "张三",
  "totalAcquisitionAmount": 12000,
  "deductions": 500,
  "finalPayment": 11500,
  "status": "paid",
  "date": "2023-11-01",
  "relatedAcquisitionIds": ["301"],
  "paymentTime": "2023-11-02",
  "paymentMethod": "银行转账"
}
```

---

### 2. 更新结算状态（确认支付）

**PATCH** `/settlements/{id}/pay`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| paymentMethod | string | 否 | 支付方式 |

**响应示例**

```json
{
  "code": 0,
  "message": "支付成功",
  "data": {
    "paymentTime": "2023-12-01T10:30:00Z"
  }
}
```

---

## AI助手

### 1. 发送对话消息

**POST** `/ai/chat`

> 注：此接口后续对接微信官方 DeepSeek API

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息 |
| context | object[] | 否 | 上下文消息（最近 10 条） |

**上下文消息格式**

```json
{
  "role": "user",      // user 或 assistant
  "content": "消息内容"
}
```

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "根据系统数据，本月收购总量为18000kg...",
    "suggestions": [
      "查看待结算农户",
      "本月发放统计"
    ]
  }
}
```

---

## 首页统计

### 1. 获取仪表盘数据

**GET** `/dashboard/stats`

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalFarmers": 50,
    "activeContracts": 42,
    "totalAcquisitions": 18000,
    "pendingSettlements": 35650
  }
}
```

---

### 2. 获取趋势数据

**GET** `/dashboard/trends`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| months | number | 否 | 月份数量，默认 6 |

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    { "month": "1月", "acquisition": 4000, "distribution": 240 },
    { "month": "2月", "acquisition": 3000, "distribution": 130 }
  ]
}
```

---

## 文件上传

### 1. 上传图片

**POST** `/upload/image`

**请求格式**: `multipart/form-data`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 图片文件 |
| type | string | 否 | 类型：contract/idcard/guidance |

**响应示例**

```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "url": "https://example.com/uploads/xxx.jpg"
  }
}
```

---

## 附录

### 种苗品类枚举

| 值 | 说明 |
|------|------|
| 优质稻谷A | 水稻种子 |
| 玉米B号 | 旱地玉米种子 |
| 土豆C系 | 高产土豆种子 |
| 油菜籽D型 | 油菜种子 |

### 收购品类枚举

| 值 | 说明 |
|------|------|
| 成熟稻谷 | 稻谷成品 |
| 干玉米 | 玉米成品 |
| 油菜籽 | 油菜籽成品 |
| 土豆 | 土豆成品 |

### 指导类型枚举

| 值 | 说明 |
|------|------|
| fertilizer | 施肥指导 |
| pesticide | 病虫防治 |
| technical | 技术指导 |
| other | 其他 |

---

**文档结束**

