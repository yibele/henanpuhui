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
    const acquisition = acquisitionRes.data[0] || null;

    // 获取农户完整信息（签约、欠款汇总）
    let farmer = null;
    if (settlement.farmerId) {
      const farmerRes = await db.collection('farmers')
        .where({ farmerId: settlement.farmerId })
        .get();
      if (farmerRes.data.length > 0) {
        farmer = farmerRes.data[0];
      }
    }

    return {
      success: true,
      data: {
        settlement,
        acquisition,
        farmer  // 包含签约信息、欠款汇总
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
    userId = '',              // 前端传入的用户ID
    page = 1,
    pageSize = 20,
    status = '',              // 前端传入的状态参数
    auditStatus = '',
    paymentStatus = '',
    warehouseId = '',
    keyword = '',             // 搜索关键词
    startDate = '',
    endDate = ''
  } = event;

  try {
    // 获取当前用户信息（优先使用 userId，其次使用 OPENID）
    let userRes;
    if (userId) {
      userRes = await db.collection('users')
        .where({ _id: userId })
        .get();
    } else if (OPENID) {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    }

    // 如果找不到用户，直接返回空列表（允许查看但没有权限限制）
    const currentUser = userRes && userRes.data.length > 0 ? userRes.data[0] : null;

    // 构建查询条件
    let whereCondition = {};

    // 如果是仓库管理员，只能查看自己仓库的结算单
    if (currentUser && currentUser.role === 'warehouse_manager') {
      whereCondition.warehouseId = currentUser.warehouseId;
    }

    // 如果指定了仓库ID
    if (warehouseId && (!currentUser || currentUser.role !== 'warehouse_manager')) {
      whereCondition.warehouseId = warehouseId;
    }

    // 处理状态筛选（优先使用 status，兼容 auditStatus/paymentStatus）
    const effectiveStatus = status || auditStatus || paymentStatus;
    if (effectiveStatus) {
      whereCondition.status = effectiveStatus;
    }

    // 如果指定了日期范围
    if (startDate && endDate) {
      whereCondition.acquisitionDate = _.gte(startDate).and(_.lte(endDate));
    } else if (startDate) {
      whereCondition.acquisitionDate = _.gte(startDate);
    } else if (endDate) {
      whereCondition.acquisitionDate = _.lte(endDate);
    }

    // 关键词搜索（农户姓名或电话）
    let finalWhere = whereCondition;
    const trimmedKeyword = String(keyword || '').trim();
    if (trimmedKeyword) {
      const searchRegex = db.RegExp({
        regexp: trimmedKeyword,
        options: 'i'
      });
      finalWhere = _.and([
        whereCondition,
        _.or([
          { farmerName: searchRegex },
          { farmerPhone: searchRegex }
        ])
      ]);
    }

    // 查询总数
    const countResult = await db.collection('settlements')
      .where(finalWhere)
      .count();

    // 查询数据
    const result = await db.collection('settlements')
      .where(finalWhere)
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
 * 审核结算单（会计操作）
 * 审核时实时计算扣款，确保数据准确
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

    // 权限检查：必须是会计或管理员
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
    if (settlement.status !== 'pending') {
      return {
        success: false,
        errMsg: '该结算单已审核，无法重复审核'
      };
    }

    if (approved) {
      // ============ 审核通过：实时计算扣款 ============

      // 1. 获取农户最新的欠款数据
      const farmerRes = await db.collection('farmers')
        .where({ farmerId: settlement.farmerId })
        .get();

      if (farmerRes.data.length === 0) {
        return {
          success: false,
          errMsg: '关联农户不存在'
        };
      }

      const farmer = farmerRes.data[0];
      const acquisitionAmount = settlement.acquisitionAmount || 0; // 收购货款

      // 2. 读取当前欠款余额
      // 种苗欠款 = 实际发苗金额 - 定金
      const totalSeedAmount = farmer.stats?.totalSeedAmount || 0;
      const deposit = farmer.deposit || 0;
      const currentSeedDebt = Math.max(0, totalSeedAmount - deposit);
      const currentAgriDebt = farmer.agriculturalDebt || farmer.stats?.agriculturalDebt || 0;  // 农资欠款
      const currentAdvance = farmer.advancePayment || farmer.stats?.advancePayment || 0;  // 预付款

      // 3. 计算本次可扣除金额（按优先级：预付款 > 种苗 > 农资）
      let remaining = acquisitionAmount;  // 剩余可用于扣款的金额
      let deductAdvance = 0;
      let deductSeed = 0;
      let deductAgri = 0;

      // 优先扣预付款（现金债权优先回收）
      if (remaining > 0 && currentAdvance > 0) {
        deductAdvance = Math.min(remaining, currentAdvance);
        remaining -= deductAdvance;
      }

      // 其次扣种苗欠款
      if (remaining > 0 && currentSeedDebt > 0) {
        deductSeed = Math.min(remaining, currentSeedDebt);
        remaining -= deductSeed;
      }

      // 最后扣农资欠款
      if (remaining > 0 && currentAgriDebt > 0) {
        deductAgri = Math.min(remaining, currentAgriDebt);
        remaining -= deductAgri;
      }

      const totalDeduction = deductAdvance + deductSeed + deductAgri;
      const actualPayment = remaining; // 剩余的就是实际应付给农户的

      // 4. 更新结算单（写入扣款明细和状态）
      await db.collection('settlements')
        .where({ settlementId })
        .update({
          data: {
            // 扣款明细
            advanceDeduction: deductAdvance,
            seedDeduction: deductSeed,
            agriculturalDeduction: deductAgri,
            totalDeduction: totalDeduction,
            actualPayment: Number(actualPayment.toFixed(2)),

            // 状态更新
            status: 'approved',  // 待付款

            // 审核信息
            auditorId: currentUser._id,
            auditorName: currentUser.name,
            auditTime: db.serverDate(),
            auditRemark: auditRemark || '审核通过',

            updateTime: db.serverDate()
          }
        });

      // 5. 更新农户欠款余额（扣除本次已抵扣的金额）
      const updateData = {
        updateTime: db.serverDate()
      };

      if (deductAdvance > 0) {
        updateData.advancePayment = currentAdvance - deductAdvance;
      }
      if (deductSeed > 0) {
        updateData.seedDebt = currentSeedDebt - deductSeed;
        // 如果农户使用stats结构
        updateData['stats.seedDebt'] = currentSeedDebt - deductSeed;
      }
      if (deductAgri > 0) {
        updateData.agriculturalDebt = currentAgriDebt - deductAgri;
        updateData['stats.agriculturalDebt'] = currentAgriDebt - deductAgri;
      }

      await db.collection('farmers')
        .where({ farmerId: settlement.farmerId })
        .update({ data: updateData });

      // 6. 发送通知给出纳（待付款）
      const cashierUsers = await db.collection('users')
        .where({ role: 'cashier', status: 'active' })
        .get();

      for (const cashier of cashierUsers.data) {
        await db.collection('notifications').add({
          data: {
            userId: cashier._id,
            userRole: 'cashier',
            type: 'payment_pending',
            title: '新的待付款结算',
            content: `农户${settlement.farmerName}的结算单已审核通过，待付金额￥${actualPayment.toFixed(2)}`,
            data: {
              settlementId,
              farmerName: settlement.farmerName,
              actualPayment
            },
            page: '/pages/finance/detail/index',
            params: { id: settlementId },
            isRead: false,
            priority: 'normal',
            createTime: db.serverDate()
          }
        });
      }

      // 7. 记录操作日志
      await db.collection('operation_logs').add({
        data: {
          userId: currentUser._id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'audit_settlement_approve',
          module: 'settlement',
          targetId: settlementId,
          targetName: settlement.farmerName,
          description: `审核通过结算单：${settlement.farmerName}，货款￥${acquisitionAmount}，扣款￥${totalDeduction}，实付￥${actualPayment.toFixed(2)}`,
          deductionDetail: {
            advanceDeduction: deductAdvance,
            seedDeduction: deductSeed,
            agriculturalDeduction: deductAgri,
            totalDeduction,
            actualPayment
          },
          createTime: db.serverDate()
        }
      });

      return {
        success: true,
        message: '审核通过',
        data: {
          acquisitionAmount,
          advanceDeduction: deductAdvance,
          seedDeduction: deductSeed,
          agriculturalDeduction: deductAgri,
          totalDeduction,
          actualPayment: Number(actualPayment.toFixed(2))
        }
      };
    } else {
      // ============ 审核驳回 ============
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
            status: 'rejected',
            auditorId: currentUser._id,
            auditorName: currentUser.name,
            auditTime: db.serverDate(),
            auditRemark,
            updateTime: db.serverDate()
          }
        });

      // 更新收购记录状态为审核驳回
      if (settlement.acquisitionId) {
        await db.collection('acquisitions')
          .where({ acquisitionId: settlement.acquisitionId })
          .update({
            data: {
              status: 'audit_rejected',
              auditRemark,
              updateTime: db.serverDate()
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
 * 确认付款（出纳操作）
 * 出纳线下付款后，在系统中确认
 */
async function completePayment(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    settlementId,
    paymentMethod,   // 付款方式：cash/wechat/bank
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

    // 权限检查：必须是出纳或管理员
    if (currentUser.role !== 'cashier' && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限确认付款，请使用出纳账号操作'
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

    // 状态检查：必须是已审核待付款状态
    if (settlement.status !== 'approved') {
      return {
        success: false,
        errMsg: settlement.status === 'completed' ? '该结算单已付款完成' : '该结算单尚未审核通过'
      };
    }

    // 付款方式名称映射
    const methodNames = {
      'cash': '现金',
      'wechat': '微信转账',
      'bank': '银行转账',
      'other': '其他'
    };

    // 更新结算状态为已完成
    await db.collection('settlements')
      .where({ settlementId })
      .update({
        data: {
          status: 'completed',
          paymentMethod: paymentMethod || 'cash',
          paymentMethodName: methodNames[paymentMethod] || paymentMethod || '现金',
          paymentRemark: paymentRemark || '',
          cashierId: currentUser._id,
          cashierName: currentUser.name,
          paymentTime: db.serverDate(),
          completeTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    // 更新农户的支付统计
    await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .update({
        data: {
          'stats.totalPaidAmount': _.inc(settlement.actualPayment || 0),
          updateTime: db.serverDate()
        }
      });

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'confirm_payment',
        module: 'settlement',
        targetId: settlementId,
        targetName: settlement.farmerName,
        description: `确认付款：${settlement.farmerName}，金额￥${settlement.actualPayment}，方式：${methodNames[paymentMethod] || '现金'}`,
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '付款确认成功'
    };
  } catch (error) {
    console.error('确认付款失败:', error);
    return {
      success: false,
      errMsg: error.message || '确认付款失败'
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
    // 种苗欠款 = 实际发苗金额 - 定金
    const totalSeedAmount = farmer.stats?.totalSeedAmount || 0;
    const deposit = farmer.deposit || 0;
    const seedDebt = Math.max(0, totalSeedAmount - deposit);
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

/**
 * 获取出纳统计数据
 * 用于出纳首页展示待付款统计
 */
async function getCashierStats() {
  try {
    // 获取待付款结算单（状态为approved）
    const pendingRes = await db.collection('settlements')
      .where({ status: 'approved' })
      .get();

    const pendingList = pendingRes.data || [];
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((sum, s) => sum + (s.actualPayment || 0), 0);

    // 获取今日已付款结算单
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPaidRes = await db.collection('settlements')
      .where({
        status: 'completed',
        paymentTime: _.gte(today)
      })
      .get();

    const todayPaidList = todayPaidRes.data || [];
    const todayPaidCount = todayPaidList.length;
    const todayPaidAmount = todayPaidList.reduce((sum, s) => sum + (s.actualPayment || 0), 0);

    // 获取累计已付款
    const totalPaidRes = await db.collection('settlements')
      .where({ status: 'completed' })
      .count();

    const totalPaidCount = totalPaidRes.total || 0;

    // 获取累计已付金额（使用聚合）
    const totalPaidAmountRes = await db.collection('settlements')
      .aggregate()
      .match({ status: 'completed' })
      .group({
        _id: null,
        total: $.sum('$actualPayment')
      })
      .end();

    const totalPaidAmount = totalPaidAmountRes.list[0]?.total || 0;

    return {
      success: true,
      data: {
        pendingCount,
        pendingAmount,
        todayPaidCount,
        todayPaidAmount,
        totalPaidCount,
        totalPaidAmount
      }
    };
  } catch (error) {
    console.error('获取出纳统计失败:', error);
    return {
      success: false,
      message: error.message || '获取出纳统计失败'
    };
  }
}

/**
 * 预览扣款计算
 * 会计在审核前可以预览扣款明细
 */
async function previewDeduction(event) {
  const { settlementId } = event;

  if (!settlementId) {
    return {
      success: false,
      errMsg: '缺少结算单ID'
    };
  }

  try {
    // 获取结算单
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

    // 获取农户当前欠款
    const farmerRes = await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        errMsg: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];
    const acquisitionAmount = settlement.acquisitionAmount || 0;

    // 读取当前欠款余额
    // 种苗欠款 = 实际发苗金额 - 定金
    const totalSeedAmount = farmer.stats?.totalSeedAmount || 0;
    const deposit = farmer.deposit || 0;
    const currentSeedDebt = Math.max(0, totalSeedAmount - deposit);
    const currentAgriDebt = farmer.agriculturalDebt || farmer.stats?.agriculturalDebt || 0;
    const currentAdvance = farmer.advancePayment || farmer.stats?.advancePayment || 0;

    // 计算扣款
    let remaining = acquisitionAmount;
    let deductAdvance = 0;
    let deductSeed = 0;
    let deductAgri = 0;

    if (remaining > 0 && currentAdvance > 0) {
      deductAdvance = Math.min(remaining, currentAdvance);
      remaining -= deductAdvance;
    }

    if (remaining > 0 && currentSeedDebt > 0) {
      deductSeed = Math.min(remaining, currentSeedDebt);
      remaining -= deductSeed;
    }

    if (remaining > 0 && currentAgriDebt > 0) {
      deductAgri = Math.min(remaining, currentAgriDebt);
      remaining -= deductAgri;
    }

    const totalDeduction = deductAdvance + deductSeed + deductAgri;
    const actualPayment = remaining;

    return {
      success: true,
      data: {
        acquisitionAmount,
        currentDebts: {
          advancePayment: currentAdvance,
          seedDebt: currentSeedDebt,
          agriculturalDebt: currentAgriDebt
        },
        deductions: {
          advanceDeduction: deductAdvance,
          seedDeduction: deductSeed,
          agriculturalDeduction: deductAgri,
          totalDeduction
        },
        actualPayment: Number(actualPayment.toFixed(2))
      }
    };
  } catch (error) {
    console.error('预览扣款计算失败:', error);
    return {
      success: false,
      message: error.message || '预览扣款计算失败'
    };
  }
}

// 主函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'get':
    case 'getDetail':
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
    case 'getCashierStats':
      return await getCashierStats();
    case 'previewDeduction':
      return await previewDeduction(event);
    default:
      return {
        success: false,
        errMsg: '无效的操作类型'
      };
  }
};
