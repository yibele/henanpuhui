/**
 * CloudBase SDK 初始化与云函数调用
 */
import cloudbase from '@cloudbase/js-sdk'

// 从环境变量获取云环境 ID
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV || ''

// 初始化云开发
const app = cloudbase.init({
  env: ENV_ID,
})

// 获取认证实例
export const auth = app.auth({
  persistence: 'local', // 本地持久化
})

// 标记是否已登录
let isLoggedIn = false

/**
 * 匿名登录（用于初始化连接）
 */
export async function anonymousLogin() {
  if (isLoggedIn) return

  try {
    const loginState = await auth.getLoginState()
    if (!loginState) {
      // 新版 SDK 使用 signInAnonymously
      await auth.signInAnonymously()
    }
    isLoggedIn = true
  } catch (error) {
    console.error('匿名登录失败:', error)
    throw error
  }
}

/**
 * 调用云函数
 * @param name 云函数名称
 * @param data 参数
 */
export async function callFunction<T = any>(
  name: string,
  data: Record<string, any>
): Promise<T> {
  // 确保已登录
  await anonymousLogin()

  const res = await app.callFunction({
    name,
    data,
  })

  return res.result as T
}

/**
 * 用户登录
 */
export async function userLogin(phone: string, password: string) {
  return callFunction('user-manage', {
    action: 'login',
    phone,
    password,
  })
}

/**
 * 农户相关 API
 */
export const farmerApi = {
  // 获取农户列表
  list: (params: { page?: number; pageSize?: number; keyword?: string; userId: string }) =>
    callFunction('farmer-manage', { action: 'list', ...params }),

  // 获取农户详情
  get: (farmerId: string) =>
    callFunction('farmer-manage', { action: 'get', farmerId }),

  // 获取业务记录
  getBusinessRecords: (farmerId: string, page = 1, pageSize = 50) =>
    callFunction('farmer-manage', { action: 'getBusinessRecords', farmerId, page, pageSize }),

  // 创建农户
  create: (userId: string, data: Record<string, any>) =>
    callFunction('farmer-manage', { action: 'create', userId, data }),

  // 更新农户
  update: (userId: string, farmerId: string, data: Record<string, any>) =>
    callFunction('farmer-manage', { action: 'update', userId, farmerId, data }),

  // 删除农户
  delete: (userId: string, farmerId: string) =>
    callFunction('farmer-manage', { action: 'delete', userId, farmerId }),
}

/**
 * 结算相关 API
 */
export const settlementApi = {
  // 获取结算列表
  list: (params: { page?: number; pageSize?: number; status?: string; keyword?: string; userId?: string }) =>
    callFunction('settlement-manage', { action: 'list', ...params }),

  // 获取结算详情
  get: (settlementId: string) =>
    callFunction('settlement-manage', { action: 'get', settlementId }),

  // 获取统计数据
  getStatistics: (params: { startDate?: string; endDate?: string }) =>
    callFunction('settlement-manage', { action: 'getStatistics', ...params }),

  // 获取出纳统计
  getCashierStats: () =>
    callFunction('settlement-manage', { action: 'getCashierStats' }),

  // 会计审核通过
  audit: (settlementId: string, userId: string, userName: string) =>
    callFunction('settlement-manage', {
      action: 'audit',
      settlementId,
      userId,
      userName,
    }),

  // 会计驳回
  reject: (settlementId: string, userId: string, userName: string, reason: string) =>
    callFunction('settlement-manage', {
      action: 'reject',
      settlementId,
      userId,
      userName,
      reason,
    }),

  // 出纳付款
  pay: (settlementId: string, userId: string, userName: string, paymentMethod: string, remark?: string) =>
    callFunction('settlement-manage', {
      action: 'pay',
      settlementId,
      userId,
      userName,
      paymentMethod,
      remark,
    }),
}

/**
 * 收购相关 API
 */
export const acquisitionApi = {
  // 获取收购记录列表
  list: (params: { page?: number; pageSize?: number; keyword?: string; warehouseId?: string; startDate?: string; endDate?: string }) =>
    callFunction('acquisition-manage', { action: 'list', ...params }),

  // 获取收购详情
  get: (acquisitionId: string) =>
    callFunction('acquisition-manage', { action: 'get', acquisitionId }),

  // 获取统计数据
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    callFunction('acquisition-manage', { action: 'getStats', ...params }),

  // 新增收购
  create: (params: {
    userId: string
    userName: string
    farmerId: string
    farmerName: string
    farmerPhone: string
    grossWeight: number
    tareWeight: number
    netWeight: number
    unitPrice: number
    amount: number
    remark?: string
  }) =>
    callFunction('acquisition-manage', { action: 'create', ...params }),
}

/**
 * 用户管理 API（管理员专用）
 */
export const userApi = {
  // 获取用户列表
  list: (params: { userId: string; page?: number; pageSize?: number; keyword?: string; role?: string }) =>
    callFunction('user-manage', { action: 'list', ...params }),

  // 创建用户
  create: (userId: string, data: { name: string; phone: string; password: string; role: string; warehouseId?: string; warehouseName?: string }) =>
    callFunction('user-manage', { action: 'create', userId, data }),

  // 更新用户
  update: (userId: string, targetUserId: string, data: { name?: string; role?: string; status?: string; password?: string; warehouseId?: string; warehouseName?: string }) =>
    callFunction('user-manage', { action: 'update', userId, targetUserId, data }),

  // 删除用户
  delete: (userId: string, targetUserId: string) =>
    callFunction('user-manage', { action: 'delete', userId, targetUserId }),
}

/**
 * 仓库管理 API
 */
export const warehouseApi = {
  // 获取仓库列表
  list: (userId: string) =>
    callFunction('warehouse-manage', { action: 'list', userId }),
}

/**
 * 仪表盘统计 API
 */
export const dashboardApi = {
  // 获取管理员仪表盘数据
  getAdminDashboard: (userId: string) =>
    callFunction('dashboard-stats', { action: 'getAdminDashboard', userId }),

  // 获取财务统计
  getFinanceStats: (userId: string) =>
    callFunction('dashboard-stats', { action: 'getFinanceStats', userId }),

  // 获取仓管统计
  getWarehouseStats: (userId: string) =>
    callFunction('dashboard-stats', { action: 'getWarehouseStats', userId }),

  // 获取助理统计
  getAssistantStats: (userId: string) =>
    callFunction('dashboard-stats', { action: 'getAssistantStats', userId }),
}

export default app
