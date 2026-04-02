export type QuxiangRecordInput = {
  rawText: string;
  code: string;
  phone?: string;
  yearMonth?: string;
  isSold?: boolean;
  soldPrice?: string | null;
};

const CODE_REGEX = /领取码为([0-9A-Za-z]+)/g;

export function parseQuxiangFromLine(line: string): QuxiangRecordInput[] {
  const results: QuxiangRecordInput[] = [];
  const regex = new RegExp(CODE_REGEX);
  let match: RegExpExecArray | null;

  // 同一行中可能包含多个“领取码为XXX”，需要全部识别出来
  // 使用 while + exec 进行全局匹配
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(line)) !== null) {
    const code = match[1];
    results.push({
      rawText: line,
      code,
    });
  }

  return results;
}

export function parseQuxiangFromText(
  text: string,
): { parsed: QuxiangRecordInput[]; unparsedLines: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parsed: QuxiangRecordInput[] = [];
  const unparsedLines: string[] = [];

  for (const line of lines) {
    const records = parseQuxiangFromLine(line);
    if (records.length > 0) {
      parsed.push(...records);
    } else {
      unparsedLines.push(line);
    }
  }

  return { parsed, unparsedLines };
}

