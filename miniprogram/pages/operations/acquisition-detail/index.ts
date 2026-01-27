/**
 * 收购详情页面（只读）
 * 仓库管理员查看收购记录详情
 */

const app = getApp<IAppOption>();

// 格式化日期
function formatDateTime(ts: any): string {
    try {
        const d = new Date(ts);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch {
        return '';
    }
}

// 格式化金额
function formatAmount(amount: number): string {
    if (amount >= 10000) {
        return (amount / 10000).toFixed(2) + '万';
    }
    return amount.toFixed(2);
}

Page({
    data: {
        loading: true,
        record: null as any,
        acquisitionId: ''
    },

    onLoad(options: any) {
        const { id } = options;
        if (id) {
            this.setData({ acquisitionId: id });
            this.loadDetail(id);
        } else {
            wx.showToast({ title: '参数错误', icon: 'none' });
            setTimeout(() => wx.navigateBack(), 1500);
        }
    },

    /**
     * 加载收购详情
     */
    async loadDetail(acquisitionId: string) {
        this.setData({ loading: true });

        try {
            const currentUser = app.globalData.currentUser;
            const userId = currentUser?.id || currentUser?._id;

            const res = await wx.cloud.callFunction({
                name: 'acquisition-manage',
                data: {
                    action: 'getDetail',
                    userId,
                    acquisitionId
                }
            });

            const result = res.result as any;

            if (result?.success && result.data) {
                // 格式化数据
                const raw = result.data;
                const record = {
                    ...raw,
                    // 格式化日期
                    acquisitionDateDisplay: raw.acquisitionDate || formatDateTime(raw.createTime).split(' ')[0],
                    createTimeDisplay: formatDateTime(raw.createTime),
                    // 格式化重量
                    grossWeightDisplay: (raw.grossWeight || 0).toFixed(2),
                    tareWeightDisplay: (raw.tareWeight || 0).toFixed(2),
                    moistureRateDisplay: (raw.moistureRate || 0).toFixed(1),
                    moistureWeightDisplay: (raw.moistureWeight || 0).toFixed(2),
                    netWeightDisplay: (raw.netWeight || raw.weight || 0).toFixed(2),
                    // 格式化金额
                    unitPriceDisplay: (raw.unitPrice || 0).toFixed(2),
                    totalAmountDisplay: formatAmount(raw.totalAmount || 0),
                    totalAmountRaw: (raw.totalAmount || 0).toFixed(2),
                    // 预估信息
                    estimatedWeightDisplay: (raw.estimatedWeight || 0).toFixed(2)
                };

                this.setData({
                    record,
                    loading: false
                });
            } else {
                throw new Error(result?.message || '加载失败');
            }
        } catch (e: any) {
            console.error('加载收购详情失败:', e);
            this.setData({ loading: false });
            wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
        }
    },

    /**
     * 返回上一页
     */
    onBack() {
        wx.navigateBack();
    }
});
