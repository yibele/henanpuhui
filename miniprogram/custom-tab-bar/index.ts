/**
 * 自定义底部导航栏组件
 * @description 根据用户角色动态显示不同的导航栏
 */

import { getTabBarConfig, type TabBarItem } from '../models/permission';
import { UserRole } from '../models/types';

// 获取应用实例
const app = getApp<IAppOption>();

// 默认导航栏配置（未登录时或角色未知时使用）
const DEFAULT_TAB_LIST: TabBarItem[] = [
  { icon: 'home', text: '首页', pagePath: '/pages/index/index' }
];

Component({
  data: {
    // 当前选中的 tab 索引
    value: 0,
    // 导航栏配置（根据角色动态变化）
    list: DEFAULT_TAB_LIST as TabBarItem[]
  },

  lifetimes: {
    attached() {
      // 组件挂载时初始化导航栏
      this.initTabBar();
    }
  },

  pageLifetimes: {
    show() {
      // 页面显示时更新导航栏和选中状态
      this.initTabBar();
    }
  },

  methods: {
    /**
     * 初始化导航栏
     * 根据用户角色获取对应的导航配置
     */
    initTabBar() {
      const userRole = app.globalData.userRole;

      // 根据角色获取导航栏配置
      let tabList: TabBarItem[];
      if (userRole) {
        tabList = getTabBarConfig(userRole);
      } else {
        tabList = DEFAULT_TAB_LIST;
      }

      // 只有当 list 真正变化时才更新，避免闪动
      const currentListStr = JSON.stringify(this.data.list);
      const newListStr = JSON.stringify(tabList);

      if (currentListStr !== newListStr) {
        this.setData({ list: tabList });
      }

      // 更新选中状态
      this.updateSelected();
    },

    /**
     * 更新当前选中的 tab
     * 根据当前页面路径匹配对应的 tab 索引
     */
    updateSelected() {
      const pages = getCurrentPages();
      if (pages.length === 0) return;

      const currentPage = pages[pages.length - 1];
      const currentPath = '/' + currentPage.route;

      const index = this.data.list.findIndex(
        (item: TabBarItem) => item.pagePath === currentPath
      );

      if (index !== -1 && index !== this.data.value) {
        this.setData({ value: index });
      }
    },

    /**
     * 处理 tab 切换
     * @param e 事件对象，包含选中的 tab 索引
     */
    onChange(e: WechatMiniprogram.CustomEvent) {
      const index = e.detail.value;
      const item = this.data.list[index] as TabBarItem;

      if (item && item.pagePath) {
        // 检查页面访问权限
        if (!app.canAccessPage(item.pagePath)) {
          wx.showToast({
            title: app.getNoPermissionMessage(),
            icon: 'none',
            duration: 2000
          });
          return;
        }

        wx.switchTab({
          url: item.pagePath,
          fail: (err) => {
            console.error('切换 Tab 失败:', err);
            // 如果 switchTab 失败，尝试 navigateTo
            wx.navigateTo({
              url: item.pagePath
            });
          }
        });
      }
    }
  }
});

