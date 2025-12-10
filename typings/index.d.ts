/// <reference path="./types/index.d.ts" />

import type { User, UserRole, Permission } from '../miniprogram/models/types';
import type { TabBarItem } from '../miniprogram/models/permission';

interface IAppOption {
  globalData: {
    userInfo: User | null;          // 用户信息
    isLoggedIn: boolean;            // 是否已登录
    token: string;                  // 访问令牌
    userRole: UserRole | null;      // 用户角色
  }
  
  // 登录相关方法
  checkLoginStatus(): void;
  setLoginStatus(token: string, userInfo: User): void;
  logout(): void;
  
  // 权限相关方法
  getUserRole(): UserRole | null;
  checkPermission(permission: Permission): boolean;
  canAccessPage(pagePath: string): boolean;
  getNoPermissionMessage(): string;
  getTabBarConfig(): TabBarItem[];
}