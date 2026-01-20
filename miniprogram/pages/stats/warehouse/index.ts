/**
 * 仓库日报页面
 * 日期列表形式，每天一条记录
 */

const app = getApp<IAppOption>();

Page({
    data: {
        warehouseName: '',
        warehouseId: '',

        // 库存汇总
        totalStats: {
            stockWeight: 0,
            stockCount: 0
        },

        // 日期列表
        dailyList: [] as any[],
        page: 1,
        pageSize: 30,
        hasMore: false,
        loading: false,

        // 编辑弹窗
        showEdit: false,
        editDate: '',
        editData: {
            acquisitionWeight: 0,
            packCount: '',
            outboundWeight: '',
            outboundCount: ''
        },
        saving: false
    },

    onLoad() {
        this.initWarehouse();
    },

    onShow() {
        // 更新TabBar选中状态
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().initTabBar();
        }
        this.loadDailyList();
    },

    /**
     * 初始化仓库信息
     */
    initWarehouse() {
        const currentUser = app.globalData.currentUser;
        if (currentUser?.warehouseName) {
            this.setData({
                warehouseName: currentUser.warehouseName,
                warehouseId: currentUser.warehouseId
            });
        }
    },

    /**
     * 加载日期列表
     */
    async loadDailyList() {
        const { warehouseId, page, pageSize, dailyList } = this.data;

        if (!warehouseId) {
            const currentUser = app.globalData.currentUser;
            if (currentUser?.warehouseId) {
                this.setData({
                    warehouseId: currentUser.warehouseId,
                    warehouseName: currentUser.warehouseName || '我的仓库'
                });
            } else {
                return;
            }
        }

        this.setData({ loading: true });

        try {
            const res = await wx.cloud.callFunction({
                name: 'warehouse-manage',
                data: {
                    action: 'getDailyList',
                    warehouseId: this.data.warehouseId,
                    page,
                    pageSize
                }
            });

            const result = res.result as any;

            if (result.success) {
                const newList = result.data?.list || [];

                // 格式化日期显示
                const formattedList = newList.map((item: any) => ({
                    ...item,
                    dateDisplay: this.formatDateDisplay(item.date)
                }));

                this.setData({
                    dailyList: page === 1 ? formattedList : [...dailyList, ...formattedList],
                    totalStats: result.data?.totalStats || this.data.totalStats,
                    hasMore: newList.length === pageSize,
                    loading: false
                });
            } else {
                this.setData({ loading: false });
            }
        } catch (error) {
            console.error('加载日报列表失败:', error);
            this.setData({ loading: false });
        }
    },

    /**
     * 格式化日期显示
     */
    formatDateDisplay(dateStr: string): string {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[1]}月${parts[2]}日`;
        }
        return dateStr;
    },

    /**
     * 加载更多
     */
    loadMore() {
        if (this.data.loading || !this.data.hasMore) return;
        this.setData({ page: this.data.page + 1 });
        this.loadDailyList();
    },

    /**
     * 编辑日报
     */
    editDaily(e: any) {
        const item = e.currentTarget.dataset.item;
        this.setData({
            showEdit: true,
            editDate: item.date,
            editData: {
                acquisitionWeight: item.acquisitionWeight || 0,
                packCount: item.packCount ? String(item.packCount) : '',
                outboundWeight: item.outboundWeight ? String(item.outboundWeight) : '',
                outboundCount: item.outboundCount ? String(item.outboundCount) : ''
            }
        });
    },

    /**
     * 关闭编辑弹窗
     */
    closeEdit() {
        this.setData({ showEdit: false });
    },

    onEditPopupChange(e: any) {
        this.setData({ showEdit: e.detail.visible });
    },

    /**
     * 输入处理
     */
    onPackInput(e: any) {
        this.setData({ 'editData.packCount': e.detail.value });
    },

    onOutboundWeightInput(e: any) {
        this.setData({ 'editData.outboundWeight': e.detail.value });
    },

    onOutboundCountInput(e: any) {
        this.setData({ 'editData.outboundCount': e.detail.value });
    },

    /**
     * 保存日报
     */
    async saveDaily() {
        const { warehouseId, editDate, editData, saving } = this.data;

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
                    date: editDate,
                    packCount: parseInt(editData.packCount) || 0,
                    outboundWeight: parseFloat(editData.outboundWeight) || 0,
                    outboundCount: parseInt(editData.outboundCount) || 0
                }
            });

            const result = res.result as any;

            this.setData({ saving: false });

            if (result.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                this.closeEdit();
                this.setData({ page: 1 });
                this.loadDailyList();
            } else {
                wx.showToast({ title: result.message || '保存失败', icon: 'none' });
            }
        } catch (error) {
            console.error('保存失败:', error);
            this.setData({ saving: false });
            wx.showToast({ title: '保存失败', icon: 'none' });
        }
    },

    /**
     * 下拉刷新
     */
    onPullDownRefresh() {
        this.setData({ page: 1 });
        this.loadDailyList().then(() => {
            wx.stopPullDownRefresh();
        });
    }
});
