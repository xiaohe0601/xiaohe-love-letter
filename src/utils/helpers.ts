import { isEmpty as isEmptyCore, isNumber, isObjectLike, isString } from "lodash-es";

/**
 * setTimeout 的 Promise 版本
 *
 * @param timeout 超时（单位: ms）
 */
export function sleep(timeout?: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

/**
 * 返回第一个有效的值，如果 value 为 null、undefined 或 NaN，则返回下一个默认值
 *
 * @param value 待检查的值
 * @param defaultValues 默认值列表
 */
export function defaultTo<T = any>(value: unknown, ...defaultValues: unknown[]): T {
  if (defaultValues.length === 0) {
    return value as T;
  }

  // eslint-disable-next-line no-self-compare
  if (value == null || value !== value) {
    return defaultTo(defaultValues[0], ...defaultValues.slice(1));
  }

  return value as T;
}

/**
 * 检查是否为空值
 *
 * @param value 待检查的值
 */
export function isEmpty(value: unknown) {
  if (value == null) {
    return true;
  }

  if (isString(value) || isObjectLike(value)) {
    return isEmptyCore(value);
  }

  return false;
}

/**
 * 携带默认值
 *
 * @param value 原始值
 * @param defaultValue 默认值
 */
export function withDefaultValue<T = any>(value: unknown, defaultValue: unknown = "-"): T {
  if (isEmpty(value)) {
    return defaultValue as T;
  }

  return value as T;
}

/**
 * 将字符串根据指定的分隔符拆分为子字符串数组
 *
 * @param value 字符串
 * @param separator 分隔符
 */
export function split(value: NullableString, separator = ",") {
  if (value == null || isEmpty(value)) {
    return [];
  }

  return value.split(separator);
}

/**
 * 类数值转为 px 数值
 *
 * @param value 类数值
 */
export function toPx(value: NullableValue<number | string>) {
  if (value == null || isEmpty(value)) {
    return 0;
  }

  if (isNumber(value)) {
    return value;
  }

  if (isNumberString(value)) {
    return Number(value);
  }

  return Number.parseFloat(value);
}

/**
 * 携带单位
 *
 * @param value 值
 * @param unit 单位
 */
export function withUnit(value: number | string, unit = "px") {
  if (isNumber(value) || isNumberString(value)) {
    return `${value}${unit}`;
  }

  return value;
}