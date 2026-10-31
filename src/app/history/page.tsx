"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getScanHistory,
  deleteScanRecord,
  clearScanHistory,
  updateScanRecord,
  getDietaryProfile,
  ScanRecord,
} from "@/lib/storage";
import { matchProfileIngredients } from "@/lib/profileMatcher";
import { StructuredResultsView } from "@/components/StructuredResultsView";
import { useTranslation } from "@/lib/i18n/LanguageContext";

function HistoryContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams?.get("id");

  const { tTag } = useTranslation();
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(initialId || null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Inline editing state for product names
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const userProfile = useMemo(() => getDietaryProfile(), []);

  useEffect(() => {
    const list = getScanHistory();
    setHistory(list);
    setIsLoaded(true);
  }, []);

  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null;
    return history.find((item) => item.id === selectedRecordId) || null;
  }, [selectedRecordId, history]);

  // Compute aggregate stats across all saved scans
  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) {
      return { total: 0, avgSugar: "—", avgSodium: "—", highFlagsCount: 0 };
    }

    let sugarSum = 0;
    let sugarCount = 0;
    let sodiumSum = 0;
    let sodiumCount = 0;
    let highFlagsCount = 0;

    for (const item of history) {
      if (item.nutrition?.sugar !== null && item.nutrition?.sugar !== undefined) {
        sugarSum += item.nutrition.sugar.value;
        sugarCount++;
      }

      if (item.nutrition?.sodium !== null && item.nutrition?.sodium !== undefined) {
        const sod = item.nutrition.sodium.value;
        const mg = item.nutrition.sodium.unit === "g" ? sod * 1000 : sod;
        sodiumSum += mg;
        sodiumCount++;
      }

      const hasHighFlag = item.summaryTags?.some(
        (t) =>
          t.type === "caution" ||
          t.label.toLowerCase().includes("high") ||
          t.id.includes("high")
      );
      if (hasHighFlag) {
        highFlagsCount++;
      }
    }

    return {
      total,
      avgSugar: sugarCount > 0 ? `${(sugarSum / sugarCount).toFixed(1)}g` : "—",
      avgSodium: sodiumCount > 0 ? `${Math.round(sodiumSum / sodiumCount)}mg` : "—",
      highFlagsCount,
    };
  }, [history]);

  // Recent scans for charts (up to last 10, chronological order)
  const chartData = useMemo(() => {
    return history.slice(0, 10).reverse();
  }, [history]);

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteScanRecord(id);
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    if (selectedRecordId === id) {
      setSelectedRecordId(null);
    }
  };

  const handleClearAll = () => {
    clearScanHistory();
    setHistory([]);
    setSelectedRecordId(null);
    setShowClearConfirm(false);
  };

  const handleStartEdit = (item: ScanRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(item.id);
    setEditingName(item.productName || "Unnamed product");
  };

  const handleSaveEdit = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = editingName.trim() || "Unnamed product";
    updateScanRecord(id, { productName: trimmed });
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, productName: trimmed } : item))
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  if (!isLoaded) {
    return (
      <div className="py-12 text-center text-xs text-secondary">
        Loading scan history…
      </div>
    );
  }

  // -------------------------------------------------------------
  // Full Result View (Same UI Component as live view, no duplicates)
  // -------------------------------------------------------------
  if (selectedRecord) {
    const profileMatches = matchProfileIngredients(
      selectedRecord.ingredientsData?.ingredients || [],
      selectedRecord.ingredientsData?.rawIngredientsBlock || null,
      userProfile
    );

    return (
      <div className="space-y-4">
        <StructuredResultsView
          ocrResult={
            selectedRecord.ocrResult || {
              text: "Raw text not stored for this record.",
              confidence: 0,
              lines: [],
            }
          }
          nutrition={selectedRecord.nutrition}
          ingredientsData={selectedRecord.ingredientsData}
          summaryTags={selectedRecord.summaryTags}
          explanationStatus={selectedRecord.explanationData ? "success" : "idle"}
          explanationData={selectedRecord.explanationData}
          productName={selectedRecord.productName}
          scanDate={new Date(selectedRecord.timestamp).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          onBack={() => setSelectedRecordId(null)}
          backButtonLabel="← Back to History List"
          onReset={() => setSelectedRecordId(null)}
          validationFlags={selectedRecord.validationFlags}
          profileMatches={profileMatches}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------
  if (history.length === 0) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-subtle">
          <h1 className="text-lg font-bold text-primary tracking-tight">Scan History</h1>
          <p className="text-xs text-secondary mt-0.5">
            View, track, and compare nutrition data from your previous food label scans.
          </p>
        </div>

        <div className="border border-subtle bg-surface rounded-md p-10 text-center space-y-4 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-background border border-subtle mx-auto flex items-center justify-center text-secondary">
            <Clock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-primary">No scans saved yet</h2>
            <p className="text-xs text-secondary leading-relaxed">
              When you scan or upload food packaging labels, your analyzed results will automatically
              be recorded here in your browser.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 py-2 px-3.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <span>Scan your first label</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Find max values for chart scaling
  const maxSugar = Math.max(15, ...chartData.map((d) => d.nutrition?.sugar?.value || 0));
  const maxSodium = Math.max(
    300,
    ...chartData.map((d) => {
      if (!d.nutrition?.sodium) return 0;
      return d.nutrition.sodium.unit === "g"
        ? d.nutrition.sodium.value * 1000
        : d.nutrition.sodium.value;
    })
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Clear All Action */}
      <div className="pb-3 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary tracking-tight">Scan History</h1>
          <p className="text-xs text-secondary">
            {history.length} {history.length === 1 ? "label" : "labels"} saved locally in this browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-secondary hover:text-amber-800 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 py-1.5 px-2.5 border border-subtle rounded bg-surface hover:bg-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              <span>Clear all history</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-secondary text-[11px]">Clear all scans?</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-700"
              >
                Yes, Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 bg-surface border border-subtle text-secondary hover:text-primary rounded text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1. Compact Stats Row (Plain bordered cells, flat & data-focused) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-subtle divide-x divide-y sm:divide-y-0 divide-subtle bg-surface rounded-md">
        <div className="p-3.5 space-y-1">
          <span className="text-[11px] text-secondary font-medium uppercase tracking-wider block">
            Total Scans
          </span>
          <span className="text-xl font-bold font-mono text-primary block">
            {stats.total}
          </span>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-[11px] text-secondary font-medium uppercase tracking-wider block">
            Avg Sugar / Serv
          </span>
          <span className="text-xl font-bold font-mono text-primary block">
            {stats.avgSugar}
          </span>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-[11px] text-secondary font-medium uppercase tracking-wider block">
            Avg Sodium / Serv
          </span>
          <span className="text-xl font-bold font-mono text-primary block">
            {stats.avgSodium}
          </span>
        </div>

        <div className="p-3.5 space-y-1">
          <span className="text-[11px] text-secondary font-medium uppercase tracking-wider block">
            High Caution Scans
          </span>
          <span className="text-xl font-bold font-mono text-primary block">
            {stats.highFlagsCount}
          </span>
        </div>
      </div>

      {/* 2. Plain CSS/SVG Bar Charts (Sugar and Sodium across last 10 scans) */}
      <div className="bg-surface border border-subtle rounded-md p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-subtle">
          <div>
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Nutrient Trends (Last {chartData.length} Scans)
            </h2>
            <p className="text-[11px] text-secondary">
              Per-serving sugar and sodium values shown chronologically (left to right).
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" />
              Sugar (g)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 dark:bg-amber-500 inline-block" />
              Sodium (mg)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sugar Chart */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
              Sugar per serving (g)
            </span>
            <div className="w-full bg-background border border-subtle rounded p-3">
              <svg
                viewBox="0 0 320 120"
                className="w-full h-28 overflow-visible"
                aria-label="Sugar per serving bar chart"
              >
                {/* Reference Grid lines */}
                <line x1="25" y1="20" x2="315" y2="20" stroke="currentColor" strokeDasharray="2 2" className="text-subtle" />
                <text x="20" y="23" textAnchor="end" className="text-[9px] fill-secondary font-mono">
                  {Math.round(maxSugar)}
                </text>
                <line x1="25" y1="55" x2="315" y2="55" stroke="currentColor" strokeDasharray="2 2" className="text-subtle" />
                <text x="20" y="58" textAnchor="end" className="text-[9px] fill-secondary font-mono">
                  {Math.round(maxSugar / 2)}
                </text>
                <line x1="25" y1="90" x2="315" y2="90" stroke="currentColor" className="text-subtle" />
                <text x="20" y="93" textAnchor="end" className="text-[9px] fill-secondary font-mono">
                  0
                </text>

                {/* Bars */}
                {chartData.map((d, idx) => {
                  const val = d.nutrition?.sugar?.value ?? 0;
                  const barHeight = Math.min(70, Math.max(3, (val / maxSugar) * 70));
                  const slotWidth = 285 / chartData.length;
                  const x = 30 + idx * slotWidth + slotWidth * 0.15;
                  const width = Math.max(6, slotWidth * 0.7);
                  const y = 90 - barHeight;

                  return (
                    <g key={d.id} className="group">
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={barHeight}
                        className="fill-accent transition-all hover:opacity-85"
                        rx="1"
                      >
                        <title>{`${d.productName}: ${val}g sugar`}</title>
                      </rect>
                      {/* Value label above bar */}
                      <text
                        x={x + width / 2}
                        y={y - 3}
                        textAnchor="middle"
                        className="text-[8px] fill-primary font-mono font-medium"
                      >
                        {val > 0 ? `${val}g` : "0"}
                      </text>
                      {/* X-axis scan index */}
                      <text
                        x={x + width / 2}
                        y="105"
                        textAnchor="middle"
                        className="text-[8px] fill-secondary font-mono"
                      >
                        #{idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Sodium Chart */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
              Sodium per serving (mg)
            </span>
            <div className="w-full bg-background border border-subtle rounded p-3">
              <svg
                viewBox="0 0 320 120"
                className="w-full h-28 overflow-visible"
                aria-label="Sodium per serving bar chart"
              >
                {/* Reference Grid lines */}
                <line x1="30" y1="20" x2="315" y2="20" stroke="currentColor" strokeDasharray="2 2" className="text-subtle" />
                <text x="25" y="23" textAnchor="end" className="text-[9px] fill-secondary font-mono">
                  {Math.round(maxSodium)}
                </text>
                <line x1="30" y1="55" x2="315" y2="55" stroke="currentColor" strokeDasharray="2 2" className="text-subtle" />
                <text x="25" y="58" textAnchor="end" className="text-[9px] fill-secondary font-mono">
                  {Math.round(maxSodium / 2)}
                </text>
                <line x1="30" y1="90" x2="315" y2="90" stroke="currentColor" className="text-subtle" />
                <text x="25" y="93" textAnchor="end" className="text-[9px] fill-secondary font-mono">
                  0
                </text>

                {/* Bars */}
                {chartData.map((d, idx) => {
                  let val = 0;
                  if (d.nutrition?.sodium) {
                    val =
                      d.nutrition.sodium.unit === "g"
                        ? d.nutrition.sodium.value * 1000
                        : d.nutrition.sodium.value;
                  }
                  const barHeight = Math.min(70, Math.max(3, (val / maxSodium) * 70));
                  const slotWidth = 280 / chartData.length;
                  const x = 35 + idx * slotWidth + slotWidth * 0.15;
                  const width = Math.max(6, slotWidth * 0.7);
                  const y = 90 - barHeight;

                  return (
                    <g key={d.id} className="group">
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={barHeight}
                        className="fill-amber-600 dark:fill-amber-500 transition-all hover:opacity-85"
                        rx="1"
                      >
                        <title>{`${d.productName}: ${val}mg sodium`}</title>
                      </rect>
                      {/* Value label above bar */}
                      <text
                        x={x + width / 2}
                        y={y - 3}
                        textAnchor="middle"
                        className="text-[8px] fill-primary font-mono font-medium"
                      >
                        {val > 0 ? `${Math.round(val)}` : "0"}
                      </text>
                      {/* X-axis scan index */}
                      <text
                        x={x + width / 2}
                        y="105"
                        textAnchor="middle"
                        className="text-[8px] fill-secondary font-mono"
                      >
                        #{idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Past Scans List (Newest first) */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider">
          Saved Scans ({history.length})
        </h2>

        <div className="border border-subtle rounded-md divide-y divide-subtle bg-surface overflow-hidden">
          {history.map((record) => {
            const dateStr = new Date(record.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const isEditing = editingId === record.id;
            const nut = record.nutrition;

            return (
              <div
                key={record.id}
                className="p-4 hover:bg-background/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Product Info & Tags */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Inline edit form or title */}
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveEdit(record.id, e)}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          className="text-xs px-2 py-1 border border-accent rounded bg-background text-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="Save product name"
                          className="p-1 text-accent hover:bg-subtle rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          aria-label="Cancel editing"
                          className="p-1 text-secondary hover:bg-subtle rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-sm font-semibold text-primary truncate max-w-xs">
                          {record.productName || "Unnamed product"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(record, e)}
                          title="Rename product"
                          aria-label={`Rename ${record.productName}`}
                          className="text-secondary opacity-60 hover:opacity-100 hover:text-primary transition-opacity p-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-[11px] text-secondary font-mono">
                      • {dateStr}
                    </span>
                  </div>

                  {/* Metrics preview row */}
                  <div className="flex items-center gap-3 text-xs text-secondary font-mono flex-wrap">
                    {nut.calories && <span>{nut.calories.value} kcal</span>}
                    {nut.protein && <span>{nut.protein.value}g protein</span>}
                    {nut.sugar && <span>{nut.sugar.value}g sugar</span>}
                    {nut.sodium && (
                      <span>
                        {nut.sodium.unit === "g"
                          ? nut.sodium.value * 1000
                          : nut.sodium.value}
                        mg sodium
                      </span>
                    )}
                  </div>

                  {/* Summary Tags Pills */}
                  {record.summaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {record.summaryTags.map((tag) => {
                        const isCaution = tag.type === "caution";
                        const isPositive = tag.type === "positive";

                        return (
                          <span
                            key={tag.id}
                            className={`text-[10px] px-2 py-0.5 rounded border ${
                              isCaution
                                ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-medium"
                                : isPositive
                                ? "bg-accent-light border-accent/30 text-accent font-medium"
                                : "bg-background border-subtle text-secondary"
                            }`}
                          >
                            {tTag(tag.label)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedRecordId(record.id)}
                    className="text-xs font-medium text-white bg-accent hover:bg-accent-hover active:bg-accent-active transition-colors inline-flex items-center gap-1.5 py-1.5 px-3 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(record.id, e)}
                    title="Delete this scan"
                    aria-label={`Delete scan of ${record.productName}`}
                    className="text-xs text-secondary hover:text-amber-800 dark:hover:text-amber-400 p-1.5 border border-subtle hover:border-amber-300 rounded bg-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-secondary">
          Loading scan history…
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
