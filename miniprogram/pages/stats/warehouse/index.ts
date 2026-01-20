/**
 * 仓库看板页面
 * 今日收购(自动) + 打包/出库(手动)
 */

const app = getApp<IAppOption>();

Page({
    data: {
        warehouseName: '',
        warehouseId: '',
        todayDisplay: '',
        today: '',

        // 今日数据
        todayData: {
            acquisitionWeight: 0,  // 自动
            packCount: 0,          // 手动
            outWeight: 0,          // 手动
            outCount: 0            // 手动
        },

        // 库存汇总
        totalStats: {
            stockWeight: 0,        // 累计收购 - 累计出库
            stockCount: 0,         // 累计打包 - 累计出库包数
            totalAcquisition: 0,
            totalPack: 0,
            totalOutWeight: 0,
            totalOutCount: 0
        },

        // 历史记录
        historyList: [] as any[],
        page: 1,
        hasMore: false,
        loading: false,

        // 弹窗
        showEdit: false,
        editDate: '',
        packCountInput: '',
        outWeightInput: '',
        outCountInput: '',
        saving: false
    },

    onLoad() {
        this.initWarehouse();
        this.setToday();
    },

    onShow() {
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

                const historyList = (data.historyList || []).map((item: any) => ({
                    ...item,
                    dateDisplay: this.formatDateDisplay(item.date)
                }));

                const stats = data.totalStats || {};

                this.setData({
                    todayData: data.todayData || this.data.todayData,
                    totalStats: {
                        stockWeight: stats.stockWeight || 0,
                        stockCount: stats.stockCount || 0,
                        totalAcquisition: stats.totalAcquisition || 0,
                        totalPack: stats.totalPack || 0,
                        totalOutWeight: stats.totalOutWeight || 0,
                        totalOutCount: stats.totalOutCount || 0
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

    // ========== 编辑弹窗 ==========
    showEditPopup() {
        const { todayData, todayDisplay } = this.data;
        this.setData({
            showEdit: true,
            editDate: todayDisplay,
            packCountInput: todayData.packCount ? String(todayData.packCount) : '',
            outWeightInput: todayData.outWeight ? String(todayData.outWeight) : '',
            outCountInput: todayData.outCount ? String(todayData.outCount) : ''
        });
    },

    closeEditPopup() {
        this.setData({ showEdit: false });
    },

    onEditPopupChange(e: any) {
        this.setData({ showEdit: e.detail.visible });
    },

    onPackInput(e: any) {
        this.setData({ packCountInput: e.detail.value });
    },

    onOutWeightInput(e: any) {
        this.setData({ outWeightInput: e.detail.value });
    },

    onOutCountInput(e: any) {
        this.setData({ outCountInput: e.detail.value });
    },

    async saveDaily() {
        const { warehouseId, today, packCountInput, outWeightInput, outCountInput, saving } = this.data;
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
                    outWeight: parseFloat(outWeightInput) || 0,
                    outCount: parseInt(outCountInput) || 0
                }
            });

            const result = res.result as any;
            this.setData({ saving: false });

            if (result.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                this.closeEditPopup();
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

    onPullDownRefresh() {
        this.setData({ page: 1 });
        this.loadData().then(() => {
            wx.stopPullDownRefresh();
        });
    }
});
