/**
 * 仓库看板页面
 * 今日看板（固定）+ 历史记录（有数据才显示）
 */

const app = getApp<IAppOption>();

// 格式化大数字（6位数以上显示为万）
function formatLargeNumber(num: number): string {
    if (Math.abs(num) >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toFixed(0);
}

Page({
    data: {
        warehouseName: '',
        warehouseId: '',
        todayDisplay: '',
        today: '',

        // 今日数据
        todayData: {
            acquisitionWeight: 0,
            packCount: 0,
            inboundWeight: 0,  // 正数入库，负数出库
            inboundCount: 0
        },

        // 库存汇总（格式化后的字符串）
        totalStats: {
            stockWeight: 0,
            stockCount: 0,
            totalAcquisition: '',
            totalPack: '',
            totalInbound: ''
        },

        // 历史记录（只有数据的日期）
        historyList: [] as any[],
        page: 1,
        hasMore: false,
        loading: false,

        // 弹窗
        showPack: false,
        showInbound: false,
        editDate: '',
        packCountInput: '',
        inboundWeightInput: '',
        inboundCountInput: '',
        saving: false
    },

    onLoad() {
        this.initWarehouse();
        this.setToday();
    },

    onShow() {
        // 更新TabBar选中状态
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().initTabBar();
        }
        this.loadData();
    },

    initWarehouse() {
        const currentUser = app.globalData.currentUser;
        if (currentUser?.warehouseName) {
            this.setData({
                warehouseName: currentUser.warehouseName,
                warehouseId: currentUser.warehouseId
            });
        }
    },

    setToday() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const today = `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        this.setData({
            today,
            todayDisplay: `${month}月${day}日`,
            editDate: `${month}月${day}日`
        });
    },

    async loadData() {
        const currentUser = app.globalData.currentUser;
        let warehouseId = this.data.warehouseId;

        if (!warehouseId && currentUser?.warehouseId) {
            warehouseId = currentUser.warehouseId;
            this.setData({
                warehouseId,
                warehouseName: currentUser.warehouseName || '我的仓库'
            });
        }

        if (!warehouseId) return;

        this.setData({ loading: true });

        try {
            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'getDashboard',
                    warehouseId,
                    page: this.data.page
                }
            });

            const result = res.result as any;

            if (result.success) {
                const data = result.data;

                // 格式化历史记录
                const historyList = (data.historyList || []).map((item: any) => ({
                    ...item,
                    dateDisplay: this.formatDateDisplay(item.date)
                }));

                // 格式化累计数据
                const stats = data.totalStats || {};

                this.setData({
                    todayData: data.todayData || this.data.todayData,
                    totalStats: {
                        stockWeight: stats.stockWeight || 0,
                        stockCount: stats.stockCount || 0,
                        totalAcquisition: formatLargeNumber(stats.totalAcquisition || 0) + 'kg',
                        totalPack: formatLargeNumber(stats.totalPack || 0) + '包',
                        totalInbound: formatLargeNumber(stats.totalInbound || 0) + 'kg'
                    },
                    historyList: this.data.page === 1
                        ? historyList
                        : [...this.data.historyList, ...historyList],
                    hasMore: historyList.length >= 20,
                    loading: false
                });
            } else {
                this.setData({ loading: false });
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.setData({ loading: false });
        }
    },

    formatDateDisplay(dateStr: string): string {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        }
        return dateStr;
    },

    loadMore() {
        if (this.data.loading || !this.data.hasMore) return;
        this.setData({ page: this.data.page + 1 });
        this.loadData();
    },


    showInboundPopup() {
        const { todayData, todayDisplay } = this.data;
        this.setData({
            showInbound: true,
            editDate: todayDisplay,
            packCountInput: todayData.packCount ? String(todayData.packCount) : '',
            inboundWeightInput: todayData.inboundWeight ? String(todayData.inboundWeight) : '',
            inboundCountInput: todayData.inboundCount ? String(todayData.inboundCount) : ''
        });
    },

    closeInboundPopup() {
        this.setData({ showInbound: false });
    },

    onInboundPopupChange(e: any) {
        this.setData({ showInbound: e.detail.visible });
    },

    onPackInput(e: any) {
        this.setData({ packCountInput: e.detail.value });
    },

    onInboundWeightInput(e: any) {
        this.setData({ inboundWeightInput: e.detail.value });
    },

    onInboundCountInput(e: any) {
        this.setData({ inboundCountInput: e.detail.value });
    },

    async saveInbound() {
        const { warehouseId, today, packCountInput, inboundWeightInput, inboundCountInput, saving } = this.data;
        if (saving) return;

        this.setData({ saving: true });

        try {
            const currentUser = app.globalData.currentUser;
            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'saveDaily',
                    userId: currentUser?.id || currentUser?._id,
                    warehouseId,
                    date: today,
                    packCount: parseInt(packCountInput) || 0,
                    inboundWeight: parseFloat(inboundWeightInput) || 0,
                    inboundCount: parseInt(inboundCountInput) || 0
                }
            });

            const result = res.result as any;
            this.setData({ saving: false });

            if (result.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                this.closeInboundPopup();
                this.setData({ page: 1 });
                this.loadData();
            } else {
                wx.showToast({ title: result.message || '保存失败', icon: 'none' });
            }
        } catch (error) {
            this.setData({ saving: false });
            wx.showToast({ title: '保存失败', icon: 'none' });
        }
    },

    // ========== 编辑历史记录 ==========
    editHistory() {
        wx.showToast({ title: '只能编辑今日数据', icon: 'none' });
    },

    onPullDownRefresh() {
        this.setData({ page: 1 });
        this.loadData().then(() => {
            wx.stopPullDownRefresh();
        });
    }
});
