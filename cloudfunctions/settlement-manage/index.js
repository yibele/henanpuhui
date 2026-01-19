/**
 * 结算管理云函数
 * 
 * 功能：
 * - getSettlement: 获取结算单详情
 * - listSettlements: 获取结算单列表
 * - auditSettlement: 审核结算单（通过/驳回）
 * - markPayment: 标记支付中
 * - completePayment: 完成支付
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 获取结算单详情
 */
async function getSettlement(event) {
  const { settlementId } = event;

  if (!settlementId) {
    return {
      success: false,
      errMsg: '缺少结算单ID'
    };
  }

  try {
    const result = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = result.data[0];

    // 同时获取关联的收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId: settlement.acquisitionId })
      .get();

    return {
      success: true,
      data: {
        settlement,
        acquisition: acquisitionRes.data[0] || null
      }
    };
  } catch (error) {
    console.error('获取结算单详情失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取结算单详情失败'
    };
  }
}

/**
 * 获取结算单列表
 */
async function listSettlements(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    page = 1,
    pageSize = 20,
    auditStatus = '',
    paymentStatus = '',
    warehouseId = '',
    startDate = '',
    endDate = ''
  } = event;

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 构建查询条件
    let whereCondition = {};

    // 如果是仓库管理员，只能查看自己仓库的结算单
    if (currentUser.role === 'warehouse_manager') {
      whereCondition.warehouseId = currentUser.warehouseId;
    }

    // 如果指定了仓库ID
    if (warehouseId && currentUser.role !== 'warehouse_manager') {
      whereCondition.warehouseId = warehouseId;
    }

    // 如果指定了审核状态
    if (auditStatus) {
      whereCondition.auditStatus = auditStatus;
    }

    // 如果指定了支付状态
    if (paymentStatus) {
      whereCondition.paymentStatus = paymentStatus;
    }

    // 如果指定了日期范围
    if (startDate && endDate) {
      whereCondition.acquisitionDate = _.gte(startDate).and(_.lte(endDate));
    } else if (startDate) {
      whereCondition.acquisitionDate = _.gte(startDate);
    } else if (endDate) {
      whereCondition.acquisitionDate = _.lte(endDate);
    }

    // 查询总数
    const countResult = await db.collection('settlements')
      .where(whereCondition)
      .count();

    // 查询数据
    const result = await db.collection('settlements')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: {
        list: result.data,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    };
  } catch (error) {
    console.error('获取结算单列表失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取结算单列表失败'
    };
  }
}

/**
 * 审核结算单
 */
async function auditSettlement(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    settlementId,
    approved, // true: 通过, false: 驳回
    auditRemark
  } = event;

  if (!settlementId || approved === undefined) {
    return {
      success: false,
      errMsg: '缺少必填字段'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 权限检查：必须是财务或管理员
    if (currentUser.role !== 'finance_admin' && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限审核结算单'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 状态检查：只有待审核的结算单可以审核
    if (settlement.auditStatus !== 'pending') {
      return {
        success: false,
        errMsg: '该结算单已审核，无法重复审核'
      };
    }

    if (approved) {
      // 审核通过
      await db.collection('settlements')
        .where({ settlementId })
        .update({
          data: {
            auditStatus: 'approved',
            auditBy: currentUser.name,
            auditById: currentUser._id,
            auditTime: db.serverDate(),
            auditRemark: auditRemark || '审核通过',
            status: 'unpaid', // 更新总状态为待支付
            updateTime: db.serverDate()
          }
        });

      // 更新收购记录状态
      await db.collection('acquisitions')
        .where({ acquisitionId: settlement.acquisitionId })
        .update({
          data: {
            status: 'completed',
            updateTime: db.serverDate()
          }
        });

      // 发送通知给仓库管理员
      const warehouseUsers = await db.collection('users')
        .where({ warehouseId: settlement.warehouseId, role: 'warehouse_manager', status: 'active' })
        .get();

      for (const warehouseUser of warehouseUsers.data) {
        await db.collection('notifications').add({
          data: {
            userId: warehouseUser._id,
            userRole: 'warehouse',
            type: 'audit_result',
            title: '结算审核通过',
            content: `您提交的收购记录（农户${settlement.farmerName}，金额${(settlement.actualPayment / 10000).toFixed(4)}万元）已审核通过，等待支付。`,
            data: {
              settlementId,
              acquisitionId: settlement.acquisitionId,
              farmerName: settlement.farmerName,
              actualPayment: settlement.actualPayment
            },
            page: '/pages/warehouse/settlement-detail/index',
            params: {
              id: settlementId
            },
            isRead: false,
            readTime: null,
            priority: 'normal',
            createTime: db.serverDate()
          }
        });
      }

      // 记录操作日志
      await db.collection('operation_logs').add({
        data: {
          userId: currentUser._id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'audit_settlement_approve',
          module: 'settlement',
          targetId: settlementId,
          targetName: settlement.farmerName,
          description: `审核通过结算单：${settlement.farmerName}`,
          before: { auditStatus: settlement.auditStatus },
          after: { auditStatus: 'approved' },
          changes: [{ field: 'auditStatus', oldValue: 'pending', newValue: 'approved' }],
          createTime: db.serverDate()
        }
      });

      return {
        success: true,
        message: '审核通过'
      };
    } else {
      // 审核驳回
      if (!auditRemark) {
        return {
          success: false,
          errMsg: '驳回时必须填写原因'
        };
      }

      await db.collection('settlements')
        .where({ settlementId })
        .update({
          data: {
            auditStatus: 'rejected',
            auditBy: currentUser.name,
            auditById: currentUser._id,
            auditTime: db.serverDate(),
            auditRemark,
            status: 'rejected',
            updateTime: db.serverDate()
          }
        });

      // 更新收购记录状态为审核驳回
      await db.collection('acquisitions')
        .where({ acquisitionId: settlement.acquisitionId })
        .update({
          data: {
            status: 'audit_rejected',
            auditRemark,
            updateTime: db.serverDate()
          }
        });

      // 发送通知给仓库管理员
      const warehouseUsers = await db.collection('users')
        .where({ warehouseId: settlement.warehouseId, role: 'warehouse_manager', status: 'active' })
        .get();

      for (const warehouseUser of warehouseUsers.data) {
        await db.collection('notifications').add({
          data: {
            userId: warehouseUser._id,
            userRole: 'warehouse',
            type: 'audit_result',
            title: '结算审核驳回',
            content: `您提交的收购记录（农户${settlement.farmerName}）审核未通过，原因：${auditRemark}`,
            data: {
              settlementId,
              acquisitionId: settlement.acquisitionId,
              farmerName: settlement.farmerName,
              auditRemark
            },
            page: '/pages/warehouse/acquisition-detail/index',
            params: {
              id: settlement.acquisitionId
            },
            isRead: false,
            readTime: null,
            priority: 'high',
            createTime: db.serverDate()
          }
        });
      }

      // 记录操作日志
      await db.collection('operation_logs').add({
        data: {
          userId: currentUser._id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'audit_settlement_reject',
          module: 'settlement',
          targetId: settlementId,
          targetName: settlement.farmerName,
          description: `审核驳回结算单：${settlement.farmerName}，原因：${auditRemark}`,
          before: { auditStatus: settlement.auditStatus },
          after: { auditStatus: 'rejected' },
          changes: [{ field: 'auditStatus', oldValue: 'pending', newValue: 'rejected' }],
          createTime: db.serverDate()
        }
      });

      return {
        success: true,
        message: '已驳回'
      };
    }
  } catch (error) {
    console.error('审核结算单失败:', error);
    return {
      success: false,
      errMsg: error.message || '审核结算单失败'
    };
  }
}

/**
 * 标记支付中
 */
async function markPayment(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    settlementId,
    paymentMethod
  } = event;

  if (!settlementId || !paymentMethod) {
    return {
      success: false,
      errMsg: '缺少必填字段'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 权限检查：必须是财务或管理员
    if (currentUser.role !== 'finance_admin' && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限操作支付'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 状态检查：必须是审核通过且未支付
    if (settlement.auditStatus !== 'approved') {
      return {
        success: false,
        errMsg: '结算单未审核通过'
      };
    }

    if (settlement.paymentStatus !== 'unpaid') {
      return {
        success: false,
        errMsg: '结算单不是待支付状态'
      };
    }

    // 更新支付状态
    await db.collection('settlements')
      .where({ settlementId })
      .update({
        data: {
          paymentStatus: 'paying',
          paymentMethod,
          paymentBy: currentUser.name,
          paymentById: currentUser._id,
          paymentTime: db.serverDate(),
          status: 'paying',
          updateTime: db.serverDate()
        }
      });

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'mark_payment',
        module: 'settlement',
        targetId: settlementId,
        targetName: settlement.farmerName,
        description: `标记支付中：${settlement.farmerName}，方式：${paymentMethod}`,
        before: { paymentStatus: 'unpaid' },
        after: { paymentStatus: 'paying' },
        changes: [{ field: 'paymentStatus', oldValue: 'unpaid', newValue: 'paying' }],
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '已标记为支付中'
    };
  } catch (error) {
    console.error('标记支付失败:', error);
    return {
      success: false,
      errMsg: error.message || '标记支付失败'
    };
  }
}

/**
 * 完成支付
 */
async function completePayment(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    settlementId,
    paymentVoucher, // 支付凭证URL
    paymentRemark
  } = event;

  if (!settlementId) {
    return {
      success: false,
      errMsg: '缺少结算单ID'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 权限检查：必须是财务或管理员
    if (currentUser.role !== 'finance_admin' && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限操作支付'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 状态检查：必须是支付中状态
    if (settlement.paymentStatus !== 'paying') {
      return {
        success: false,
        errMsg: '结算单不是支付中状态'
      };
    }

    // 更新支付状态
    await db.collection('settlements')
      .where({ settlementId })
      .update({
        data: {
          paymentStatus: 'paid',
          paymentVoucher: paymentVoucher || '',
          paymentRemark: paymentRemark || '已支付',
          status: 'completed',
          completeTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    // 更新农户的欠款和支付统计
    if (settlement.seedDebt > 0) {
      // 如果有欠款，需要扣除
      await db.collection('farmers')
        .where({ farmerId: settlement.farmerId })
        .update({
          data: {
            'stats.currentDebt': _.inc(-settlement.seedDebt),
            'stats.totalPaidAmount': _.inc(settlement.actualPayment),
            updateTime: db.serverDate()
          }
        });
    } else {
      await db.collection('farmers')
        .where({ farmerId: settlement.farmerId })
        .update({
          data: {
            'stats.totalPaidAmount': _.inc(settlement.actualPayment),
            updateTime: db.serverDate()
          }
        });
    }

    // 发送通知给仓库管理员
    const warehouseUsers = await db.collection('users')
      .where({ warehouseId: settlement.warehouseId, role: 'warehouse_manager', status: 'active' })
      .get();

    for (const warehouseUser of warehouseUsers.data) {
      await db.collection('notifications').add({
        data: {
          userId: warehouseUser._id,
          userRole: 'warehouse',
          type: 'payment_complete',
          title: '款项已支付',
          content: `农户${settlement.farmerName}的收购款已支付完成，金额${(settlement.actualPayment / 10000).toFixed(4)}万元。`,
          data: {
            settlementId,
            farmerName: settlement.farmerName,
            actualPayment: settlement.actualPayment
          },
          page: '/pages/warehouse/settlement-detail/index',
          params: {
            id: settlementId
          },
          isRead: false,
          readTime: null,
          priority: 'normal',
          createTime: db.serverDate()
        }
      });
    }

    // TODO: 发送短信通知农户（需要集成短信服务）
    // 这里仅记录通知记录
    console.log(`TODO: 发送短信通知农户 ${settlement.farmerName}(${settlement.farmerPhone})，款项已支付：${settlement.actualPayment}元`);

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'complete_payment',
        module: 'settlement',
        targetId: settlementId,
        targetName: settlement.farmerName,
        description: `完成支付：${settlement.farmerName}，金额${settlement.actualPayment}元`,
        before: { paymentStatus: 'paying' },
        after: { paymentStatus: 'paid' },
        changes: [{ field: 'paymentStatus', oldValue: 'paying', newValue: 'paid' }],
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '支付完成'
    };
  } catch (error) {
    console.error('完成支付失败:', error);
    return {
      success: false,
      errMsg: error.message || '完成支付失败'
    };
  }
}

/**
 * 重新计算结算金额（财务操作）
 * 结算公式：收购总额 - 种苗欠款 - 农资款 - 预支款项
 */
async function recalculateSettlement(event) {
  const { userId, settlementId, agriculturalDebt, advancePayment, remark } = event;

  if (!userId || !settlementId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 权限检查：只有财务和管理员可以操作
    if (!['finance_admin', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        message: '无权限重新计算结算'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        message: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 获取农户信息
    const farmerRes = await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 计算各项扣款
    const grossAmount = settlement.grossAmount || 0;  // 收购总额
    const seedDebt = farmer.seedDebt || 0;            // 种苗欠款
    const agriDebt = parseFloat(agriculturalDebt) || farmer.agriculturalDebt || 0;  // 农资款
    const advPay = parseFloat(advancePayment) || farmer.advancePayment || 0;        // 预支款

    // 新结算公式
    const totalDeductions = seedDebt + agriDebt + advPay;
    const actualPayment = grossAmount - totalDeductions;

    // 记录修改日志
    await db.collection('modification_logs').add({
      data: {
        targetType: 'settlement',
        targetId: settlementId,
        action: 'recalculate',
        beforeData: {
          grossAmount: settlement.grossAmount,
          seedDebt: settlement.seedDebt,
          agriculturalDebt: settlement.agriculturalDebt || 0,
          advancePayment: settlement.advancePayment || 0,
          actualPayment: settlement.actualPayment
        },
        afterData: {
          grossAmount,
          seedDebt,
          agriculturalDebt: agriDebt,
          advancePayment: advPay,
          actualPayment
        },
        reason: remark || '财务重新计算结算金额',
        operatorId: userId,
        operatorName: currentUser.name,
        createTime: db.serverDate()
      }
    });

    // 更新结算单
    await db.collection('settlements')
      .where({ settlementId })
      .update({
        data: {
          seedDebt,
          agriculturalDebt: agriDebt,
          advancePayment: advPay,
          totalDeductions,
          actualPayment: Number(actualPayment.toFixed(2)),
          recalculateBy: currentUser.name,
          recalculateById: userId,
          recalculateTime: db.serverDate(),
          recalculateRemark: remark || '',
          updateTime: db.serverDate()
        }
      });

    // 更新农户的农资款和预支款记录
    await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .update({
        data: {
          agriculturalDebt: agriDebt,
          advancePayment: advPay,
          updateTime: db.serverDate()
        }
      });

    return {
      success: true,
      message: '结算金额已更新',
      data: {
        grossAmount,
        seedDebt,
        agriculturalDebt: agriDebt,
        advancePayment: advPay,
        totalDeductions,
        actualPayment: Number(actualPayment.toFixed(2))
      }
    };
  } catch (error) {
    console.error('重新计算结算失败:', error);
    return {
      success: false,
      message: error.message || '重新计算结算失败'
    };
  }
}

// 主函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'get':
      return await getSettlement(event);
    case 'list':
      return await listSettlements(event, context);
    case 'audit':
      return await auditSettlement(event, context);
    case 'markPayment':
      return await markPayment(event, context);
    case 'completePayment':
      return await completePayment(event, context);
    case 'recalculate':
      return await recalculateSettlement(event);
    default:
      return {
        success: false,
        errMsg: '无效的操作类型'
      };
  }
};
