# 普惠农录 - Web 管理后台

## 项目概述

这是小程序「普惠农录」的配套 Web 管理后台，用于管理农户、收购、结算等核心业务数据。

### 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Ant Design | 5.x | UI 组件库 |
| @cloudbase/js-sdk | 最新 | 调用微信云函数 |
| React Router | 6.x | 路由管理 |

---

## 功能模块

### 1. 登录模块
- 管理员账号密码登录
- 复用小程序的 `user-manage` 云函数
- 登录状态持久化

### 2. 首页仪表盘
- 农户总数、今日新增
- 收购总量、今日收购
- 结算金额、待审核数
- 快捷入口

### 3. 农户管理
| 功能 | 说明 |
|------|------|
| 农户列表 | 分页、搜索、筛选 |
| 农户详情 | 基本信息、业务往来记录 |
| 数据导出 | 导出 Excel |

### 4. 收购管理
| 功能 | 说明 |
|------|------|
| 收购记录 | 按日期、仓库、农户筛选 |
| 收购详情 | 重量、金额、操作人 |
| 数据统计 | 按仓库/日期汇总 |

### 5. 结算管理
| 功能 | 说明 |
|------|------|
| 待审核列表 | 会计审核操作 |
| 待付款列表 | 出纳付款操作 |
| 已完成列表 | 历史记录查询 |
| 结算详情 | 扣款明细、付款信息 |

### 6. 报表中心
| 功能 | 说明 |
|------|------|
| 收购报表 | 按日/周/月统计 |
| 结算报表 | 付款金额统计 |
| 农户报表 | 签约、欠款统计 |
| 数据导出 | 导出 Excel/PDF |

### 7. 系统设置（可选）
- 用户管理
- 仓库管理
- 操作日志

---

## 项目结构

```
web/
├── public/                 # 静态资源
│   └── favicon.ico
├── src/
│   ├── assets/            # 图片、字体等
│   ├── components/        # 通用组件
│   │   ├── Layout/        # 布局组件
│   │   ├── Loading/       # 加载组件
│   │   └── ...
│   ├── pages/             # 页面
│   │   ├── Login/         # 登录页
│   │   ├── Dashboard/     # 仪表盘
│   │   ├── Farmers/       # 农户管理
│   │   ├── Acquisitions/  # 收购管理
│   │   ├── Settlements/   # 结算管理
│   │   └── Reports/       # 报表中心
│   ├── services/          # API 服务
│   │   ├── cloudbase.ts   # 云开发初始化
│   │   ├── farmer.ts      # 农户相关 API
│   │   ├── acquisition.ts # 收购相关 API
│   │   └── settlement.ts  # 结算相关 API
│   ├── stores/            # 状态管理
│   │   └── user.ts        # 用户状态
│   ├── utils/             # 工具函数
│   │   ├── format.ts      # 格式化
│   │   └── auth.ts        # 权限判断
│   ├── hooks/             # 自定义 Hooks
│   ├── types/             # TypeScript 类型
│   ├── App.tsx            # 根组件
│   ├── main.tsx           # 入口文件
│   └── router.tsx         # 路由配置
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 云函数复用

直接复用小程序现有的云函数，无需修改：

| 云函数 | Web 端用途 |
|--------|-----------|
| `user-manage` | 登录验证 |
| `farmer-manage` | 农户增删改查 |
| `acquisition-manage` | 收购记录查询 |
| `settlement-manage` | 结算审核、付款、统计 |

### 调用示例

```typescript
// services/cloudbase.ts
import cloudbase from '@cloudbase/js-sdk'

export const app = cloudbase.init({
  env: 'your-env-id'
})

// 匿名登录（或自定义登录）
export const auth = app.auth()

// 调用云函数
export async function callFunction(name: string, data: any) {
  const res = await app.callFunction({ name, data })
  return res.result
}
```

```typescript
// services/farmer.ts
import { callFunction } from './cloudbase'

export async function getFarmerList(page: number, pageSize: number) {
  return callFunction('farmer-manage', {
    action: 'list',
    page,
    pageSize
  })
}
```

---

## 部署方案

### 方案1：云开发静态网站（推荐）

```bash
# 1. 构建
npm run build

# 2. 部署到云开发静态网站
tcb hosting deploy ./dist -e your-env-id
```

优点：
- 自动获得云函数访问权限
- 无需配置域名、无需备案
- CDN 加速

### 方案2：自有服务器

如果部署到自己的服务器，需要：
1. 域名备案
2. 配置云函数 HTTP 触发器
3. 处理跨域

---

## 开发计划

### 第一阶段：基础框架
- [x] 项目初始化
- [ ] 登录页面
- [ ] 基础布局（侧边栏、顶部栏）
- [ ] 路由配置
- [ ] 云开发 SDK 接入

### 第二阶段：核心功能
- [ ] 仪表盘首页
- [ ] 农户列表 + 详情
- [ ] 收购记录列表
- [ ] 结算管理（审核、付款）

### 第三阶段：报表统计
- [ ] 收购报表
- [ ] 结算报表
- [ ] 数据导出

### 第四阶段：优化完善
- [ ] 权限控制
- [ ] 操作日志
- [ ] 性能优化

---

## 启动方式

```bash
# 进入目录
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 注意事项

1. **环境变量**：云环境 ID 需要配置在 `.env` 文件中
2. **登录鉴权**：需要在云开发控制台开启匿名登录或自定义登录
3. **权限控制**：复用小程序的用户角色体系（admin、finance_admin、cashier 等）

---

## 界面预览（设计稿）

### 登录页
- 简洁登录表单
- 手机号 + 密码

### 首页仪表盘
```
┌─────────────────────────────────────────────┐
│  普惠农录 - 管理后台                    👤 管理员 │
├──────┬──────────────────────────────────────┤
│      │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ 首页 │  │ 农户 │ │ 收购 │ │ 待审 │ │ 待付 │ │
│      │  │ 200  │ │ 50吨 │ │  5   │ │  3   │ │
│ 农户 │  └──────┘ └──────┘ └──────┘ └──────┘ │
│      │                                      │
│ 收购 │  ┌─ 今日收购 ─────────────────────┐  │
│      │  │  农户A  2000kg  ¥18000        │  │
│ 结算 │  │  农户B  1500kg  ¥13500        │  │
│      │  └────────────────────────────────┘  │
│ 报表 │                                      │
│      │  ┌─ 待处理事项 ───────────────────┐  │
│      │  │  5 笔结算待审核               │  │
│      │  │  3 笔付款待处理               │  │
│      │  └────────────────────────────────┘  │
└──────┴──────────────────────────────────────┘
```

---

## 下一步

确认以上方案后，我将开始：
1. 创建项目、安装依赖
2. 搭建基础框架（布局、路由、云开发接入）
3. 实现登录功能
4. 逐步完成各功能模块

请确认是否可以开始开发？
