"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    deleteCustomizationImage,
    listCustomizations,
    updateCustomization,
    updateOrderItem,
    uploadCustomizationImage,
    type CustomizationQueueRow,
} from "@/app/api/shop/order-actions";
import { useAuth } from "@/app/context/auth-context";

import AdminTabs from "./admin-tabs";
import CustomQueueRowView from "./custom-queue-row";

export default function CustomQueueList() {
    const { token } = useAuth();
    const [rows, setRows] = useState<CustomizationQueueRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [imageBusyIds, setImageBusyIds] = useState<Set<string>>(new Set());

    const fetchRows = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        const result = await listCustomizations(token);
        if (result.success) {
            setRows(result.rows);
        } else {
            setError(result.error);
            setRows([]);
        }
        setIsLoading(false);
    }, [token]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const { todo, done } = useMemo(() => {
        const todo: CustomizationQueueRow[] = [];
        const done: CustomizationQueueRow[] = [];
        for (const r of rows) {
            (r.is_complete ? done : todo).push(r);
        }
        return { todo, done };
    }, [rows]);

    // For each row we want to show every sibling line in the same parent
    // order so the admin can see the full order at a glance and tell which
    // sibling items are already done (rendered with strike-through).
    const siblingsByOrder = useMemo(() => {
        const map = new Map<string, CustomizationQueueRow[]>();
        for (const r of rows) {
            const list = map.get(r.order_id);
            if (list) list.push(r);
            else map.set(r.order_id, [r]);
        }
        return map;
    }, [rows]);

    const handleToggle = useCallback(
        async (row: CustomizationQueueRow, next: boolean) => {
            if (!token) return;

            // Optimistic update so the row visually moves between sections.
            setRows((prev) =>
                prev.map((r) =>
                    r.id === row.id ? { ...r, is_complete: next } : r,
                ),
            );
            setBusyIds((prev) => {
                const out = new Set(prev);
                out.add(row.id);
                return out;
            });

            const result =
                row.kind === "item"
                    ? await updateOrderItem(token, row.id, {
                          is_complete: next,
                      })
                    : await updateCustomization(token, row.id, {
                          is_complete: next,
                      });

            setBusyIds((prev) => {
                const out = new Set(prev);
                out.delete(row.id);
                return out;
            });

            if (result.success) {
                setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? result.row : r)),
                );
            } else {
                // Revert on failure.
                setRows((prev) =>
                    prev.map((r) =>
                        r.id === row.id ? { ...r, is_complete: !next } : r,
                    ),
                );
                setError(result.error);
            }
        },
        [token],
    );

    const markImageBusy = useCallback((id: string, busy: boolean) => {
        setImageBusyIds((prev) => {
            const out = new Set(prev);
            if (busy) out.add(id);
            else out.delete(id);
            return out;
        });
    }, []);

    const handleUploadImage = useCallback(
        async (row: CustomizationQueueRow, file: File) => {
            if (!token) return;

            markImageBusy(row.id, true);
            const formData = new FormData();
            formData.append("file", file);
            const result = await uploadCustomizationImage(
                token,
                row.id,
                formData,
            );
            markImageBusy(row.id, false);

            if (result.success) {
                setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? result.row : r)),
                );
            } else {
                setError(result.error);
            }
        },
        [token, markImageBusy],
    );

    const handleClearImage = useCallback(
        async (row: CustomizationQueueRow) => {
            if (!token) return;

            markImageBusy(row.id, true);
            const result = await deleteCustomizationImage(token, row.id);
            markImageBusy(row.id, false);

            if (result.success) {
                setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? result.row : r)),
                );
            } else {
                setError(result.error);
            }
        },
        [token, markImageBusy],
    );

    return (
        <div className="w-full max-w-[50rem] mx-auto flex flex-col gap-[var(--spacing-md)]">
            <div className="flex items-center justify-between gap-[var(--spacing-sm)]">
                <span className="main-text text-[1.125rem] md:text-[1.25rem]">
                    manage shop
                </span>
                <Link
                    href="/shop"
                    className="pixel-borders px-[var(--spacing-sm)] py-[0.25rem]
                        bg-foreground text-[color:var(--border)] main-text text-[0.75rem]
                        hover:bg-[color:var(--accent)] hover:text-[color:var(--background)]
                        transition-colors"
                >
                    back to shop
                </Link>
            </div>

            <AdminTabs active="custom" />

            {isLoading ? (
                <div className="main-text text-[0.875rem] text-[color:var(--border)] opacity-70">
                    Loading...
                </div>
            ) : error ? (
                <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
                    <span className="main-text text-[0.75rem] text-red-400">
                        {error}
                    </span>
                </div>
            ) : rows.length === 0 ? (
                <div className="pixel-borders bg-foreground p-[var(--spacing-md)]">
                    <span className="main-text text-[0.875rem] text-[color:var(--border)] opacity-70">
                        No custom card art requests yet.
                    </span>
                </div>
            ) : (
                <>
                    <section className="flex flex-col gap-[var(--spacing-sm)]">
                        <div className="main-text text-[0.875rem] text-[color:var(--border)]">
                            to do ({todo.length})
                        </div>
                        {todo.length === 0 ? (
                            <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
                                <span className="main-text text-[0.75rem] opacity-70">
                                    All caught up.
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-[var(--spacing-sm)]">
                                {todo.map((r) => (
                                    <CustomQueueRowView
                                        key={r.id}
                                        row={r}
                                        siblings={
                                            siblingsByOrder.get(r.order_id) ?? [r]
                                        }
                                        busy={busyIds.has(r.id)}
                                        imageBusy={imageBusyIds.has(r.id)}
                                        onToggle={(next) => handleToggle(r, next)}
                                        onUploadImage={(file) =>
                                            handleUploadImage(r, file)
                                        }
                                        onClearImage={() => handleClearImage(r)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="flex flex-col gap-[var(--spacing-sm)]">
                        <div className="main-text text-[0.875rem] text-[color:var(--border)]">
                            done ({done.length})
                        </div>
                        {done.length === 0 ? (
                            <div className="pixel-borders bg-foreground p-[var(--spacing-sm)]">
                                <span className="main-text text-[0.75rem] opacity-70">
                                    Nothing finished yet.
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-[var(--spacing-sm)]">
                                {done.map((r) => (
                                    <CustomQueueRowView
                                        key={r.id}
                                        row={r}
                                        siblings={
                                            siblingsByOrder.get(r.order_id) ?? [r]
                                        }
                                        busy={busyIds.has(r.id)}
                                        imageBusy={imageBusyIds.has(r.id)}
                                        onToggle={(next) => handleToggle(r, next)}
                                        onUploadImage={(file) =>
                                            handleUploadImage(r, file)
                                        }
                                        onClearImage={() => handleClearImage(r)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
