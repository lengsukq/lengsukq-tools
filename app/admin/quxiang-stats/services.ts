import type { PhoneItem, SavedRecord, SoldFilter } from "./types";

type ListQueryInput = {
  phones: string[];
  yearMonth: string;
  soldFilter: SoldFilter;
  minSoldPrice: string;
  maxSoldPrice: string;
};

type StatsQueryInput = {
  phones: string[];
  yearMonth: string;
};

const GROUP_SEPARATOR = "\u0001";

/** 复制用：每行「手机号 月份 码1、码2…」，不同手机号+月份组合换行；顺序与当前列表一致 */
export function buildQuxiangSavedListCopyText(records: SavedRecord[]): string {
  const groups = new Map<string, string[]>();
  const order: string[] = [];

  for (const item of records) {
    const phone = item.phone ?? "";
    const yearMonth = item.yearMonth ?? "";
    const key = `${phone}${GROUP_SEPARATOR}${yearMonth}`;

    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item.code);
  }

  return order
    .map((key) => {
      const [phone, yearMonth] = key.split(GROUP_SEPARATOR);
      const codes = groups.get(key)!.join("、");
      const prefix = [phone, yearMonth].filter((s) => s.length > 0).join(" ");

      return prefix.length > 0 ? `${prefix} ${codes}` : codes;
    })
    .join("\n");
}

export function getSelectedPhonesForQuery(
  selectedPhoneIds: Set<string>,
  phones: PhoneItem[],
): string[] {
  if (selectedPhoneIds.size > 0) {
    return phones
      .filter((phone) => selectedPhoneIds.has(String(phone.id)))
      .map((phone) => phone.value);
  }

  return phones.map((phone) => phone.value);
}

export function buildQuxiangListQueryParams(
  input: ListQueryInput,
): URLSearchParams {
  const params = new URLSearchParams();

  if (input.phones.length > 0) {
    params.set("phones", input.phones.join(","));
  }
  if (input.yearMonth.trim()) {
    params.set("yearMonth", input.yearMonth.trim());
  }
  if (input.soldFilter === "sold") {
    params.set("isSold", "true");
  } else if (input.soldFilter === "unsold") {
    params.set("isSold", "false");
  }
  if (input.minSoldPrice.trim()) {
    params.set("minSoldPrice", input.minSoldPrice.trim());
  }
  if (input.maxSoldPrice.trim()) {
    params.set("maxSoldPrice", input.maxSoldPrice.trim());
  }

  return params;
}

export function buildQuxiangStatsQueryParams(
  input: StatsQueryInput,
): URLSearchParams {
  const params = new URLSearchParams();

  if (input.phones.length > 0) {
    params.set("phones", input.phones.join(","));
  }
  if (input.yearMonth.trim()) {
    params.set("yearMonth", input.yearMonth.trim());
  }

  return params;
}
