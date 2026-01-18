/**
 * 发苗管理页面（助理）
 * @description 显示种苗发放记录列表
 */

// 获取应用实例
const app = getApp();

// 格式化数量
function formatQuantity(quantity: number): string {
  if (quantity >= 10000) {
    return (quantity / 10000).toFixed(1) + '万株';
  } else if (quantity >= 1000) {
    return (quantity / 1000).toFixed(1) + '千株';
  }
  return quantity + '株';
}

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  }
  return '¥' + amount.toFixed(0);
}

Page({
  data: {
    // 发苗统计
    stats: {
      totalCount: '0',
      totalQuantity: '0',
      totalAmount: '0',
      farmerCount: '0'
    },
    // 种苗发放记录
    seedRecords: [] as any[],
    // 加载状态
    loading: true
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
    // 刷新数据
    this.loadData();
  },

  /**
   * 加载数据（从云函数获取）
   */
  async loadData() {
    this.setData({ loading: true });

    try {
      // 获取当前用户信息
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[operations-index] 加载发苗记录, userId:', userId);

      // 调用云函数获取发苗记录
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'list',
          userId,  // 助理只显示自己的记录
          page: 1,
          pageSize: 100
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawRecords = result.data.list || [];

        // 格式化记录数据
        const records = rawRecords.map((r: any) => ({
          id: r._id,
          recordId: r.recordId,
          farmerId: r.farmerId,
          farmerName: r.farmerName,
          phone: r.farmerPhone || '',
          quantity: r.quantity || 0,
          unitPrice: r.unitPrice || 0,
          amount: r.amount || 0,
          distributedArea: r.distributedArea || 0,
          receiverName: r.receiverName || '',
          receiveLocation: r.receiveLocation || '',
          managerName: r.createByName || r.managerName || '',
          date: r.distributionDate || (r.createTime ? new Date(r.createTime).toLocaleDateString('zh-CN') : '')
        }));

        // 计算统计数据
        const totalCount = records.length;
        const totalQuantity = records.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
        const totalAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        // 统计涉及的农户数（去重）
        const farmerIds = new Set(records.map((r: any) => r.farmerId));

        this.setData({
          seedRecords: records,
          stats: {
            totalCount: totalCount.toString(),
            totalQuantity: formatQuantity(totalQuantity),
            totalAmount: formatAmount(totalAmount),
            farmerCount: farmerIds.size.toString()
          },
          loading: false
        });
      } else {
        console.error('获取发苗记录失败:', result.message);
        this.setData({
          seedRecords: [],
          stats: { totalCount: '0', totalQuantity: '0株', totalAmount: '¥0', farmerCount: '0' },
          loading: false
        });
      }
    } catch (error) {
      console.error('加载发苗记录失败:', error);
      this.setData({
        seedRecords: [],
        stats: { totalCount: '0', totalQuantity: '0株', totalAmount: '¥0', farmerCount: '0' },
        loading: false
      });
    }
  },

  /**
   * 新增种苗发放
   */
  onAddSeed() {
    wx.navigateTo({
      url: '/pages/operations/seed-add/index'
    });
  },

  /**
   * 查看记录详情
   */
  onRecordTap(e: any) {
    const record = e.currentTarget.dataset.record;
    wx.showModal({
      title: '发苗详情',
      content: `农户：${record.farmerName}\n数量：${record.quantity}株\n金额：¥${record.amount}\n面积：${record.distributedArea}亩\n领取人：${record.receiverName}\n日期：${record.date}`,
      showCancel: false
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
