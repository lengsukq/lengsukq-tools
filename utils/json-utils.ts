/**
 * JSON 处理工具函数
 */

/**
 * 格式化 JSON 字符串
 */
export const formatJson = (input: string): { output: string; error: string } => {
  if (!input.trim()) {
    return { output: "", error: "请输入JSON字符串" };
  }

  try {
    const parsed = JSON.parse(input);
    return { output: JSON.stringify(parsed, null, 2), error: "" };
  } catch {
    return { output: "", error: "无效的JSON格式" };
  }
};

/**
 * 压缩 JSON 字符串
 */
export const minifyJson = (input: string): { output: string; error: string } => {
  if (!input.trim()) {
    return { output: "", error: "请输入JSON字符串" };
  }

  try {
    const parsed = JSON.parse(input);
    return { output: JSON.stringify(parsed), error: "" };
  } catch {
    return { output: "", error: "无效的JSON格式" };
  }
};
