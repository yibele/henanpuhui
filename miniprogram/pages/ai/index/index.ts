/**
 * AI 智能助手页面
 * @description AI 对话功能，后续对接微信官方 DeepSeek
 */

import { MOCK_CHAT_HISTORY, MOCK_AI_SUGGESTIONS } from '../../../models/mock-data';
import type { ChatMessage } from '../../../models/types';

Page({
  data: {
    // 聊天消息列表
    messages: [] as ChatMessage[],
    // 输入框内容
    inputValue: '',
    // 是否正在加载回复
    loading: false,
    // 快捷问题建议
    suggestions: [] as string[],
    // 滚动位置
    scrollToMessage: ''
  },

  onLoad() {
    this.initChat();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 4 });
    }
  },

  /**
   * 初始化聊天
   */
  initChat() {
    this.setData({
      messages: MOCK_CHAT_HISTORY,
      suggestions: MOCK_AI_SUGGESTIONS
    });
  },

  /**
   * 输入内容变化
   */
  onInputChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ inputValue: e.detail.value });
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    const { inputValue, messages } = this.data;
    if (!inputValue.trim() || this.data.loading) return;

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    
    this.setData({
      messages: newMessages,
      inputValue: '',
      loading: true,
      scrollToMessage: 'msg-' + (newMessages.length - 1)
    });

    // TODO: 调用微信官方 DeepSeek API
    // 这里使用 Mock 响应
    setTimeout(() => {
      const aiResponse = this.generateMockResponse(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };

      const updatedMessages = [...this.data.messages, assistantMessage];
      
      this.setData({
        messages: updatedMessages,
        loading: false,
        scrollToMessage: 'msg-' + (updatedMessages.length - 1)
      });
    }, 1500);
  },

  /**
   * 生成 Mock AI 响应
   * TODO: 替换为实际 API 调用
   */
  generateMockResponse(question: string): string {
    // 根据问题关键词返回不同的模拟回答
    const q = question.toLowerCase();
    
    if (q.includes('收购') || q.includes('汇总')) {
      return '根据系统数据统计，本月收购情况如下：\n\n📊 收购汇总\n- 总收购量：18,000 kg\n- 已结算：5,000 kg\n- 待结算：13,000 kg\n- 涉及农户：4 户\n\n主要收购品类为成熟稻谷和干玉米，平均收购单价约 ¥2.4/kg。';
    }
    
    if (q.includes('结算') || q.includes('待结算')) {
      return '目前有 3 位农户待结算：\n\n1. 李四 - ¥6,400\n2. 王五 - ¥18,600\n3. 钱七 - ¥10,650\n\n总待结算金额：¥35,650\n\n您可以前往「结算」页面进行批量或单笔支付操作。';
    }
    
    if (q.includes('种植') || q.includes('指导')) {
      return '最近的种植指导记录：\n\n🌱 2023-07-01 - 钱七\n类型：施肥指导\n内容：土豆培土追肥建议\n\n🌱 2023-06-25 - 李四\n类型：技术指导\n内容：玉米生长期管理要点\n\n🌱 2023-06-20 - 王五\n类型：病害防治\n内容：稻飞虱防治建议';
    }
    
    if (q.includes('库存')) {
      return '当前库存情况：\n\n🏭 种子库\n- 优质稻谷A：450 kg\n- 玉米B号：1,180 kg\n- 土豆C系：860 kg\n\n📦 肥料库\n- 复合肥：300 袋\n- 尿素：150 袋\n\n🌾 成品库\n- 稻谷：15,000 kg\n- 玉米：8,000 kg';
    }
    
    // 默认回复
    return '感谢您的提问！我是普惠农录智能助手。\n\n我可以帮您：\n- 查询农户信息和统计数据\n- 了解收购和结算情况\n- 查看种植指导记录\n- 查询库存状态\n\n请问您想了解什么信息呢？';
  },

  /**
   * 点击建议问题
   */
  onSuggestionTap(e: WechatMiniprogram.TouchEvent) {
    const { text } = e.currentTarget.dataset;
    this.setData({ inputValue: text });
    this.sendMessage();
  },

  /**
   * 清空聊天记录
   */
  clearChat() {
    wx.showModal({
      title: '提示',
      content: '确定清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.initChat();
        }
      }
    });
  }
});

