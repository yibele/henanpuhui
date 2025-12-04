/**
 * 登录页面
 * @description 手机号验证码登录
 */

import { MOCK_USER } from '../../models/mock-data';

// 获取应用实例
const app = getApp<IAppOption>();

Page({
  data: {
    // 手机号
    phone: '',
    // 验证码
    code: '',
    // 验证码倒计时
    countdown: 0,
    // 是否正在发送验证码
    sending: false,
    // 是否正在登录
    logging: false,
    // 是否同意协议
    agreed: true,
    // Toast 显示控制
    toastVisible: false,
    toastMessage: ''
  },

  /**
   * 输入手机号
   */
  onPhoneInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      phone: e.detail.value
    });
  },

  /**
   * 输入验证码
   */
  onCodeInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      code: e.detail.value
    });
  },

  /**
   * 发送验证码
   */
  sendCode() {
    const { phone, countdown, sending } = this.data;

    // 防止重复发送
    if (countdown > 0 || sending) return;

    // 验证手机号格式
    if (!this.validatePhone(phone)) {
      this.showToast('请输入正确的手机号');
      return;
    }

    this.setData({ sending: true });

    // TODO: 调用后端 API 发送验证码
    // 这里模拟发送成功
    setTimeout(() => {
      this.setData({
        sending: false,
        countdown: 60
      });
      this.showToast('验证码已发送');
      this.startCountdown();
    }, 1000);
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    const timer = setInterval(() => {
      const { countdown } = this.data;
      if (countdown <= 1) {
        clearInterval(timer);
        this.setData({ countdown: 0 });
      } else {
        this.setData({ countdown: countdown - 1 });
      }
    }, 1000);
  },

  /**
   * 验证手机号格式
   */
  validatePhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  /**
   * 验证验证码格式
   */
  validateCode(code: string): boolean {
    return /^\d{4,6}$/.test(code);
  },

  /**
   * 登录
   */
  async handleLogin() {
    const { phone, code, agreed, logging } = this.data;

    // 防止重复提交
    if (logging) return;

    // 验证是否同意协议
    if (!agreed) {
      this.showToast('请先同意用户协议');
      return;
    }

    // 验证手机号
    if (!this.validatePhone(phone)) {
      this.showToast('请输入正确的手机号');
      return;
    }

    // 验证验证码
    if (!this.validateCode(code)) {
      this.showToast('请输入正确的验证码');
      return;
    }

    this.setData({ logging: true });

    // TODO: 调用后端 API 进行登录验证
    // 这里使用 Mock 数据模拟登录成功
    setTimeout(() => {
      // 模拟登录成功
      const mockToken = 'mock_token_' + Date.now();
      const mockUser = {
        ...MOCK_USER,
        phone: phone
      };

      // 保存登录状态
      app.setLoginStatus(mockToken, mockUser);

      this.setData({ logging: false });
      this.showToast('登录成功');

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 500);
    }, 1500);
  },

  /**
   * 切换协议同意状态
   */
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    });
  },

  /**
   * 查看用户协议
   */
  viewUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议内容，正式版本请替换为实际协议文本。',
      showCancel: false
    });
  },

  /**
   * 查看隐私政策
   */
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策内容，正式版本请替换为实际政策文本。',
      showCancel: false
    });
  },

  /**
   * 显示 Toast 提示
   */
  showToast(message: string) {
    this.setData({
      toastVisible: true,
      toastMessage: message
    });
  },

  /**
   * 关闭 Toast
   */
  onToastClose() {
    this.setData({
      toastVisible: false
    });
  },

  onLoad() {
    // 如果已登录，直接跳转首页
    if (app.globalData.isLoggedIn) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  }
});

