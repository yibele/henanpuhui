# 助理 (业务员) 权限与业务流程说明文档

## 1. 概述

本系统采用基于角色的访问控制 (RBAC) 模型。**助理 (Assistant/Salesman)** 是系统的核心业务角色之一，主要负责一线的农户管理和种苗发放工作。

本文档详细说明了助理角色的权限定义、登录流程以及核心业务的操作流程。

## 2. 角色定义

*   **角色标识**: `assistant`
*   **角色名称**: 助理 / 业务员
*   **核心职责**:
    *   **农户签约**: 负责发展新农户，录入农户档案。
    *   **种苗发放**: 负责向负责的农户发放种苗，并记录发放详情。
    *   **种植指导**: 下乡进行种植技术指导并记录。
    *   **自我管理**: 查看自己名下的农户列表和业绩统计。

## 3. 权限详情

在 `miniprogram/models/permission.ts` 中定义了助理的具体权限：

### 3.1 功能权限列表

| 权限代码 | 权限名称 | 描述 |
| :--- | :--- | :--- |
| `FARMER_CREATE` | 新增农户 | 允许录入新的农户信息 (签约) |
| `FARMER_VIEW_OWN` | 查看自己的农户 | 仅能查看自己签约或分配给自己的农户数据 |
| `SEED_DISTRIBUTE` | 种苗发放 | 允许执行发苗操作，记录发放数量和金额 |
| `SEED_VIEW` | 查看发放记录 | 查看种苗发放的历史记录 |
| `GUIDE_CREATE` | 添加种植指导 | 录入下乡指导记录 (含照片) |
| `GUIDE_VIEW` | 查看指导记录 | 查看过往的指导记录 |
| `STATS_OWN` | 查看自己的统计 | 查看个人的业绩统计 (签约数、发苗量等) |

### 3.2 页面访问权限

助理角色被允许访问以下页面：

*   **基础页面**:
    *   `/pages/index/index` (首页)
    *   `/pages/login/index` (登录页)
    *   `/pages/ai/index/index` (AI助手)
*   **农户管理**:
    *   `/pages/farmers/list/index` (农户列表)
    *   `/pages/farmers/add/index` (新增农户)
    *   `/pages/farmers/detail/index` (农户详情)
*   **业务操作**:
    *   `/pages/operations/index/index` (作业中心入口)
    *   `/pages/operations/seed-add/index` (种苗发放)
    *   `/pages/operations/guide-add/index` (添加指导)

### 3.3 底部导航栏 (Tab Bar)

助理登录后，底部导航栏将呈现为：

1.  **首页** (`home`): 系统概览与常用功能入口。
2.  **农户** (`user`): 快速进入农户列表管理。
3.  **发苗** (`corn`): 快速进入作业中心进行发苗操作。

## 4. 业务流程详解

### 4.1 登录与权限加载流程

1.  **用户输入**: 用户在登录页输入手机号和密码。
2.  **云端验证**: 调用云函数 `user-manage` -> `login`。
    *   验证手机号是否存在。
    *   验证密码是否匹配。
    *   检查账号状态是否为 `active`。
3.  **获取信息**: 验证通过后，云端返回用户信息，包含 `role: 'assistant'`。
4.  **本地存储**:
    *   前端将用户信息存储在全局变量 `app.globalData`。
    *   前端将 Token 和用户信息写入本地缓存 `wx.setStorageSync`，实现持久化登录。
5.  **权限应用**:
    *   根据 `role` 动态配置底部导航栏 (`RoleTabBars`)。
    *   应用路由守卫，用户访问受限页面时自动检查 `PagePermissions`。

### 4.2 农户签约流程 (新增农户)

1.  **入口**: 点击首页或农户列表页的"新增农户"按钮。
2.  **权限检查**: 系统检查是否拥有 `FARMER_CREATE` 权限。
3.  **信息录入**:
    *   填写基本信息 (姓名、电话、身份证)。
    *   选择四级地址 (县/乡/镇/村)。
    *   填写种植信息 (面积、定金)。
    *   上传合同照片。
4.  **提交**: 数据提交至云数据库 `farmers` 集合。
    *   **自动关联**: 后端自动将当前登录的助理 ID 写入 `salesmanId` 字段，实现数据归属权绑定。

### 4.3 种苗发放流程

1.  **入口**: 点击底部"发苗" Tab 或作业中心的"种苗发放"。
2.  **权限检查**: 系统检查是否拥有 `SEED_DISTRIBUTE` 权限。
3.  **选择农户**: 必须先选择一个归属于该助理的农户。
4.  **录入数据**:
    *   选择种苗品类。
    *   输入发放数量 (kg)。
    *   系统自动计算总金额 (单价 x 数量)。
    *   确认收款金额 (如现结) 或记入欠款。
5.  **提交**:
    *   生成 `seed_records` 记录。
    *   记录中包含 `distributorId` (当前助理 ID)。
    *   更新农户的欠款/财务状态。

## 5. 权限控制代码示例

系统在 `miniprogram/models/permission.ts` 中通过映射表管理权限：

```typescript
// 角色权限定义
export const RolePermissions = {
  [UserRole.ASSISTANT]: [
    Permission.FARMER_CREATE,
    Permission.FARMER_VIEW_OWN,
    // ... 其他权限
  ]
};

// 页面权限检查函数
export function canAccessPage(userRole: UserRole, pagePath: string): boolean {
  const requiredPermissions = PagePermissions[pagePath];
  if (!requiredPermissions) return true;
  return hasAnyPermission(userRole, requiredPermissions);
}
```

在 `App.ts` 中，通过 `checkPermission` 方法供页面调用，控制按钮的显示/隐藏（例如：只有有权限时才显示"新增"按钮）。
