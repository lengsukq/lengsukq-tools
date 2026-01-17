/**
 * 工资计算器的常量配置
 */

export const DEFAULT_RATES = {
  PENSION: "0.08", // 养老保险比例
  MEDICAL: "0.02", // 医疗保险比例
  UNEMPLOYMENT: "0.005", // 失业保险比例
  HOUSING_FUND: "0.12", // 住房公积金比例
} as const;

export const DEFAULT_WORKING_HOURS = {
  DAILY: "8", // 日工作时间
  MONTHLY_DAYS: "21.75", // 月平均工作日
} as const;
