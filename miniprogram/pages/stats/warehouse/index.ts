/**
 * 仓库看板页面
 * 今日看板（固定）+ 历史记录（有数据才显示）
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
            acquisitionWeight: 0,
            packCount: 0,
            outboundWeight: 0,
            outboundCount: 0
        },

        // 库存汇总
        totalStats: {
            stockWeight: 0,
            stockCount: 0,
            totalAcquisition: 0,
            totalPack: 0,
            totalOutbound: 0
        },

        // 历史记录（只有数据的日期）
        historyList: [] as any[],
        page: 1,
        hasMore: false,
        loading: false,

        // 弹窗
        showPack: false,
        showOutbound: false,
        editDate: '',
        packCountInput: '',
        outboundWeightInput: '',
        outboundCountInput: '',
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

                // 格式化历史记录日期显示
                const historyList = (data.historyList || []).map((item: any) => ({
                    ...item,
                    dateDisplay: this.formatDateDisplay(item.date)
                }));

                this.setData({
                    todayData: data.todayData || this.data.todayData,
                    totalStats: data.totalStats || this.data.totalStats,
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

    // ========== 打包操作 ==========
    showPackPopup() {
        const { todayData, todayDisplay } = this.data;
        this.setData({
            showPack: true,
            editDate: todayDisplay,
            packCountInput: todayData.packCount ? String(todayData.packCount) : ''
        });
    },

    closePackPopup() {
        this.setData({ showPack: false });
    },

    onPackPopupChange(e: any) {
        this.setData({ showPack: e.detail.visible });
    },

    onPackInput(e: any) {
        this.setData({ packCountInput: e.detail.value });
    },

    async savePack() {
        const { warehouseId, today, packCountInput, saving } = this.data;
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
                    packCount: parseInt(packCountInput) || 0
                }
            });

            const result = res.result as any;
            this.setData({ saving: false });

            if (result.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                this.closePackPopup();
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

    // ========== 出库操作 ==========
    showOutboundPopup() {
        const { todayData, todayDisplay } = this.data;
        this.setData({
            showOutbound: true,
            editDate: todayDisplay,
            outboundWeightInput: todayData.outboundWeight ? String(todayData.outboundWeight) : '',
            outboundCountInput: todayData.outboundCount ? String(todayData.outboundCount) : ''
        });
    },

    closeOutboundPopup() {
        this.setData({ showOutbound: false });
    },

    onOutboundPopupChange(e: any) {
        this.setData({ showOutbound: e.detail.visible });
    },

    onOutboundWeightInput(e: any) {
        this.setData({ outboundWeightInput: e.detail.value });
    },

    onOutboundCountInput(e: any) {
        this.setData({ outboundCountInput: e.detail.value });
    },

    async saveOutbound() {
        const { warehouseId, today, outboundWeightInput, outboundCountInput, saving } = this.data;
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
                    outboundWeight: parseFloat(outboundWeightInput) || 0,
                    outboundCount: parseInt(outboundCountInput) || 0
                }
            });

            const result = res.result as any;
            this.setData({ saving: false });

            if (result.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                this.closeOutboundPopup();
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
    editHistory(e: any) {
        const item = e.currentTarget.dataset.item;
        // 暂时只允许编辑今日数据
        wx.showToast({ title: '只能编辑今日数据', icon: 'none' });
    },

    onPullDownRefresh() {
        this.setData({ page: 1 });
        this.loadData().then(() => {
            wx.stopPullDownRefresh();
        });
    }
});
