type QuxiangListFilterInput = {
  phone: string | null;
  phonesParam: string | null;
  yearMonth: string | null;
  isSoldParam?: string | null;
  minSoldPriceParam?: string | null;
  maxSoldPriceParam?: string | null;
};

type BuiltFilter = {
  whereClause: string;
  values: unknown[];
  error?: string;
};

export function buildQuxiangListWhereClause(
  input: QuxiangListFilterInput,
): BuiltFilter {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (input.phonesParam) {
    const phones = input.phonesParam
      .split(",")
      .map((phone) => phone.trim())
      .filter((phone) => phone.length > 0);

    if (phones.length > 0) {
      const placeholders = phones
        .map((_, index) => `$${values.length + index + 1}`)
        .join(", ");

      conditions.push(`phone IN (${placeholders})`);
      values.push(...phones);
    }
  } else if (input.phone) {
    conditions.push(`phone = $${values.length + 1}`);
    values.push(input.phone);
  }

  if (input.yearMonth) {
    conditions.push(`year_month = $${values.length + 1}`);
    values.push(input.yearMonth);
  }

  if (input.isSoldParam === "true" || input.isSoldParam === "false") {
    conditions.push(`is_sold = $${values.length + 1}`);
    values.push(input.isSoldParam === "true");
  }

  if (input.minSoldPriceParam && input.minSoldPriceParam.trim().length > 0) {
    const min = Number(input.minSoldPriceParam);

    if (!Number.isFinite(min)) {
      return { whereClause: "", values: [], error: "minSoldPrice 非法" };
    }
    conditions.push(`sold_price >= $${values.length + 1}`);
    values.push(min);
  }

  if (input.maxSoldPriceParam && input.maxSoldPriceParam.trim().length > 0) {
    const max = Number(input.maxSoldPriceParam);

    if (!Number.isFinite(max)) {
      return { whereClause: "", values: [], error: "maxSoldPrice 非法" };
    }
    conditions.push(`sold_price <= $${values.length + 1}`);
    values.push(max);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { whereClause, values };
}
