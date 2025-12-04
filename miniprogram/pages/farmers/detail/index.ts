/**
 * 农户详情页面
 * @description 展示农户详细信息、合同信息、业务记录
 */

import { MOCK_FARMERS, MOCK_SEED_RECORDS, MOCK_ACQUISITIONS } from '../../../models/mock-data';
import type { Farmer, SeedRecord, Acquisition } from '../../../models/types';

Page({
  data: {
    // 农户ID
    farmerId: '',
    // 农户信息
    farmer: null as Farmer | null,
    // 种苗发放记录
    seedRecords: [] as SeedRecord[],
    // 收购记录
    acquisitions: [] as Acquisition[],
    // 业务记录（合并排序）
    businessRecords: [] as any[],
    // 对话框显示控制
    dialogVisible: false,
    dialogAction: '' as 'activate' | 'suspend' | 'resume'
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ farmerId: id });
      this.loadFarmerDetail(id);
    }
  },

  /**
   * 加载农户详情
   * TODO: 替换为实际 API 调用
   */
  loadFarmerDetail(id: string) {
    // 使用 Mock 数据
    const farmer = MOCK_FARMERS.find(f => f.id === id);
    const seedRecords = MOCK_SEED_RECORDS.filter(r => r.farmerId === id);
    const acquisitions = MOCK_ACQUISITIONS.filter(r => r.farmerId === id);

    // 合并业务记录并排序
    const businessRecords = [
      ...seedRecords.map(r => ({ ...r, type: 'seed' })),
      ...acquisitions.map(r => ({ ...r, type: 'acquisition' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.setData({
      farmer,
      seedRecords,
      acquisitions,
      businessRecords
    });
  },

  /**
   * 拨打电话
   */
  onCallTap() {
    const { farmer } = this.data;
    if (farmer?.phone) {
      wx.makePhoneCall({
        phoneNumber: farmer.phone
      });
    }
  },

  /**
   * 查看合同
   */
  onViewContract() {
    wx.showToast({
      title: '合同预览功能开发中',
      icon: 'none'
    });
  },

  /**
   * 显示状态变更对话框
   */
  showStatusDialog(e: WechatMiniprogram.TouchEvent) {
    const { action } = e.currentTarget.dataset;
    this.setData({
      dialogVisible: true,
      dialogAction: action
    });
  },

  /**
   * 确认状态变更
   */
  onDialogConfirm() {
    const { farmer, dialogAction } = this.data;
    if (!farmer) return;

    let newStatus: 'active' | 'pending' | 'inactive';
    let message = '';

    switch (dialogAction) {
      case 'activate':
        newStatus = 'active';
        message = '已确认签约';
        break;
      case 'suspend':
        newStatus = 'inactive';
        message = '已暂停合作';
        break;
      case 'resume':
        newStatus = 'active';
        message = '已恢复合作';
        break;
      default:
        return;
    }

    // TODO: 调用 API 更新状态
    // 这里直接更新本地数据
    this.setData({
      'farmer.status': newStatus,
      dialogVisible: false
    });

    wx.showToast({
      title: message,
      icon: 'success'
    });
  },

  /**
   * 取消对话框
   */
  onDialogCancel() {
    this.setData({ dialogVisible: false });
  },

  /**
   * 返回上一页
   */
  onBackTap() {
    wx.navigateBack();
  }
});

