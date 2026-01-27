/**
 * 登录页面
 * @description 手机号+密码登录
 */

// 获取应用实例
const app = getApp<IAppOption>();

Page({
  data: {
    // 手机号
    phone: '',
    // 密码
    password: '',
    // 是否显示密码
    showPassword: false,
    // 是否正在登录
    logging: false,
    // Toast 显示控制
    toastVisible: false,
    toastMessage: ''
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e: any) {
    this.setData({
      phone: e.detail.value
    });
  },

  /**
   * 密码输入
   */
  onPasswordInput(e: any) {
    this.setData({
      password: e.detail.value
    });
  },

  /**
   * 切换密码显示/隐藏
   */
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  /**
   * 手机号+密码登录
   */
  async handleLogin() {
    const { phone, password, logging } = this.data;

    // 防止重复提交
    if (logging) return;

    // 验证手机号
    if (!phone || phone.length !== 11) {
      this.showToast('请输入正确的手机号');
      return;
    }

    // 验证密码
    if (!password || password.length < 6) {
      this.showToast('请输入密码（至少6位）');
      return;
    }

    this.setData({ logging: true });

    try {
      // 调用云函数登录
      const loginRes = await wx.cloud.callFunction({
        name: 'user-manage',
        data: {
          action: 'login',
          phone: phone,
          password: password
        }
      });

      const result = loginRes.result as any;

      if (result.success) {
        // 登录成功
        const userData = result.data;

        // 构建用户信息对象
        const userInfo = {
          id: userData.userId,
          _id: userData.userId,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          avatar: userData.avatar,
          nickName: userData.nickName,
          warehouseId: userData.warehouseId || '',
          warehouseName: userData.warehouseName || '',
          warehouseCode: userData.warehouseInfo?.code || ''
        };

        // 保存用户信息到全局
        app.globalData.currentUser = userInfo;
        app.globalData.userInfo = userInfo;
        app.globalData.isLoggedIn = true;
        app.globalData.userRole = userData.role;

        // 持久化存储到本地（重要！这样下次打开可以恢复登录状态）
        wx.setStorageSync('token', userData.userId);  // 用 userId 作为 token
        wx.setStorageSync('userInfo', userInfo);

        // 如果是仓库管理员，保存仓库信息
        if (userData.warehouseInfo) {
          app.globalData.warehouseInfo = userData.warehouseInfo;
        }

        this.setData({ logging: false });

        // 显示登录成功提示
        const roleNames: Record<string, string> = {
          'assistant': '助理',
          'warehouse_manager': '仓管',
          'finance_admin': '会计',
          'cashier': '出纳',
          'admin': '管理员'
        };

        wx.showToast({
          title: `登录成功，欢迎${userData.name}`,
          icon: 'success',
          duration: 1500
        });

        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        // 登录失败
        this.setData({ logging: false });

        wx.showModal({
          title: '登录失败',
          content: result.message || '请检查手机号和密码是否正确',
          showCancel: false
        });
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      this.setData({ logging: false });

      wx.showModal({
        title: '登录失败',
        content: error.message || '网络错误，请检查您的网络连接后重试',
        showCancel: false
      });
    }
  },

  /**
   * 显示 Toast 提示
   */
  showToast(message: string) {
    wx.showToast({
      title: message,
      icon: 'none'
    });
  },

  /**
   * 页面加载
   * 不自动跳转，让用户重新登录以确保登录信息有效
   */
  onLoad() {
    // 清除可能过期的登录状态，让用户重新登录
    // 这样可以避免使用旧的登录信息导致问题
    app.globalData.isLoggedIn = false;
    app.globalData.token = '';
    app.globalData.userInfo = null;
    app.globalData.userRole = null;

    // 清除本地存储的登录信息
    try {
      wx.removeStorageSync('token');
      wx.removeStorageSync('userInfo');

      // 同时清除业务缓存
      const info = wx.getStorageInfoSync();
      const cacheKeys = info.keys.filter((key: string) => key.startsWith('cache_'));
      cacheKeys.forEach((key: string) => {
        wx.removeStorageSync(key);
      });
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  }
});

