/**
 * 仓库管理列表页面
 */

const app = getApp<IAppOption>();

Page({
    data: {
        // 今日日期
        todayDate: '',
        // 加载状态
        loading: true,
        // 仓库列表
        warehouses: [] as any[],

        // 操作弹窗
        showPopup: false,
        currentWarehouse: {} as any,
        operationType: 'pack', // pack | outbound

        // 表单数据
        packCount: '',
        outboundWeight: '',
        outboundCount: '',
        remark: '',

        // 提交状态
        submitting: false
    },

    onLoad() {
        this.setTodayDate();
        this.loadWarehouses();
    },

    onShow() {
        // 每次显示时刷新数据
        this.loadWarehouses();
    },

    /**
     * 设置今日日期
     */
    setTodayDate() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[now.getDay()];

        this.setData({
            todayDate: `${month}月${day}日 周${weekDay}`
        });
    },

    /**
     * 加载仓库列表
     */
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
                this.setData({
                    warehouses: result.data,
                    loading: false
                });
            } else {
                this.setData({ loading: false });
                wx.showToast({
                    title: result.message || '加载失败',
                    icon: 'none'
                });
            }
        } catch (error) {
            console.error('加载仓库列表失败:', error);
            this.setData({ loading: false });
            wx.showToast({
                title: '加载失败，请重试',
                icon: 'none'
            });
        }
    },

    /**
     * 跳转到仓库详情
     */
    goToDetail(e: any) {
        const warehouse = e.currentTarget.dataset.warehouse;
        wx.navigateTo({
            url: `/pages/stats/warehouse-detail/index?id=${warehouse._id}&name=${warehouse.name}`
        });
    },

    /**
     * 显示操作弹窗
     */
    showOperationPopup(e: any) {
        const warehouse = e.currentTarget.dataset.warehouse;
        this.setData({
            showPopup: true,
            currentWarehouse: warehouse,
            operationType: 'pack',
            packCount: '',
            outboundWeight: '',
            outboundCount: '',
            remark: ''
        });
    },

    /**
     * 关闭弹窗
     */
    closePopup() {
        this.setData({ showPopup: false });
    },

    /**
     * 弹窗显示状态变化
     */
    onPopupVisibleChange(e: any) {
        this.setData({ showPopup: e.detail.visible });
    },

    /**
     * 切换操作类型
     */
    switchOperationType(e: any) {
        const type = e.currentTarget.dataset.type;
        this.setData({ operationType: type });
    },

    /**
     * 打包数量输入
     */
    onPackCountInput(e: any) {
        this.setData({ packCount: e.detail.value });
    },

    /**
     * 出库重量输入
     */
    onOutboundWeightInput(e: any) {
        this.setData({ outboundWeight: e.detail.value });
    },

    /**
     * 出库包数输入
     */
    onOutboundCountInput(e: any) {
        this.setData({ outboundCount: e.detail.value });
    },

    /**
     * 备注输入
     */
    onRemarkInput(e: any) {
        this.setData({ remark: e.detail.value });
    },

    /**
     * 提交操作
     */
    async submitOperation() {
        const { operationType, packCount, outboundWeight, outboundCount, remark, currentWarehouse, submitting } = this.data;

        if (submitting) return;

        // 验证
        if (operationType === 'pack') {
            if (!packCount || parseInt(packCount) <= 0) {
                wx.showToast({ title: '请输入有效的打包数量', icon: 'none' });
                return;
            }
        } else {
            if (!outboundWeight && !outboundCount) {
                wx.showToast({ title: '请输入出库重量或包数', icon: 'none' });
                return;
            }
        }

        this.setData({ submitting: true });

        try {
            const currentUser = app.globalData.currentUser;

            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'addLog',
                    userId: currentUser?.id || currentUser?._id,
                    warehouseId: currentWarehouse._id,
                    type: operationType,
                    packCount: operationType === 'pack' ? parseInt(packCount) : 0,
                    outboundWeight: operationType === 'outbound' ? parseFloat(outboundWeight) || 0 : 0,
                    outboundCount: operationType === 'outbound' ? parseInt(outboundCount) || 0 : 0,
                    remark
                }
            });

            const result = res.result as any;

            this.setData({ submitting: false });

            if (result.success) {
                wx.showToast({
                    title: result.message || '提交成功',
                    icon: 'success'
                });
                this.closePopup();
                this.loadWarehouses(); // 刷新数据
            } else {
                wx.showToast({
                    title: result.message || '提交失败',
                    icon: 'none'
                });
            }
        } catch (error) {
            console.error('提交操作失败:', error);
            this.setData({ submitting: false });
            wx.showToast({
                title: '提交失败，请重试',
                icon: 'none'
            });
        }
    },

    /**
     * 下拉刷新
     */
    onPullDownRefresh() {
        this.loadWarehouses().then(() => {
            wx.stopPullDownRefresh();
        });
    }
});
