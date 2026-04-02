"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from "@heroui/react";

import type { QuxiangRecordInput } from "@/lib/quxiang";
import { parseQuxiangFromText } from "@/lib/quxiang";
import { YearMonthPicker } from "./components/year-month-picker";

type ParsedRow = QuxiangRecordInput & {
  id: number;
  status?: "pending" | "saved" | "error";
  errorMessage?: string;
};

type SavedRecord = {
  id: number;
  code: string;
  phone: string | null;
  yearMonth: string | null;
  isSold: boolean;
  soldPrice: string | null;
  createdAt: string;
  rawText: string;
};

type EditableSavedRecord = {
  id: number;
  code: string;
  phone: string;
  yearMonth: string;
  isSold: boolean;
  soldPrice: string;
};

type StatsItem = {
  phone: string;
  yearMonth: string | null;
  totalCodes: number;
  soldCount: number;
  totalSoldPrice: string | null;
};

type PhoneItem = {
  id: number;
  value: string;
};

/** 复制用：每行「手机号 月份 码1、码2…」，不同手机号+月份组合换行；顺序与当前列表一致 */
function buildQuxiangSavedListCopyText(records: SavedRecord[]): string {
  const GROUP_SEP = "\u0001";
  const groups = new Map<string, string[]>();
  const order: string[] = [];

  for (const item of records) {
    const phone = item.phone ?? "";
    const yearMonth = item.yearMonth ?? "";
    const key = `${phone}${GROUP_SEP}${yearMonth}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item.code);
  }

  return order
    .map((key) => {
      const [phone, yearMonth] = key.split(GROUP_SEP);
      const codes = groups.get(key)!.join("、");
      const prefix = [phone, yearMonth].filter((s) => s.length > 0).join(" ");
      return prefix.length > 0 ? `${prefix} ${codes}` : codes;
    })
    .join("\n");
}

// 可滚动表格内：Popover 默认 shouldCloseOnScroll 会在滚动时关闭下拉，需关闭；v2 文档见 https://v2.heroui.com/docs/components/select
const PARSED_TABLE_SELECT_POPOVER_PROPS = {
  placement: "bottom-start" as const,
  shouldCloseOnScroll: false,
  shouldBlockScroll: false,
};

export default function QuxiangStatsPage() {
  const [authorized, setAuthorized] = useState<"unknown" | "yes" | "no">(
    "unknown",
  );
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [inputText, setInputText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [unparsedLines, setUnparsedLines] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [phones, setPhones] = useState<PhoneItem[]>([]);
  const [unifiedPhoneId, setUnifiedPhoneId] = useState<string | null>(null);
  const [selectedPhoneIds, setSelectedPhoneIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [filterYearMonth, setFilterYearMonth] = useState("");
  const [soldFilter, setSoldFilter] = useState<"all" | "sold" | "unsold">(
    "all",
  );
  const [minSoldPrice, setMinSoldPrice] = useState("");
  const [maxSoldPrice, setMaxSoldPrice] = useState("");
  const [querying, setQuerying] = useState(false);
  const [savedList, setSavedList] = useState<SavedRecord[]>([]);
  const [selectedSavedIds, setSelectedSavedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkSavedIsSold, setBulkSavedIsSold] = useState(false);
  const [bulkSavedPrice, setBulkSavedPrice] = useState("");
  const [bulkUpdatingSaved, setBulkUpdatingSaved] = useState(false);
  const [editSavedOpen, setEditSavedOpen] = useState(false);
  const [editingSaved, setEditingSaved] = useState<EditableSavedRecord | null>(
    null,
  );
  const [stats, setStats] = useState<StatsItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingPhones, setEditingPhones] = useState<PhoneItem[]>([]);
  const [bulkIsSold, setBulkIsSold] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/admin/me");
        if (!response.ok) {
          setAuthorized("no");
        } else {
          setAuthorized("yes");
        }
      } catch {
        setAuthorized("no");
      } finally {
        setLoadingAuth(false);
      }
    }

    checkAuth();
  }, []);

  useEffect(() => {
    async function fetchPhones() {
      try {
        const response = await fetch("/api/admin/quxiang/phones");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const items = (data.items ?? []) as {
          id: number;
          phone: string;
        }[];
        const nextPhones: PhoneItem[] = items.map((item) => ({
          id: item.id,
          value: item.phone,
        }));
        setPhones(nextPhones);
        setSelectedPhoneIds(
          new Set(nextPhones.map((phone) => String(phone.id))),
        );
      } catch {
        // 忽略加载错误，后续操作中再提示
      }
    }

    if (authorized === "yes") {
      fetchPhones();
    }
  }, [authorized]);

  const canSave = useMemo(() => {
    if (parsedRows.length === 0) {
      return false;
    }
    const hasUnsaved = parsedRows.some((row) => row.status !== "saved");
    if (!hasUnsaved) {
      return false;
    }
    // 所有行都必须有手机号和日期（YYYY-MM）
    const allHasPhoneAndMonth = parsedRows.every(
      (row) => row.phone && row.phone.trim() !== "" && row.yearMonth && row.yearMonth.trim() !== "",
    );
    return allHasPhoneAndMonth;
  }, [parsedRows]);

  function handleParse() {
    const { parsed, unparsedLines: unparsed } = parseQuxiangFromText(inputText);
    let nextId = 1;
    // 解析时，尽量使用当前选择/配置的手机号作为默认值
    const phonesForQuery = getSelectedPhonesForQuery();
    const defaultPhone =
      phonesForQuery.length === 1 ? phonesForQuery[0] : undefined;

    const rows: ParsedRow[] = parsed.map((item) => ({
      ...item,
      id: nextId++,
      status: "pending",
      phone: item.phone ?? defaultPhone,
    }));
    setParsedRows(rows);
    setUnparsedLines(unparsed);
  }

  function updateRow(
    id: number,
    updater: (row: ParsedRow) => ParsedRow,
  ) {
    setParsedRows((rows) => rows.map((row) => (row.id === id ? updater(row) : row)));
  }

  function addManualRow() {
    setParsedRows((rows) => {
      const nextId =
        rows.length > 0 ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
      return [
        ...rows,
        {
          id: nextId,
          rawText: "手动添加",
          code: "",
          status: "pending",
        },
      ];
    });
  }

  /** 从当前已加载的 phones（数据库）同步到弹框编辑列表 */
  function initEditingPhonesFromStore() {
    setEditingPhones(
      phones.length === 0
        ? [{ id: 0, value: "" }]
        : phones.map((p) => ({ ...p })),
    );
  }

  function openPhoneConfigModal() {
    initEditingPhonesFromStore();
    setConfigModalOpen(true);
  }

  async function handleSaveAll() {
    if (!canSave) return;
    setSaving(true);

    try {
      const payload = parsedRows.map((row) => ({
        rawText: row.rawText,
        code: row.code,
        phone: row.phone,
        yearMonth: row.yearMonth,
        isSold: row.isSold ?? false,
        soldPrice: row.soldPrice ? Number(row.soldPrice) : undefined,
      }));

      const response = await fetch("/api/admin/quxiang/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: payload }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        setParsedRows((rows) =>
          rows.map((row) => ({
            ...row,
            status: "error",
            errorMessage: "保存失败",
          })),
        );
        return;
      }

      const resultStatuses: Array<{
        index: number;
        ok: boolean;
        error?: string;
      }> = data.results ?? [];

      setParsedRows((rows) =>
        rows.map((row, index) => {
          const status = resultStatuses.find((r) => r.index === index);
          if (!status) {
            return {
              ...row,
              status: "error",
              errorMessage: "未知结果",
            };
          }
          if (!status.ok) {
            return {
              ...row,
              status: "error",
              errorMessage: status.error ?? "保存失败",
            };
          }
          return {
            ...row,
            status: "saved",
            errorMessage: undefined,
          };
        }),
      );
    } finally {
      setSaving(false);
    }
  }

  function getSelectedPhonesForQuery(): string[] {
    if (selectedPhoneIds.size > 0) {
      return phones
        .filter((p) => selectedPhoneIds.has(String(p.id)))
        .map((p) => p.value);
    }
    return phones.map((p) => p.value);
  }

  async function handleQuery() {
    setQuerying(true);
    try {
      const params = new URLSearchParams();
      const phonesForQuery = getSelectedPhonesForQuery();
      if (phonesForQuery.length > 0) {
        params.set("phones", phonesForQuery.join(","));
      }
      if (filterYearMonth.trim()) {
        params.set("yearMonth", filterYearMonth.trim());
      }

      if (soldFilter === "sold") {
        params.set("isSold", "true");
      } else if (soldFilter === "unsold") {
        params.set("isSold", "false");
      }

      if (minSoldPrice.trim()) {
        params.set("minSoldPrice", minSoldPrice.trim());
      }
      if (maxSoldPrice.trim()) {
        params.set("maxSoldPrice", maxSoldPrice.trim());
      }

      const response = await fetch(
        `/api/admin/quxiang/list?${params.toString()}`,
      );
      if (!response.ok) {
        setSavedList([]);
        return;
      }
      const data = (await response.json()) as {
        items: SavedRecord[];
      };
      setSavedList(data.items ?? []);
    } finally {
      setQuerying(false);
    }
  }

  async function handleLoadStats() {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      const phonesForQuery = getSelectedPhonesForQuery();
      if (phonesForQuery.length > 0) {
        params.set("phones", phonesForQuery.join(","));
      }
      if (filterYearMonth.trim()) {
        params.set("yearMonth", filterYearMonth.trim());
      }

      const response = await fetch(
        `/api/admin/quxiang/stats?${params.toString()}`,
      );
      if (!response.ok) {
        setStats([]);
        return;
      }
      const data = (await response.json()) as { items: StatsItem[] };
      setStats(data.items ?? []);
    } finally {
      setLoadingStats(false);
    }
  }

  function openEditSaved(item: SavedRecord) {
    setEditingSaved({
      id: item.id,
      code: item.code,
      phone: item.phone ?? "",
      yearMonth: item.yearMonth ?? "",
      isSold: item.isSold,
      soldPrice: item.soldPrice ?? "",
    });
    setEditSavedOpen(true);
  }

  async function handleSaveEditedSaved() {
    if (!editingSaved) return;
    const payload = {
      id: editingSaved.id,
      code: editingSaved.code,
      phone: editingSaved.phone,
      yearMonth: editingSaved.yearMonth,
      isSold: editingSaved.isSold,
      soldPrice: editingSaved.soldPrice || null,
    };

    const response = await fetch("/api/admin/quxiang/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as
      | { item: SavedRecord; error?: string }
      | null;

    if (!response.ok || !data?.item) {
      // 简单失败处理：保持弹窗打开，用户可继续修改；必要时可加 toast
      return;
    }

    setSavedList((current) =>
      current.map((row) => (row.id === data.item.id ? data.item : row)),
    );
    setEditSavedOpen(false);
    setEditingSaved(null);
  }

  async function handleBulkUpdateSaved() {
    if (selectedSavedIds.size === 0) return;
    setBulkUpdatingSaved(true);
    try {
      const ids = Array.from(selectedSavedIds)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      if (ids.length === 0) return;

      const nextIsSold = bulkSavedIsSold;
      const soldPrice =
        nextIsSold && bulkSavedPrice.trim().length > 0
          ? Number(bulkSavedPrice)
          : null;

      const response = await fetch("/api/admin/quxiang/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids,
          isSold: nextIsSold,
          soldPrice,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: true; updatedIds: number[] }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !data || (data as any).ok !== true) {
        return;
      }

      setSavedList((current) =>
        current.map((row) =>
          ids.includes(row.id)
            ? {
                ...row,
                isSold: nextIsSold,
                soldPrice:
                  nextIsSold && soldPrice !== null ? String(soldPrice) : null,
              }
            : row,
        ),
      );
      setSelectedSavedIds(new Set());
    } finally {
      setBulkUpdatingSaved(false);
    }
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="检查权限中..." />
      </div>
    );
  }

  if (authorized !== "yes") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <p className="text-default-500 text-sm">未授权访问，请先登录管理员账号。</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">趣象统计</h1>
          <p className="text-sm text-default-500">
            粘贴短信内容（可一次多条），系统会自动识别“领取码为XXX”中的领取码，并支持按手机号和日期（YYYY-MM）进行归档管理。
          </p>
          <p className="text-xs text-default-400">
            示例： 【西安象非象】您已成功订购权益会员，领取码为5epRc9，领取方式...
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button size="sm" variant="flat" onPress={openPhoneConfigModal}>
            配置手机号列表
          </Button>
          {phones.length > 0 ? (
            <div className="flex max-w-xl flex-col items-end gap-1 text-right">
              <p className="text-xs text-default-500">
                已保存到数据库的手机号（点击上方按钮可修改）：
              </p>
              <div className="flex flex-wrap justify-end gap-1">
                {phones.map((p) => (
                  <Chip key={p.id} size="sm" variant="bordered">
                    {p.value}
                  </Chip>
                ))}
              </div>
            </div>
          ) : (
            <p className="max-w-xs text-right text-xs text-default-400">
              尚未配置手机号；配置后会写入数据库，下次打开本页自动加载。
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col items-start gap-1">
            <h2 className="text-sm font-semibold">粘贴短信内容</h2>
            <p className="text-xs text-default-500">
              将从运营商收到的短信原文粘贴到下方文本框中（支持多行，每行一条）。
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <Textarea
              minRows={8}
              placeholder="在此粘贴短信内容，每行一条..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <Button
              className="w-full sm:w-auto"
              color="primary"
              onPress={handleParse}
            >
              解析预览
            </Button>

            {unparsedLines.length > 0 ? (
              <div className="mt-2 rounded-medium bg-warning-50 p-3 text-xs text-warning-700">
                <p className="font-semibold">未能识别领取码的行：</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {unparsedLines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-start gap-1">
            <h2 className="text-sm font-semibold">解析结果与归类</h2>
            <p className="text-xs text-default-500">
              为解析出的领取码指定手机号与日期（YYYY-MM），然后批量保存到数据库。所有行都需要填写手机号和日期后才能保存。
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Select
                  className="w-64 max-w-full"
                  label="统一手机号（可选）"
                  placeholder={
                    phones.length === 0
                      ? "请先在顶部配置手机号"
                      : "选择一个手机号"
                  }
                  selectedKeys={
                    unifiedPhoneId
                      ? new Set([unifiedPhoneId])
                      : new Set<string>()
                  }
                  onSelectionChange={(keys) => {
                    if (keys === "all") return;
                    const nextId =
                      keys instanceof Set
                        ? Array.from(keys)[0]
                        : undefined;
                    const phoneValue =
                      nextId === undefined
                        ? undefined
                        : phones.find((p) => String(p.id) === String(nextId))
                            ?.value;
                    if (nextId !== undefined && !phoneValue) return;
                    setUnifiedPhoneId(
                      nextId === undefined ? null : String(nextId),
                    );
                    setParsedRows((rows) =>
                      rows.map((row) => ({
                        ...row,
                        phone: phoneValue,
                      })),
                    );
                  }}
                  isDisabled={phones.length === 0}
                >
                  {phones.map((phone) => (
                    <SelectItem key={String(phone.id)}>
                      {phone.value}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <YearMonthPicker
                  className="max-w-xs"
                  label="统一日期（可选，按月，YYYY-MM）"
                  ariaLabel="统一日期"
                  size="sm"
                  onChange={(ym) => {
                    if (!ym) return;
                    setParsedRows((rows) =>
                      rows.map((row) => ({
                        ...row,
                        yearMonth: ym,
                      })),
                    );
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  color="primary"
                  isDisabled={!canSave}
                  isLoading={saving}
                  size="sm"
                  onPress={handleSaveAll}
                >
                  保存全部
                </Button>
                <div className="flex items-center gap-2">
                  <Switch
                    aria-label="统一售出状态"
                    isSelected={bulkIsSold}
                    size="sm"
                    onChange={(e) => setBulkIsSold(e.target.checked)}
                  >
                    设为已售出
                  </Switch>
                  <Input
                    className="w-32"
                    aria-label="统一售出价格"
                    placeholder="价格"
                    size="sm"
                    type="number"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      setParsedRows((rows) =>
                        rows.map((row) => ({
                          ...row,
                          isSold: bulkIsSold,
                          soldPrice: bulkPrice || null,
                        })),
                      );
                    }}
                  >
                    应用到全部
                  </Button>
                </div>
                {!canSave && parsedRows.length > 0 ? (
                  <span className="text-xs text-warning-600">
                    请先为所有领取码填写手机号和日期（YYYY-MM）。
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-default-500">
              <span>
                解析成功 {parsedRows.length} 条
                {unparsedLines.length > 0 ? `，未识别 ${unparsedLines.length} 行` : ""}
              </span>
              <Button size="sm" variant="flat" onPress={addManualRow}>
                手动新增一条记录
              </Button>
            </div>

            <div className="max-h-64 overflow-auto rounded-medium border border-default-200">
              <Table
                aria-label="解析结果"
                removeWrapper
                classNames={{
                  table: "min-w-full",
                }}
                shadow="none"
              >
                <TableHeader>
                  <TableColumn>领取码</TableColumn>
                  <TableColumn>手机号</TableColumn>
                  <TableColumn>日期（YYYY-MM）</TableColumn>
                  <TableColumn>是否售出</TableColumn>
                  <TableColumn>售出价格</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody emptyContent="暂无解析结果">
                  {parsedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          aria-label="领取码"
                          size="sm"
                          value={row.code}
                          onChange={(e) =>
                            updateRow(row.id, (prev) => ({
                              ...prev,
                              code: e.target.value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          aria-label="手机号"
                          className="max-w-[12rem] min-w-[8rem]"
                          placeholder={
                            phones.length === 0
                              ? "请先在顶部配置手机号"
                              : "选择手机号"
                          }
                          popoverProps={PARSED_TABLE_SELECT_POPOVER_PROPS}
                          classNames={{
                            popoverContent: "z-[10050]",
                          }}
                          selectionMode="single"
                          selectedKeys={(() => {
                            const match = phones.find(
                              (p) => p.value === row.phone,
                            );
                            return match
                              ? new Set([String(match.id)])
                              : new Set<string>();
                          })()}
                          onSelectionChange={(keys) => {
                            if (keys === "all") return;
                            const nextId =
                              keys instanceof Set
                                ? Array.from(keys)[0]
                                : undefined;
                            const phoneValue =
                              nextId === undefined
                                ? undefined
                                : phones.find(
                                    (p) => String(p.id) === String(nextId),
                                  )?.value;
                            updateRow(row.id, (prev) => ({
                              ...prev,
                              phone: phoneValue,
                            }));
                          }}
                          isDisabled={phones.length === 0}
                          size="sm"
                        >
                          {phones.map((phone) => (
                            <SelectItem
                              key={String(phone.id)}
                              textValue={phone.value}
                            >
                              {phone.value}
                            </SelectItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <YearMonthPicker
                          className="max-w-[10rem]"
                          ariaLabel="解析结果日期"
                          size="sm"
                          value={row.yearMonth ?? null}
                          onChange={(ym) => {
                            updateRow(row.id, (prev) => ({
                              ...prev,
                              yearMonth: ym ?? undefined,
                            }));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        <Switch
                          aria-label="是否售出"
                          isSelected={row.isSold ?? false}
                          size="sm"
                          onChange={(e) =>
                            updateRow(row.id, (prev) => ({
                              ...prev,
                              isSold: e.target.checked,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label="售出价格"
                          placeholder="0.00"
                          size="sm"
                          type="number"
                          // 确保传给 Input 的始终是字符串
                          value={row.soldPrice ?? ""}
                          onChange={(e) =>
                            updateRow(row.id, (prev) => ({
                              ...prev,
                              // 内部存成字符串，后端再做 Number 转换
                              soldPrice: e.target.value || null,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.status === "saved"
                          ? "已保存"
                          : row.status === "error"
                            ? row.errorMessage ?? "保存失败"
                            : "待保存"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => {
                            setParsedRows((rows) =>
                              rows.filter((item) => item.id !== row.id),
                            );
                          }}
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-sm font-semibold">归档查询</h2>
          <p className="text-xs text-default-500">
            根据手机号和日期（YYYY-MM）查询历史记录，支持部分条件留空。
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Select
                className="w-72 max-w-full"
                label="手机号（可多选）"
                placeholder={
                  phones.length === 0
                    ? "请先在顶部配置手机号"
                    : "不选则默认全部"
                }
                selectionMode="multiple"
                selectedKeys={selectedPhoneIds}
                onSelectionChange={(keys) => {
                  const next =
                    keys instanceof Set
                      ? (keys as Set<string>)
                      : new Set<string>();
                  setSelectedPhoneIds(next);
                }}
                isDisabled={phones.length === 0}
              >
                {phones.map((phone) => (
                  <SelectItem key={String(phone.id)}>{phone.value}</SelectItem>
                ))}
              </Select>
              {phones.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {phones.map((phone) => {
                    const key = String(phone.id);
                    return (
                      <Chip
                        key={key}
                        size="sm"
                        variant={selectedPhoneIds.has(key) ? "solid" : "flat"}
                      >
                        {phone.value}
                      </Chip>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <YearMonthPicker
                className="max-w-xs"
                label="日期（可选，按月筛选，YYYY-MM）"
                ariaLabel="归档筛选日期"
                value={filterYearMonth || null}
                onChange={(ym) => setFilterYearMonth(ym ?? "")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Select
                className="w-40 max-w-full"
                label="是否售出筛选"
                selectedKeys={new Set([soldFilter])}
                onSelectionChange={(keys) => {
                  if (keys === "all") return;
                  const nextKey =
                    keys instanceof Set ? Array.from(keys)[0] : undefined;
                  if (
                    nextKey === "all" ||
                    nextKey === "sold" ||
                    nextKey === "unsold"
                  ) {
                    setSoldFilter(nextKey);
                  }
                }}
              >
                <SelectItem key="all">全部</SelectItem>
                <SelectItem key="sold">仅已售出</SelectItem>
                <SelectItem key="unsold">仅未售出</SelectItem>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Input
                label="最低价格"
                placeholder="0"
                size="sm"
                type="number"
                className="w-32"
                value={minSoldPrice}
                onChange={(e) => setMinSoldPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Input
                label="最高价格"
                placeholder="0"
                size="sm"
                type="number"
                className="w-32"
                value={maxSoldPrice}
                onChange={(e) => setMaxSoldPrice(e.target.value)}
              />
            </div>
            <Button
              color="primary"
              isLoading={querying}
              size="sm"
              onPress={handleQuery}
            >
              查询
            </Button>
            <Button
              variant="flat"
              size="sm"
              onPress={async () => {
                if (savedList.length === 0) return;
                const text = buildQuxiangSavedListCopyText(savedList);
                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  // 忽略剪贴板错误，前端可按需加 toast 提示
                }
              }}
            >
              复制本页所有兑换码
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Switch
                size="sm"
                isSelected={bulkSavedIsSold}
                onChange={(e) => setBulkSavedIsSold(e.target.checked)}
              >
                批量设为已售出
              </Switch>
              <Input
                aria-label="批量售出价格"
                placeholder="价格"
                size="sm"
                type="number"
                className="w-28"
                value={bulkSavedPrice}
                onChange={(e) => setBulkSavedPrice(e.target.value)}
                isDisabled={!bulkSavedIsSold}
              />
              <Button
                size="sm"
                variant="flat"
                isLoading={bulkUpdatingSaved}
                isDisabled={selectedSavedIds.size === 0}
                onPress={handleBulkUpdateSaved}
              >
                应用到已选
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-auto rounded-medium border border-default-200">
            <Table
              aria-label="已保存记录"
              removeWrapper
              classNames={{
                table: "min-w-full",
              }}
              shadow="none"
              selectionMode="multiple"
              selectedKeys={selectedSavedIds}
              onSelectionChange={(keys) => {
                if (keys === "all") {
                  setSelectedSavedIds(
                    new Set(savedList.map((item) => String(item.id))),
                  );
                  return;
                }
                const next = new Set(
                  Array.from(keys instanceof Set ? keys : []).map((k) =>
                    String(k),
                  ),
                );
                setSelectedSavedIds(next);
              }}
            >
              <TableHeader>
                <TableColumn>领取码</TableColumn>
                <TableColumn>手机号</TableColumn>
                <TableColumn>日期（YYYY-MM）</TableColumn>
                <TableColumn>是否售出</TableColumn>
                <TableColumn>售出价格</TableColumn>
                <TableColumn>创建时间</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无数据">
                {savedList.map((item) => (
                  <TableRow key={String(item.id)}>
                    <TableCell className="text-xs">{item.code}</TableCell>
                    <TableCell className="text-xs">
                      {item.phone ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.yearMonth ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.isSold ? "是" : "否"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.soldPrice ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => openEditSaved(item)}
                      >
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={editSavedOpen} onOpenChange={setEditSavedOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                编辑归档记录
              </ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="领取码"
                  value={editingSaved?.code ?? ""}
                  onChange={(e) =>
                    setEditingSaved((prev) =>
                      prev ? { ...prev, code: e.target.value } : prev,
                    )
                  }
                />
                <Select
                  label="手机号"
                  placeholder="选择手机号"
                  selectedKeys={
                    editingSaved?.phone
                      ? new Set([editingSaved.phone])
                      : new Set<string>()
                  }
                  onSelectionChange={(keys) => {
                    if (keys === "all") return;
                    const next =
                      keys instanceof Set ? Array.from(keys)[0] : undefined;
                    const phoneValue =
                      next === undefined ? "" : String(next);
                    setEditingSaved((prev) =>
                      prev ? { ...prev, phone: phoneValue } : prev,
                    );
                  }}
                  isDisabled={phones.length === 0}
                >
                  {phones.map((p) => (
                    <SelectItem key={p.value}>{p.value}</SelectItem>
                  ))}
                </Select>
                <YearMonthPicker
                  label="日期（按月，YYYY-MM）"
                  ariaLabel="编辑归档日期"
                  value={editingSaved?.yearMonth ?? null}
                  onChange={(ym) => {
                    if (!ym) {
                      setEditingSaved((prev) =>
                        prev ? { ...prev, yearMonth: "" } : prev,
                      );
                      return;
                    }
                    setEditingSaved((prev) =>
                      prev ? { ...prev, yearMonth: ym } : prev,
                    );
                  }}
                />
                <Switch
                  isSelected={editingSaved?.isSold ?? false}
                  onChange={(e) =>
                    setEditingSaved((prev) =>
                      prev ? { ...prev, isSold: e.target.checked } : prev,
                    )
                  }
                >
                  是否售出
                </Switch>
                <Input
                  label="售出价格"
                  placeholder="0.00"
                  type="number"
                  value={editingSaved?.soldPrice ?? ""}
                  onChange={(e) =>
                    setEditingSaved((prev) =>
                      prev ? { ...prev, soldPrice: e.target.value } : prev,
                    )
                  }
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => {
                    setEditingSaved(null);
                    onClose();
                  }}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={async () => {
                    await handleSaveEditedSaved();
                    onClose();
                  }}
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={configModalOpen}
        onOpenChange={(open) => {
          setConfigModalOpen(open);
          // 受控打开时若仅用 setState(true)，部分环境下不会触发此处；故按钮里已同步 init。
          if (open) {
            initEditingPhonesFromStore();
          }
        }}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                配置当前操作的手机号列表
              </ModalHeader>
              <ModalBody className="space-y-3">
                {editingPhones.map((phone, index) => (
                  <div key={String(phone.id ?? index)} className="flex items-end gap-2">
                    <Input
                      autoFocus={index === 0}
                      className="flex-1"
                      label={`手机号 ${index + 1}`}
                      placeholder="如 13800000001"
                      value={phone.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditingPhones((current) =>
                          current.map((item) =>
                            item.id === phone.id ? { ...item, value } : item,
                          ),
                        );
                      }}
                    />
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isDisabled={editingPhones.length === 1}
                      onPress={() => {
                        setEditingPhones((current) =>
                          current.filter((item) => item.id !== phone.id),
                        );
                      }}
                    >
                      删除
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    setEditingPhones((current) => [
                      ...current,
                      { id: 0, value: "" },
                    ]);
                  }}
                >
                  新增手机号
                </Button>
                <p className="text-xs text-default-500">
                  保存后会把当前手机号列表记住，刷新页面或下次访问会自动加载；这些手机号会用于下方各处的选择与筛选。若只配置一个手机号，会同时把当前解析结果中未填写手机号的行统一设为该号码。全部清空并保存可以删除已保存的手机号配置。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button size="sm" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  onPress={() => {
                    const normalized = editingPhones
                      .map((item) => ({
                        ...item,
                        value: item.value.trim(),
                      }))
                      .filter((item) => item.value.length > 0);

                    if (normalized.length === 1) {
                      const phoneValue = normalized[0].value;
                      setParsedRows((rows) =>
                        rows.map((row) => ({
                          ...row,
                          phone:
                            row.phone && row.phone.trim() !== ""
                              ? row.phone
                              : phoneValue,
                        })),
                      );
                    }

                    // 持久化到数据库（空列表表示清空 quxiang_phones）
                    (async () => {
                      try {
                        const response = await fetch(
                          "/api/admin/quxiang/phones",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              phones: normalized.map((item) => ({
                                phone: item.value,
                              })),
                            }),
                          },
                        );
                        if (!response.ok) {
                          // eslint-disable-next-line no-console
                          console.error("保存手机号列表失败");
                          return;
                        }
                        const data = await response.json();
                        const items = (data.items ?? []) as {
                          id: number;
                          phone: string;
                        }[];
                        const nextPhones: PhoneItem[] = items.map((item) => ({
                          id: item.id,
                          value: item.phone,
                        }));
                        setPhones(nextPhones);
                        setSelectedPhoneIds(
                          new Set(nextPhones.map((p) => String(p.id))),
                        );
                      } finally {
                        onClose();
                      }
                    })();
                  }}
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-sm font-semibold">按手机号与日期（YYYY-MM）统计</h2>
          <p className="text-xs text-default-500">
            统计每个手机号在每个月的领取码总数、售出数量以及售出总金额。
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Button
              color="primary"
              isLoading={loadingStats}
              size="sm"
              onPress={handleLoadStats}
            >
              刷新统计
            </Button>
          </div>

          <div className="max-h-64 overflow-auto rounded-medium border border-default-200">
            <Table
              aria-label="统计结果"
              removeWrapper
              classNames={{
                table: "min-w-full",
              }}
              shadow="none"
            >
              <TableHeader>
                <TableColumn>手机号</TableColumn>
                <TableColumn>月份</TableColumn>
                <TableColumn>领取码总数</TableColumn>
                <TableColumn>售出数量</TableColumn>
                <TableColumn>售出总金额</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无统计数据">
                {stats.map((item, index) => (
                  <TableRow key={`${item.phone}-${item.yearMonth}-${index}`}>
                    <TableCell className="text-xs">{item.phone}</TableCell>
                    <TableCell className="text-xs">
                      {item.yearMonth ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.totalCodes}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.soldCount}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.totalSoldPrice ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

