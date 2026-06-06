"use client";

/**
 * Floating overlay that estimates how many bytes the current page is costing
 * in Supabase Storage egress. It's a soft estimate, not an exact bill, but it
 * is directionally accurate for "is this page a regression?".
 *
 * Visibility: only renders for the rosie user, and only when she has flipped
 * the toggle on via <EgressMonitorToggle />. The toggle writes
 * localStorage["egress-monitor"] = "1" and dispatches an
 * "egress-monitor-toggle" event so this component reacts without a reload.
 *
 * Shortcut: Ctrl/Cmd+Shift+E toggles the panel collapsed/expanded.
 *
 * What it counts:
 *   1. Direct fetches whose host contains "supabase.co". transferSize is the
 *      real bytes-over-the-wire and is 0 when the browser cache hit, so this
 *      is a faithful measure of Supabase-billable egress for those requests.
 *   2. Next.js image-optimizer fetches (/_next/image?url=...) whose `url`
 *      query param points at a Supabase URL. We can't observe whether Next's
 *      own disk cache was warm, so we report these as an upper bound under
 *      "via /_next/image" -- treat that bucket as "what would have hit
 *      Supabase if Next's cache were cold."
 */

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/context/auth-context";

const SUPABASE_HOST_FRAGMENT = "supabase.co";
const NEXT_IMAGE_PATH = "/_next/image";
const STORAGE_FLAG_KEY = "egress-monitor";
const TOGGLE_EVENT = "egress-monitor-toggle";

type Bucket = "direct" | "next-image";

interface EntryRecord {
  url: string;
  bytes: number;
  bucket: Bucket;
  // monotonically-increasing index so React keys are stable across resets
  seq: number;
}

interface Counters {
  direct: { bytes: number; count: number };
  nextImage: { bytes: number; count: number };
  entries: EntryRecord[];
}

const EMPTY_COUNTERS: Counters = {
  direct: { bytes: 0, count: 0 },
  nextImage: { bytes: 0, count: 0 },
  entries: [],
};

function classify(name: string): { bucket: Bucket; displayUrl: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(name, window.location.href);
  } catch {
    return null;
  }

  if (parsed.host.includes(SUPABASE_HOST_FRAGMENT)) {
    return { bucket: "direct", displayUrl: parsed.pathname };
  }

  if (parsed.pathname === NEXT_IMAGE_PATH) {
    const inner = parsed.searchParams.get("url");
    if (!inner) return null;
    let innerUrl: URL;
    try {
      innerUrl = new URL(inner, window.location.href);
    } catch {
      return null;
    }
    if (!innerUrl.host.includes(SUPABASE_HOST_FRAGMENT)) return null;
    const width = parsed.searchParams.get("w");
    const suffix = width ? ` @${width}w` : "";
    return {
      bucket: "next-image",
      displayUrl: `${innerUrl.pathname}${suffix}`,
    };
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function entryBytes(entry: PerformanceResourceTiming): number {
  // transferSize includes response body + headers and is 0 on browser cache
  // hits. encodedBodySize is the body size before the browser's transport
  // decoding; we fall back to it if transferSize is unavailable on the
  // platform but typically prefer transferSize as the egress-faithful number.
  if (entry.transferSize > 0) return entry.transferSize;
  if (entry.encodedBodySize > 0) return entry.encodedBodySize;
  return 0;
}

function readFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function EgressMonitor() {
  const { user, isAuthenticated } = useAuth();
  const isRosie =
    isAuthenticated && user?.username?.toLowerCase() === "rosie";

  const [flag, setFlag] = useState(false);
  const [counters, setCounters] = useState<Counters>(EMPTY_COUNTERS);
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setFlag(readFlag());

    const sync = () => setFlag(readFlag());
    window.addEventListener(TOGGLE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TOGGLE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const enabled = isRosie && flag;

  // Forget anything we've accumulated when the monitor is turned off, so the
  // next time rosie flips it back on she sees a fresh "this load" count and
  // not stale numbers from the previous session.
  useEffect(() => {
    if (!enabled) {
      setCounters(EMPTY_COUNTERS);
      setShowAll(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("PerformanceObserver" in window)) return;

    let seq = 0;

    const ingest = (entries: PerformanceResourceTiming[]) => {
      const additions: EntryRecord[] = [];
      let addedDirectBytes = 0;
      let addedDirectCount = 0;
      let addedNextBytes = 0;
      let addedNextCount = 0;

      for (const e of entries) {
        const meta = classify(e.name);
        if (!meta) continue;
        const bytes = entryBytes(e);
        if (bytes <= 0) continue;
        additions.push({
          url: meta.displayUrl,
          bytes,
          bucket: meta.bucket,
          seq: seq++,
        });
        if (meta.bucket === "direct") {
          addedDirectBytes += bytes;
          addedDirectCount += 1;
        } else {
          addedNextBytes += bytes;
          addedNextCount += 1;
        }
      }

      if (additions.length === 0) return;

      setCounters((prev) => ({
        direct: {
          bytes: prev.direct.bytes + addedDirectBytes,
          count: prev.direct.count + addedDirectCount,
        },
        nextImage: {
          bytes: prev.nextImage.bytes + addedNextBytes,
          count: prev.nextImage.count + addedNextCount,
        },
        entries: [...prev.entries, ...additions],
      }));
    };

    // Backfill any resources that already loaded before the observer attached
    // (e.g. above-the-fold images on first paint).
    try {
      const initial = performance.getEntriesByType(
        "resource",
      ) as PerformanceResourceTiming[];
      ingest(initial);
    } catch {
      // performance.getEntriesByType isn't critical; ignore.
    }

    const observer = new PerformanceObserver((list) => {
      ingest(list.getEntries() as PerformanceResourceTiming[]);
    });

    try {
      observer.observe({ type: "resource", buffered: true });
    } catch {
      // Safari/older fallback
      observer.observe({ entryTypes: ["resource"] });
    }

    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);

  const total = counters.direct.bytes + counters.nextImage.bytes;
  const totalCount = counters.direct.count + counters.nextImage.count;

  const sortedEntries = useMemo(() => {
    return [...counters.entries].sort((a, b) => b.bytes - a.bytes);
  }, [counters.entries]);

  const visibleEntries = showAll ? sortedEntries : sortedEntries.slice(0, 8);

  const handleReset = () => {
    try {
      performance.clearResourceTimings();
    } catch {
      // best-effort
    }
    setCounters(EMPTY_COUNTERS);
    setShowAll(false);
  };

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 2147483646,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        color: "#e5e7eb",
        background: "rgba(17, 24, 39, 0.92)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 6,
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        maxWidth: 380,
        minWidth: 220,
        padding: 8,
        userSelect: "none",
      }}
      aria-label="Supabase egress monitor"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            all: "unset",
            cursor: "pointer",
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
          title="Ctrl/Cmd+Shift+E"
        >
          {open ? "▾" : "▸"} egress {formatBytes(total)}{" "}
          <span style={{ opacity: 0.6, fontWeight: 400 }}>({totalCount})</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "2px 6px",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            fontSize: 10,
            opacity: 0.85,
          }}
          title="Reset counter and clear browser resource timings"
        >
          reset
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              rowGap: 2,
              columnGap: 8,
              opacity: 0.95,
            }}
          >
            <span>direct supabase.co</span>
            <span>
              {formatBytes(counters.direct.bytes)}{" "}
              <span style={{ opacity: 0.5 }}>({counters.direct.count})</span>
            </span>
            <span>via /_next/image *</span>
            <span>
              {formatBytes(counters.nextImage.bytes)}{" "}
              <span style={{ opacity: 0.5 }}>
                ({counters.nextImage.count})
              </span>
            </span>
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              opacity: 0.55,
              lineHeight: 1.3,
            }}
          >
            * upper bound: Next may have served these from its own disk cache
            without re-fetching from Supabase.
          </div>

          {sortedEntries.length > 0 && (
            <>
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 10,
                  opacity: 0.7,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                top by size
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "4px 0 0 0",
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                {visibleEntries.map((e) => (
                  <li
                    key={e.seq}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      padding: "2px 0",
                    }}
                    title={e.url}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        opacity: e.bucket === "next-image" ? 0.7 : 1,
                      }}
                    >
                      {e.bucket === "next-image" ? "↻ " : ""}
                      {e.url}
                    </span>
                    <span style={{ opacity: 0.9 }}>{formatBytes(e.bytes)}</span>
                  </li>
                ))}
              </ul>
              {sortedEntries.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAll((s) => !s)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    marginTop: 4,
                    fontSize: 10,
                    opacity: 0.6,
                  }}
                >
                  {showAll
                    ? "show top 8"
                    : `show all ${sortedEntries.length}`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EgressMonitor;
