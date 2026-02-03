/**
 * 统一格式化工具
 * @description 全局统一的数值格式化函数，避免各页面格式不一致
 */

/**
 * 格式化金额（元）
 * @param amount 金额（元）
 * @param options 配置项
 * @returns 格式化后的字符串
 * @example
 * formatAmount(15000) => "1.5万"
 * formatAmount(1500) => "1500"
 * formatAmount(1500, { withSymbol: true }) => "¥1500"
 * formatAmount(15000, { withUnit: true }) => "1.5万元"
 */
export function formatAmount(
  amount: number,
  options: { withSymbol?: boolean; withUnit?: boolean; precision?: number } = {}
): string {
  const { withSymbol = false, withUnit = false, precision = 2 } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return withSymbol ? '¥0' : '0';
  }

  let result: string;
  let unit = '';

  if (Math.abs(amount) >= 100000000) {
    // 亿
    result = (amount / 100000000).toFixed(precision).replace(/\.?0+$/, '');
    unit = '亿';
  } else if (Math.abs(amount) >= 10000) {
    // 万
    result = (amount / 10000).toFixed(precision).replace(/\.?0+$/, '');
    unit = '万';
  } else {
    // 直接显示
    result = Math.round(amount).toString();
  }

  if (withUnit && unit) {
    result = result + unit + '元';
  } else if (unit) {
    result = result + unit;
  }

  return withSymbol ? '¥' + result : result;
}

/**
 * 格式化金额（精确到分，用于详情页显示）
 * @param amount 金额（元）
 * @returns 格式化后的字符串，如 "1,234.56"
 */
export function formatAmountExact(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化重量（kg）
 * @param weight 重量（kg）
 * @param options 配置项
 * @returns 格式化后的字符串
 * @example
 * formatWeight(1500) => "1.5吨"
 * formatWeight(500) => "500kg"
 * formatWeight(1500, { alwaysKg: true }) => "1500kg"
 */
export function formatWeight(
  weight: number,
  options: { alwaysKg?: boolean; precision?: number } = {}
): string {
  const { alwaysKg = false, precision = 2 } = options;

  if (weight === null || weight === undefined || isNaN(weight)) {
    return '0kg';
  }

  if (alwaysKg) {
    return Math.round(weight) + 'kg';
  }

  if (weight >= 1000) {
    return (weight / 1000).toFixed(precision).replace(/\.?0+$/, '') + '吨';
  }

  return Math.round(weight) + 'kg';
}

/**
 * 格式化苗数（万株）
 * @param quantity 数量（万株，数据库中存储的单位）
 * @returns 格式化后的字符串
 * @example
 * formatSeedQuantity(1.5) => "1.5万株"
 * formatSeedQuantity(0.5) => "0.5万株"
 */
export function formatSeedQuantity(quantity: number): string {
  if (quantity === null || quantity === undefined || isNaN(quantity)) {
    return '0万株';
  }
  return quantity.toFixed(1).replace(/\.0$/, '') + '万株';
}

/**
 * 格式化苗数（株，原始数量）
 * @param count 数量（株）
 * @returns 格式化后的字符串
 * @example
 * formatSeedCount(15000) => "1.5万株"
 * formatSeedCount(500) => "500株"
 */
export function formatSeedCount(count: number): string {
  if (count === null || count === undefined || isNaN(count)) {
    return '0株';
  }

  if (count >= 10000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + '万株';
  }

  return Math.round(count) + '株';
}

/**
 * 格式化面积（亩）
 * @param acreage 面积（亩）
 * @returns 格式化后的字符串
 * @example
 * formatAcreage(15000) => "1.5万亩"
 * formatAcreage(500) => "500亩"
 */
export function formatAcreage(acreage: number): string {
  if (acreage === null || acreage === undefined || isNaN(acreage)) {
    return '0亩';
  }

  if (acreage >= 10000) {
    return (acreage / 10000).toFixed(1).replace(/\.0$/, '') + '万亩';
  }

  return Math.round(acreage) + '亩';
}

/**
 * 格式化百分比
 * @param value 小数值（0-1）或百分比值
 * @param isPercent 输入是否已经是百分比
 * @returns 格式化后的字符串
 * @example
 * formatPercent(0.156) => "15.6%"
 * formatPercent(15.6, true) => "15.6%"
 */
export function formatPercent(value: number, isPercent = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const percent = isPercent ? value : value * 100;
  return percent.toFixed(1).replace(/\.0$/, '') + '%';
}

/**
 * 格式化数量（通用，自动添加单位）
 * @param count 数量
 * @param unit 单位
 * @returns 格式化后的字符串
 * @example
 * formatCount(1500, '户') => "1500户"
 * formatCount(15000, '笔') => "1.5万笔"
 */
export function formatCount(count: number, unit: string = ''): string {
  if (count === null || count === undefined || isNaN(count)) {
    return '0' + unit;
  }

  if (count >= 10000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + '万' + unit;
  }

  return Math.round(count) + unit;
}

/**
 * 格式化单价
 * @param price 单价（元/kg 或 元/株）
 * @param unit 单位
 * @returns 格式化后的字符串
 * @example
 * formatPrice(3.5, 'kg') => "3.5元/kg"
 * formatPrice(0.15, '株') => "0.15元/株"
 */
export function formatPrice(price: number, unit: string = 'kg'): string {
  if (price === null || price === undefined || isNaN(price)) {
    return '0元/' + unit;
  }

  return price.toFixed(2).replace(/\.?0+$/, '') + '元/' + unit;
}
