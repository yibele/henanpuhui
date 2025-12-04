/**
 * 普惠农户 CRM 小程序入口
 * @description 全局应用配置和生命周期管理
 */

// 定义全局数据接口
interface IGlobalData {
  userInfo: WechatMiniprogram.UserInfo | null;
  isLoggedIn: boolean;
  token: string;
}

// 应用实例
App<IAppOption>({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    token: ''
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
   * 从本地存储读取 token 验证登录状态
   */
  checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (token && userInfo) {
        this.globalData.isLoggedIn = true;
        this.globalData.token = token;
        this.globalData.userInfo = userInfo;
        console.log('已登录用户:', userInfo.nickName || userInfo.name);
      } else {
        this.globalData.isLoggedIn = false;
        console.log('用户未登录');
      }
    } catch (e) {
      console.error('检查登录状态失败:', e);
      this.globalData.isLoggedIn = false;
    }
  },

  /**
   * 设置登录状态
   * @param token 访问令牌
   * @param userInfo 用户信息
   */
  setLoginStatus(token: string, userInfo: any) {
    this.globalData.isLoggedIn = true;
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    
    // 持久化存储
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.isLoggedIn = false;
    this.globalData.token = '';
    this.globalData.userInfo = null;
    
    // 清除本地存储
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/index'
    });
  }
});
