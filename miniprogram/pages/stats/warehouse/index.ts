/**
 * 仓库管理页面 - 简洁版
 */

const app = getApp<IAppOption>();

Page({
    data: {
        todayDate: '',
        loading: true,
        myWarehouse: null as any,
        otherWarehouses: [] as any[],

        // 打包弹窗
        showPack: false,
        packCount: '',

        // 出库弹窗
        showOutbound: false,
        outboundWeight: '',
        outboundCount: ''
    },

    onLoad() {
        this.setTodayDate();
        this.loadWarehouses();
    },

    onShow() {
        this.loadWarehouses();
    },

    setTodayDate() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        this.setData({ todayDate: `${month}月${day}日` });
    },

    async loadWarehouses() {
        this.setData({ loading: true });

        try {
            const currentUser = app.globalData.currentUser;

            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'list',
                    userId: currentUser?.id || currentUser?._id
                }
            });

            const result = res.result as any;

            if (result.success) {
                const all = result.data || [];
                const my = all.find((w: any) => w.isMyWarehouse);
                const others = all.filter((w: any) => !w.isMyWarehouse);

                this.setData({
                    myWarehouse: my || null,
                    otherWarehouses: others,
                    loading: false
                });
            } else {
                this.setData({ loading: false });
            }
        } catch (error) {
            console.error('加载失败:', error);
            this.setData({ loading: false });
        }
    },

    // ========== 打包操作 ==========
    showPackPopup() {
        this.setData({ showPack: true, packCount: '' });
    },

    closePackPopup() {
        this.setData({ showPack: false });
    },

    onPackPopupChange(e: any) {
        this.setData({ showPack: e.detail.visible });
    },

    onPackInput(e: any) {
        this.setData({ packCount: e.detail.value });
    },

    async submitPack() {
        const { packCount, myWarehouse } = this.data;
        if (!packCount || parseInt(packCount) <= 0) {
            wx.showToast({ title: '请输入有效数量', icon: 'none' });
            return;
        }

        try {
            const currentUser = app.globalData.currentUser;
            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'addLog',
                    userId: currentUser?.id || currentUser?._id,
                    warehouseId: myWarehouse._id,
                    type: 'pack',
                    packCount: parseInt(packCount)
                }
            });

            const result = res.result as any;
            if (result.success) {
                wx.showToast({ title: '提交成功', icon: 'success' });
                this.closePackPopup();
                this.loadWarehouses();
            } else {
                wx.showToast({ title: result.message || '提交失败', icon: 'none' });
            }
        } catch (error) {
            wx.showToast({ title: '提交失败', icon: 'none' });
        }
    },

    // ========== 出库操作 ==========
    showOutboundPopup() {
        this.setData({ showOutbound: true, outboundWeight: '', outboundCount: '' });
    },

    closeOutboundPopup() {
        this.setData({ showOutbound: false });
    },

    onOutboundPopupChange(e: any) {
        this.setData({ showOutbound: e.detail.visible });
    },

    onOutboundWeightInput(e: any) {
        this.setData({ outboundWeight: e.detail.value });
    },

    onOutboundCountInput(e: any) {
        this.setData({ outboundCount: e.detail.value });
    },

    async submitOutbound() {
        const { outboundWeight, outboundCount, myWarehouse } = this.data;
        if (!outboundWeight && !outboundCount) {
            wx.showToast({ title: '请输入重量或包数', icon: 'none' });
            return;
        }

        try {
            const currentUser = app.globalData.currentUser;
            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'addLog',
                    userId: currentUser?.id || currentUser?._id,
                    warehouseId: myWarehouse._id,
                    type: 'outbound',
                    outboundWeight: parseFloat(outboundWeight) || 0,
                    outboundCount: parseInt(outboundCount) || 0
                }
            });

            const result = res.result as any;
            if (result.success) {
                wx.showToast({ title: '提交成功', icon: 'success' });
                this.closeOutboundPopup();
                this.loadWarehouses();
            } else {
                wx.showToast({ title: result.message || '提交失败', icon: 'none' });
            }
        } catch (error) {
            wx.showToast({ title: '提交失败', icon: 'none' });
        }
    },

    onPullDownRefresh() {
        this.loadWarehouses().then(() => {
            wx.stopPullDownRefresh();
        });
    }
});
