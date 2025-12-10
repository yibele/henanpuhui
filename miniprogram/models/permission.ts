/**
 * 权限配置
 * @description 定义各角色的权限和可访问页面
 */

import { UserRole, Permission } from './types';

// ==================== 角色权限映射 ====================

/** 各角色拥有的权限列表 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  // 业务员权限：用户签约 + 种苗发放
  [UserRole.SALESMAN]: [
    Permission.FARMER_CREATE,      // 新增农户
    Permission.FARMER_VIEW_OWN,    // 查看自己的农户
    Permission.SEED_DISTRIBUTE,    // 种苗发放
    Permission.SEED_VIEW,          // 查看发放记录
    Permission.GUIDE_CREATE,       // 添加种植指导
    Permission.GUIDE_VIEW,         // 查看指导记录
    Permission.STATS_OWN           // 查看自己的统计
  ],

  // 仓库管理员权限：收苗入库 + 出库管理
  [UserRole.WAREHOUSE_MANAGER]: [
    Permission.ACQUISITION_CREATE, // 收苗登记
    Permission.ACQUISITION_VIEW,   // 查看收苗记录
    Permission.INVENTORY_IN,       // 入库操作
    Permission.INVENTORY_OUT,      // 出库操作
    Permission.INVENTORY_VIEW,     // 查看库存
    Permission.STATS_WAREHOUSE     // 查看仓库统计
  ],

  // 财务/管理层权限：全部查看 + 结算
  [UserRole.FINANCE_ADMIN]: [
    Permission.FARMER_VIEW_ALL,    // 查看所有农户
    Permission.SEED_VIEW,          // 查看发放记录
    Permission.GUIDE_VIEW,         // 查看指导记录
    Permission.ACQUISITION_VIEW,   // 查看收苗记录
    Permission.INVENTORY_VIEW,     // 查看库存
    Permission.SETTLEMENT_VIEW,    // 查看结算列表
    Permission.SETTLEMENT_PAY,     // 执行结算支付
    Permission.STATS_ALL,          // 查看全部统计
    Permission.QUERY_MULTI         // 多维度查询
  ]
};

// ==================== 底部导航栏配置 ====================

/** 导航项接口 */
export interface TabBarItem {
  icon: string;       // 图标名称
  text: string;       // 显示文本
  pagePath: string;   // 页面路径
}

/** 各角色的底部导航栏配置 */
export const RoleTabBars: Record<UserRole, TabBarItem[]> = {
  // 业务员导航栏：首页、农户、发苗、助手
  [UserRole.SALESMAN]: [
    { icon: 'home', text: '首页', pagePath: '/pages/index/index' },
    { icon: 'user', text: '农户', pagePath: '/pages/farmers/list/index' },
    { icon: 'tree', text: '发苗', pagePath: '/pages/operations/index/index' },
    { icon: 'chat', text: '助手', pagePath: '/pages/ai/index/index' }
  ],

  // 仓库管理员导航栏：首页、收苗、仓库、助手
  [UserRole.WAREHOUSE_MANAGER]: [
    { icon: 'home', text: '首页', pagePath: '/pages/index/index' },
    { icon: 'cart', text: '收苗', pagePath: '/pages/operations/index/index' },
    { icon: 'location', text: '仓库', pagePath: '/pages/warehouse/index/index' },
    { icon: 'chat', text: '助手', pagePath: '/pages/ai/index/index' }
  ],

  // 财务/管理层导航栏：总览、收苗、农资、结算、助手
  [UserRole.FINANCE_ADMIN]: [
    { icon: 'chart-pie', text: '总览', pagePath: '/pages/index/index' },
    { icon: 'cart', text: '收苗', pagePath: '/pages/stats/acquisition/index' },
    { icon: 'shop', text: '农资', pagePath: '/pages/stats/supplies/index' },
    { icon: 'wallet', text: '结算', pagePath: '/pages/finance/index/index' },
    { icon: 'chat', text: '助手', pagePath: '/pages/ai/index/index' }
  ]
};

// ==================== 权限检查工具函数 ====================

/**
 * 检查用户是否拥有指定权限
 * @param userRole 用户角色
 * @param permission 需要检查的权限
 * @returns 是否拥有权限
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = RolePermissions[userRole];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * 检查用户是否拥有任意一个指定权限
 * @param userRole 用户角色
 * @param permissions 需要检查的权限列表
 * @returns 是否拥有任意一个权限
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(userRole, p));
}

/**
 * 检查用户是否拥有全部指定权限
 * @param userRole 用户角色
 * @param permissions 需要检查的权限列表
 * @returns 是否拥有全部权限
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(userRole, p));
}

/**
 * 获取用户角色对应的底部导航栏配置
 * @param userRole 用户角色
 * @returns 导航栏配置
 */
export function getTabBarConfig(userRole: UserRole): TabBarItem[] {
  return RoleTabBars[userRole] || RoleTabBars[UserRole.SALESMAN];
}

/**
 * 获取用户角色的所有权限
 * @param userRole 用户角色
 * @returns 权限列表
 */
export function getUserPermissions(userRole: UserRole): Permission[] {
  return RolePermissions[userRole] || [];
}

// ==================== 页面权限配置 ====================

/** 页面所需权限映射 */
export const PagePermissions: Record<string, Permission[]> = {
  // 首页 - 所有角色可访问，但显示内容不同
  '/pages/index/index': [],
  
  // 农户相关页面
  '/pages/farmers/list/index': [Permission.FARMER_VIEW_OWN, Permission.FARMER_VIEW_ALL],
  '/pages/farmers/add/index': [Permission.FARMER_CREATE],
  '/pages/farmers/detail/index': [Permission.FARMER_VIEW_OWN, Permission.FARMER_VIEW_ALL],
  
  // 作业相关页面
  '/pages/operations/index/index': [],  // 通用入口，内部根据角色显示不同内容
  '/pages/operations/seed-add/index': [Permission.SEED_DISTRIBUTE],
  '/pages/operations/guide-add/index': [Permission.GUIDE_CREATE],
  '/pages/operations/buy-add/index': [Permission.ACQUISITION_CREATE],
  
  // 仓库相关页面
  '/pages/warehouse/index/index': [Permission.INVENTORY_VIEW],
  '/pages/warehouse/in/index': [Permission.INVENTORY_IN],
  '/pages/warehouse/out/index': [Permission.INVENTORY_OUT],
  
  // 结算相关页面
  '/pages/finance/index/index': [Permission.SETTLEMENT_VIEW],
  
  // 统计页面 - 仅管理层可访问
  '/pages/stats/acquisition/index': [Permission.STATS_ALL],
  '/pages/stats/supplies/index': [Permission.STATS_ALL],
  
  // AI助手 - 所有角色可访问
  '/pages/ai/index/index': [],
  
  // 登录页 - 无需权限
  '/pages/login/index': []
};

/**
 * 检查用户是否有权限访问指定页面
 * @param userRole 用户角色
 * @param pagePath 页面路径
 * @returns 是否有权限
 */
export function canAccessPage(userRole: UserRole, pagePath: string): boolean {
  const requiredPermissions = PagePermissions[pagePath];
  
  // 页面未配置权限或权限列表为空，表示所有角色可访问
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  
  // 只要有任意一个权限即可访问
  return hasAnyPermission(userRole, requiredPermissions);
}

/**
 * 获取用户无权限时的提示信息
 * @param userRole 用户角色
 * @returns 提示信息
 */
export function getNoPermissionMessage(userRole: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.SALESMAN]: '业务员',
    [UserRole.WAREHOUSE_MANAGER]: '仓库管理员',
    [UserRole.FINANCE_ADMIN]: '财务/管理层'
  };
  return `您当前角色（${roleNames[userRole]}）无权限访问此功能`;
}

