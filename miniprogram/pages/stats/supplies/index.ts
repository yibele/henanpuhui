/**
 * 农资统计页面
 * @description 管理层查看公司农资使用数据
 */

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2).replace(/\.?0+$/, '') + '万';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2).replace(/\.?0+$/, '') + '千';
  }
  return '¥' + amount;
}

// Mock 数据 - 总览
const MOCK_OVERVIEW = {
  usedFarmers: 3500,       // 使用农资的农户数
  totalFarmers: 7000,      // 签约总农户数
  percent: 50,             // 占比
  totalAmount: 2450000     // 农资销售总额 245万
};

// Mock 数据 - 按负责人统计
const MOCK_SALESMAN_LIST = [
  { salesmanId: 's1', salesmanName: '王建国', farmerCount: 312, totalFarmers: 520, percent: 60, amount: 218400 },
  { salesmanId: 's2', salesmanName: '李明辉', farmerCount: 291, totalFarmers: 485, percent: 60, amount: 203700 },
  { salesmanId: 's3', salesmanName: '张伟东', farmerCount: 251, totalFarmers: 456, percent: 55, amount: 175700 },
  { salesmanId: 's4', salesmanName: '刘志强', farmerCount: 235, totalFarmers: 428, percent: 55, amount: 164500 },
  { salesmanId: 's5', salesmanName: '陈晓峰', farmerCount: 222, totalFarmers: 412, percent: 54, amount: 155400 },
  { salesmanId: 's6', salesmanName: '赵军', farmerCount: 208, totalFarmers: 398, percent: 52, amount: 145600 },
  { salesmanId: 's7', salesmanName: '孙涛', farmerCount: 198, totalFarmers: 385, percent: 51, amount: 138600 },
  { salesmanId: 's8', salesmanName: '周磊', farmerCount: 185, totalFarmers: 372, percent: 50, amount: 129500 },
  { salesmanId: 's9', salesmanName: '吴刚', farmerCount: 176, totalFarmers: 358, percent: 49, amount: 123200 },
  { salesmanId: 's10', salesmanName: '郑浩', farmerCount: 168, totalFarmers: 345, percent: 49, amount: 117600 },
  { salesmanId: 's11', salesmanName: '王伟', farmerCount: 159, totalFarmers: 332, percent: 48, amount: 111300 },
  { salesmanId: 's12', salesmanName: '李强', farmerCount: 152, totalFarmers: 318, percent: 48, amount: 106400 },
  { salesmanId: 's13', salesmanName: '张明', farmerCount: 145, totalFarmers: 305, percent: 48, amount: 101500 },
  { salesmanId: 's14', salesmanName: '刘洋', farmerCount: 138, totalFarmers: 292, percent: 47, amount: 96600 },
  { salesmanId: 's15', salesmanName: '陈峰', farmerCount: 130, totalFarmers: 278, percent: 47, amount: 91000 },
  { salesmanId: 's16', salesmanName: '赵强', farmerCount: 122, totalFarmers: 265, percent: 46, amount: 85400 },
  { salesmanId: 's17', salesmanName: '孙明', farmerCount: 115, totalFarmers: 252, percent: 46, amount: 80500 },
  { salesmanId: 's18', salesmanName: '周伟', farmerCount: 108, totalFarmers: 238, percent: 45, amount: 75600 },
  { salesmanId: 's19', salesmanName: '吴强', farmerCount: 100, totalFarmers: 225, percent: 44, amount: 70000 },
  { salesmanId: 's20', salesmanName: '郑明', farmerCount: 95, totalFarmers: 212, percent: 45, amount: 66500 }
];

Page({
  data: {
    // 总览数据
    overview: {
      farmerCount: '0户',
      percent: 0,
      totalAmount: '0',
      usedFarmers: 0,
      totalFarmers: 0
    },
    // 负责人统计列表
    salesmanList: [] as any[],
    // 显示的列表（默认5个）
    displayList: [] as any[],
    // 是否展开
    expanded: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 更新 tabbar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  // 加载数据
  loadData() {
    // 格式化总览数据
    const overview = {
      farmerCount: MOCK_OVERVIEW.usedFarmers + '户',
      percent: MOCK_OVERVIEW.percent,
      totalAmount: formatAmount(MOCK_OVERVIEW.totalAmount),
      usedFarmers: MOCK_OVERVIEW.usedFarmers,
      totalFarmers: MOCK_OVERVIEW.totalFarmers
    };

    // 格式化负责人数据
    const salesmanList = MOCK_SALESMAN_LIST.map((s, index) => ({
      ...s,
      rank: index + 1,
      formatAmount: formatAmount(s.amount)
    }));

    this.setData({
      overview,
      salesmanList,
      displayList: salesmanList.slice(0, 5)
    });
  },

  // 展开/收起
  toggleExpand() {
    const { expanded, salesmanList } = this.data;
    this.setData({
      expanded: !expanded,
      displayList: expanded ? salesmanList.slice(0, 5) : salesmanList
    });
  },

  // 跳转详情页
  goDetail() {
    wx.showToast({
      title: '详情页开发中',
      icon: 'none'
    });
  }
});

