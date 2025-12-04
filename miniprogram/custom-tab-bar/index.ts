/**
 * 自定义底部导航栏组件
 * @description 使用 TDesign TabBar 实现 5 个主要功能入口
 */

Component({
  data: {
    // 当前选中的 tab 索引
    value: 0,
    // 导航栏配置
    list: [
      {
        icon: 'home',
        text: '首页',
        pagePath: '/pages/index/index'
      },
      {
        icon: 'user',
        text: '农户',
        pagePath: '/pages/farmers/list/index'
      },
      {
        icon: 'tree',
        text: '作业',
        pagePath: '/pages/operations/index/index'
      },
      {
        icon: 'wallet',
        text: '结算',
        pagePath: '/pages/finance/index/index'
      },
      {
        icon: 'chat',
        text: '助手',
        pagePath: '/pages/ai/index/index'
      }
    ]
  },

  lifetimes: {
    attached() {
      // 组件挂载时更新选中状态
      this.updateSelected();
    }
  },

  pageLifetimes: {
    show() {
      // 页面显示时更新选中状态
      this.updateSelected();
    }
  },

  methods: {
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
        item => item.pagePath === currentPath
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
      const item = this.data.list[index];
      
      if (item && item.pagePath) {
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

