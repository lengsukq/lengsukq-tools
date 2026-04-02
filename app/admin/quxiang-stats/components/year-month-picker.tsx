"use client";

import { useEffect, useState } from "react";
import { Select, SelectItem } from "@heroui/react";

type YearMonthPickerProps = {
  label?: string;
  ariaLabel?: string;
  className?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  startYearOffset?: number;
  endYearOffset?: number;
  size?: "sm" | "md" | "lg";
};

export function YearMonthPicker({
  label,
  ariaLabel,
  className,
  value,
  onChange,
  startYearOffset = -5,
  endYearOffset = 5,
  size = "md",
}: YearMonthPickerProps) {
  const nowYear = new Date().getFullYear();
  const nowMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const years = Array.from(
    { length: endYearOffset - startYearOffset + 1 },
    (_, idx) => String(nowYear + startYearOffset + idx),
  );
  const months = Array.from({ length: 12 }, (_, idx) =>
    String(idx + 1).padStart(2, "0"),
  );

  const [externalYear, externalMonth] = (value ?? "").split("-");
  const [selectedYear, setSelectedYear] = useState(externalYear || String(nowYear));
  const [selectedMonth, setSelectedMonth] = useState(externalMonth || nowMonth);

  useEffect(() => {
    setSelectedYear(externalYear || String(nowYear));
    setSelectedMonth(externalMonth || nowMonth);
  }, [externalYear, externalMonth, nowMonth, nowYear]);

  const applyValue = (year: string, month: string) => {
    if (!year || !month) return;
    onChange(`${year}-${month}`);
  };

  return (
    <div className={className}>
      {label ? <div className="mb-1 text-sm text-foreground-600">{label}</div> : null}
      <div className="flex gap-2">
        <Select
          aria-label={ariaLabel ? `${ariaLabel}-year` : "年份"}
          placeholder="年份"
          size={size}
          selectedKeys={selectedYear ? new Set([selectedYear]) : new Set<string>()}
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const year = keys instanceof Set ? String(Array.from(keys)[0] ?? "") : "";
            setSelectedYear(year);
            applyValue(year, selectedMonth);
          }}
        >
          {years.map((year) => (
            <SelectItem key={year}>{year}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label={ariaLabel ? `${ariaLabel}-month` : "月份"}
          placeholder="月份"
          size={size}
          selectedKeys={
            selectedMonth ? new Set([selectedMonth]) : new Set<string>()
          }
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const month =
              keys instanceof Set ? String(Array.from(keys)[0] ?? "") : "";
            setSelectedMonth(month);
            applyValue(selectedYear, month);
          }}
        >
          {months.map((month) => (
            <SelectItem key={month}>{month}</SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}

