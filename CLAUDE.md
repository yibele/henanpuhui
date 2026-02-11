# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**普惠农录** — 甜叶菊农业管理系统，包含农户签约、种苗发放、收购称重、财务结算、仓库管理等完整业务链。

三端架构：
- `miniprogram/` — 微信小程序（TypeScript + TDesign）
- `web/` — 管理后台（React 18 + Ant Design 5 + Vite 5）
- `cloudfunctions/` — 微信云开发云函数（Node.js）

云环境ID：`cloud1-5g8kf9072047ce03`

## Development Commands

### Web 管理后台 (`web/`)
```bash
cd web && npm run dev      # 开发服务器 localhost:3000
cd web && npm run build    # 生产构建（含 TypeScript 检查）
cd web && npm run lint     # ESLint 检查
```

### 小程序
- 使用**微信开发者工具**打开项目根目录
- TypeScript 编译由 IDE 自动完成
- NPM 包需在 IDE 中手动构建：工具 → 构建 npm

### 云函数部署
- 在微信开发者工具中右键云函数目录 → "上传并部署：云端安装依赖"
- 测试：微信开发者工具 → 云函数测试 UI

## Architecture

### 云函数列表及职责

| 云函数 | action 列表 |
|---|---|
| `farmer-manage` | create, get, list, update, delete |
| `acquisition-manage` | createAcquisition, getAcquisition, listAcquisitions, updateAcquisition |
| `settlement-manage` | getSettlement, listSettlements, auditSettlement, markPayment, completePayment, backfillSettlements, backfillFarmersSeedDebt, purgeBusinessData |
| `seed-manage` | 种苗发放管理 |
| `warehouse-manage` | list, getDashboard, getDailyList, saveDaily |
| `user-manage` | 用户认证与管理 |
| `dashboard-stats` | 数据统计看板 |

### 核心业务流

```
农户签约 → 种苗发放 → 收购称重 → 自动生成结算单 → 财务审核 → 出纳付款
                                    ↓
                           扣除：种苗欠款 + 定金 + 其他扣款
```

收购记录（acquisition）与结算单（settlement）是 **1:1 关系**，创建收购时自动生成结算单。

### 数据库集合

核心集合：`users`, `warehouses`, `farmers`, `acquisitions`, `settlements`, `seed_records`, `business_records`, `planting_guidance`, `operation_logs`

完整 schema 见 `cloudfunctions/database-schema.md`。

### ID 生成规则
- 农户：`FAR_YYYYMMDD_XXXXXX`（事务计数器，每日递增序列）
- 收购：`ACQ_YYYYMMDD_XXXX`（随机4位后缀）
- 结算：`STL_YYYYMMDD_XXXX`（随机4位后缀）
- 种苗：`SEED_YYYYMMDD_XXXX`
- 业务记录：`BIZ_YYYYMMDD_XXXX`

### 权限模型（RBAC）

5 个角色，三端统一校验：

| 角色 | 权限范围 |
|---|---|
| `admin` | 全部功能 |
| `assistant` | 农户管理、种苗发放 |
| `warehouse_manager` | 收购管理（仅绑定仓库） |
| `finance_admin` | 结算审核、报表 |
| `cashier` | 付款操作、报表 |

权限代码位置：
- 小程序：`miniprogram/models/permission.ts`
- Web：`web/src/router.tsx`（ROLE_PERMISSIONS）
- 云函数：每个函数内部 userId 校验

## Code Conventions

### 金额计算必须使用精度库
所有涉及金额的运算**禁止直接使用 JS 算术运算符**，必须使用 `cloudfunctions/common/calc.js`：
```javascript
const { multiply, add, subtract, roundToFen } = require('./calc');
```

### TypeScript 配置
严格模式：`strict`, `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` 全部启用。

### 编码风格
- 2 空格缩进
- 文件名：kebab-case
- 变量/函数：camelCase
- Commit 格式：`feat:`, `fix:`, `refactor:`, `docs:`

### 云函数通用模式
- 所有需要权限的 action 必须传入 `userId` 参数
- 使用 `queryAll()` 辅助函数分批拉取数据（避免 100 条上限）
- 删除操作使用**软删除**（status 字段标记）
- 关键操作记录 `operation_logs` 审计日志

### Web 端路径别名
`@` → `web/src/`

## Key References

- `AGENTS.md` — AI 助手协作规范
- `cloudfunctions/README.md` — 云函数部署与 API 说明
- `cloudfunctions/database-schema.md` — 数据库完整设计
- `docs/` — 架构设计、API文档、部署指南等 14 份文档
