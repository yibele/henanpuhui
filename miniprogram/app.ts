/**
 * 普惠农户 CRM 小程序入口
 * @description 全局应用配置和生命周期管理
 */

import { UserRole, Permission } from './models/types';
import { hasPermission, canAccessPage, getNoPermissionMessage, getTabBarConfig } from './models/permission';
import type { User } from './models/types';

// 定义全局数据接口
interface IGlobalData {
  userInfo: User | null;          // 用户信息
  isLoggedIn: boolean;            // 是否已登录
  token: string;                  // 访问令牌
  userRole: UserRole | null;      // 用户角色
}

// 应用实例
App<IAppOption>({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    token: '',
    userRole: null
  } as IGlobalData,

  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus();

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    console.log('系统信息:', systemInfo);
  },

  /**
   * 检查登录状态
   * 从本地存储读取 token 和用户信息验证登录状态
   * 开发模式下默认使用业务员角色
   */
  checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo') as User | null;
      
      if (token && userInfo) {
        this.globalData.isLoggedIn = true;
        this.globalData.token = token;
        this.globalData.userInfo = userInfo;
        this.globalData.userRole = userInfo.role;
        console.log('已登录用户:', userInfo.name, '角色:', userInfo.role);
      } else {
        // 开发模式：默认使用业务员角色，方便测试
        const devUser: User = {
          id: 'dev_salesman_001',
          phone: '13800138001',
          name: '张静',
          role: UserRole.SALESMAN,
          avatar: '',
          createTime: '2024-01-01'
        };
        this.globalData.isLoggedIn = true;
        this.globalData.token = 'dev_token';
        this.globalData.userInfo = devUser;
        this.globalData.userRole = UserRole.SALESMAN;
        console.log('开发模式：默认业务员角色', devUser.name);
      }
    } catch (e) {
      console.error('检查登录状态失败:', e);
      this.globalData.isLoggedIn = false;
      this.globalData.userRole = null;
    }
  },

  /**
   * 设置登录状态
   * @param token 访问令牌
   * @param userInfo 用户信息
   */
  setLoginStatus(token: string, userInfo: User) {
    this.globalData.isLoggedIn = true;
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.userRole = userInfo.role;
    
    // 持久化存储
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
    
    console.log('登录成功，角色:', userInfo.role);
  },

  /**
   * 获取当前用户角色
   * @returns 用户角色
   */
  getUserRole(): UserRole | null {
    return this.globalData.userRole;
  },

  /**
   * 检查用户是否拥有指定权限
   * @param permission 需要检查的权限
   * @returns 是否拥有权限
   */
  checkPermission(permission: Permission): boolean {
    const role = this.globalData.userRole;
    if (!role) return false;
    return hasPermission(role, permission);
  },

  /**
   * 检查用户是否可以访问指定页面
   * @param pagePath 页面路径
   * @returns 是否可以访问
   */
  canAccessPage(pagePath: string): boolean {
    const role = this.globalData.userRole;
    if (!role) return false;
    return canAccessPage(role, pagePath);
  },

  /**
   * 获取无权限提示信息
   * @returns 提示信息
   */
  getNoPermissionMessage(): string {
    const role = this.globalData.userRole;
    if (!role) return '请先登录';
    return getNoPermissionMessage(role);
  },

  /**
   * 获取当前用户的导航栏配置
   * @returns 导航栏配置
   */
  getTabBarConfig() {
    const role = this.globalData.userRole;
    if (!role) return [];
    return getTabBarConfig(role);
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.isLoggedIn = false;
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.userRole = null;
    
    // 清除本地存储
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/index'
    });
  }
});
