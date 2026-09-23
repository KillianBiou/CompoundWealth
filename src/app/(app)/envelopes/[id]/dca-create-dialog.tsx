"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Search, X } from "lucide-react";
import { createDcaAction, type ActionState } from "@/server/actions";
import { getEtfByIsin, searchEtfCatalog, type EtfCatalogEntry } from "@/lib/etf-catalog";
import { DCA_FREQUENCY_LABELS, nextDateForDay, type DcaFrequency } from "@/lib/dca";
import { Badge, Button, Input, Modal, Select } from "@/components/ui";
import { cn } from "@/components/cn";
import { useActionToast } from "@/components/use-action-toast";

interface LineDraft {
  isin: string;
  ticker: string;
  name: string;
  maxAmountEur: string;
}

export function DcaCreateDialog({
  envelopeId,
  suggestions,
}: {
  envelopeId: string;
  suggestions: { isin: string; ticker: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"plan" | "single">("plan");
  const [frequency, setFrequency] = useState<DcaFrequency>("MONTHLY");
  const [startDay, setStartDay] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [query, setQuery] = useState("");
  const [pendingAdd, setPendingAdd] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createDcaAction, {});
  const resetDraft = () => {
    setLines([]);
    setQuery("");
    setPendingAdd(false);
  };
  const closeAfterSuccess = () => {
    setOpen(false);
    resetDraft();
  };
  useActionToast(state, closeAfterSuccess);

  const results = useMemo(
    () => (pendingAdd ? searchEtfCatalog(query).slice(0, 8) : []),
    [query, pendingAdd],
  );

  const addLine = (etf: EtfCatalogEntry) => {
    setLines((prev) =>
      prev.some((l) => l.isin === etf.isin)
        ? prev
        : [...prev, { isin: etf.isin, ticker: etf.ticker, name: etf.name, maxAmountEur: "" }],
    );
    setQuery("");
    setPendingAdd(false);
  };

  const updateAmount = (isin: string, value: string) => {
    setLines((prev) => prev.map((l) => (l.isin === isin ? { ...l, maxAmountEur: value } : l)));
  };

  const removeLine = (isin: string) => {
    setLines((prev) => prev.filter((l) => l.isin !== isin));
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !lines.some((l) => l.isin === s.isin),
  );

  const startDayNumber = Number(startDay);
  const startDate =
    startDay.trim() !== "" && Number.isFinite(startDayNumber) && startDayNumber >= 1 && startDayNumber <= 31
      ? nextDateForDay(startDayNumber).toISOString().slice(0, 10)
      : "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMode("plan");
          setFrequency("MONTHLY");
          setStartDay(String(new Date().getDate()));
          resetDraft();
        }}
        className="flex w-full items-center justify-center gap-2 border-t border-border-cw px-6 py-3 text-sm text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-secondary"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Planifier un investissement régulier
      </button>
    );
  }

  return (
    <Modal title="Planifier un investissement régulier" onClose={() => setOpen(false)}>
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="envelopeId" value={envelopeId} />
        <input type="hidden" name="frequency" value={frequency} />
        <input type="hidden" name="startDate" value={startDate} />

        <div className="flex rounded-lg border border-border-cw p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "plan"}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === "plan"
                ? "bg-bg-subtle font-medium text-text-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
            onClick={() => {
              setMode("plan");
              setLines([]);
              setPendingAdd(false);
            }}
          >
            Plan périodique
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "single"}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === "single"
                ? "bg-bg-subtle font-medium text-text-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
            onClick={() => {
              setMode("single");
              setLines([]);
              setPendingAdd(false);
            }}
          >
            Titre unique
          </button>
        </div>

        {mode === "plan" ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="dca-frequency"
                  className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
                >
                  Périodicité
                </label>
                <Select
                  id="dca-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
                >
                  {(
                    Object.entries(DCA_FREQUENCY_LABELS) as [DcaFrequency, string][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="dca-start"
                  className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
                >
                  Jour de départ
                </label>
                <Input
                  id="dca-start"
                  type="number"
                  min="1"
                  max="31"
                  inputMode="numeric"
                  placeholder="Ex. 5"
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  required
                />
                {startDate ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Premier versement le {new Date(startDate).toLocaleDateString("fr-FR")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-text-muted">Titres du plan</p>
              {lines.map((line) => (
                <div
                  key={line.isin}
                  className="flex items-center gap-3 rounded-lg border border-border-cw bg-bg-subtle px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">{line.ticker}</p>
                    <p className="truncate text-xs text-text-secondary">{line.name}</p>
                  </div>
                  <input
                    type="hidden"
                    name="lines"
                    value={JSON.stringify({ isin: line.isin, maxAmountEur: line.maxAmountEur })}
                  />
                  <Input
                    aria-label={`Montant max pour ${line.ticker}`}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="1 500,00"
                    className="w-32 text-right"
                    value={line.maxAmountEur}
                    onChange={(e) => updateAmount(line.isin, e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="text-text-muted hover:text-negative"
                    onClick={() => removeLine(line.isin)}
                    aria-label={`Retirer ${line.ticker}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
              <div className="relative">
                {pendingAdd ? (
                  <>
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nom, ticker ou ISIN…"
                      autoComplete="off"
                      autoFocus
                    />
                    <span className="pointer-events-none absolute right-3 top-2 text-text-muted">
                      <Search className="h-4 w-4" aria-hidden />
                    </span>
                    {results.length > 0 ? (
                      <ul
                        role="listbox"
                        aria-label="ETF correspondants"
                        className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border-cw bg-bg-elevated shadow-lg"
                      >
                        {results.map((etf) => (
                          <li key={etf.isin}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              onClick={() => addLine(etf)}
                              className="w-full px-3 py-2 text-left transition-colors hover:bg-bg-subtle"
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">{etf.ticker}</span>
                                <span className="text-xs text-text-muted">{etf.indexCategory}</span>
                              </span>
                              <span className="block truncate text-xs text-text-secondary">
                                {etf.name} · {etf.isin}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingAdd(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-cw px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent-500/50 hover:text-text-secondary"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Ajouter un titre
                  </button>
                )}
              </div>
            </div>

            {visibleSuggestions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Suggestions — ETF de votre enveloppe
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s.isin}
                      type="button"
                      onClick={() => {
                        const etf = getEtfByIsin(s.isin);
                        if (etf) addLine(etf);
                      }}
                      className="flex items-center gap-2 rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-muted transition-colors hover:border-accent-500/50 hover:text-text-secondary"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      {s.ticker}
                      <span className="max-w-32 truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <SingleModeFields
            query={query}
            setQuery={setQuery}
            pendingAdd={pendingAdd}
            setPendingAdd={setPendingAdd}
            results={results}
            onPick={(etf) => {
              setLines([
                { isin: etf.isin, ticker: etf.ticker, name: etf.name, maxAmountEur: "" },
              ]);
              setPendingAdd(false);
            }}
            frequency={frequency}
            setFrequency={setFrequency}
            startDay={startDay}
            setStartDay={setStartDay}
            firstDateLabel={
              startDate ? new Date(startDate).toLocaleDateString("fr-FR") : null
            }
            lines={lines}
            updateAmount={updateAmount}
            suggestions={visibleSuggestions}
            onSuggestion={(s) => {
              const etf = getEtfByIsin(s.isin);
              if (etf) addLine(etf);
            }}
          />
        )}

        {state?.errors?.form ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.form[0]}
          </p>
        ) : null}
        {state?.errors?.frequency ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.frequency[0]}
          </p>
        ) : null}
        {state?.errors?.startDate ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.startDate[0]}
          </p>
        ) : null}
        {state?.errors?.lines ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.lines[0]}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={pending || lines.length === 0 || lines.some((l) => !l.maxAmountEur)}
            className="w-full sm:w-auto"
          >
            {pending ? "Création…" : "Confirmer"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          {lines.length > 0 ? (
            <Badge tone="accent">
              {lines.length} titre{lines.length > 1 ? "s" : ""}
            </Badge>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

function SingleModeFields({
  query,
  setQuery,
  pendingAdd,
  setPendingAdd,
  results,
  onPick,
  frequency,
  setFrequency,
  startDay,
  setStartDay,
  firstDateLabel,
  lines,
  updateAmount,
  suggestions,
  onSuggestion,
}: {
  query: string;
  setQuery: (v: string) => void;
  pendingAdd: boolean;
  setPendingAdd: (v: boolean) => void;
  results: EtfCatalogEntry[];
  onPick: (etf: EtfCatalogEntry) => void;
  frequency: DcaFrequency;
  setFrequency: (v: DcaFrequency) => void;
  startDay: string;
  setStartDay: (v: string) => void;
  firstDateLabel: string | null;
  lines: LineDraft[];
  updateAmount: (isin: string, value: string) => void;
  suggestions: { isin: string; ticker: string; name: string }[];
  onSuggestion: (s: { isin: string; ticker: string; name: string }) => void;
}) {
  const selected = lines[0];
  return (
    <>
      <div className="space-y-2">
        <label
          htmlFor="dca-single-search"
          className="block text-xs uppercase tracking-wide text-text-muted"
        >
          Titre
        </label>
        {selected ? (
          <div className="flex items-center justify-between rounded-lg border border-border-cw bg-bg-subtle px-3 py-2">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">{selected.ticker}</p>
              <p className="truncate text-xs text-text-secondary">{selected.name}</p>
            </div>
            <button
              type="button"
              className="text-xs text-text-muted hover:text-negative"
              onClick={() => setPendingAdd(true)}
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              id="dca-single-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPendingAdd(true);
              }}
              placeholder="Nom, ticker ou ISIN…"
              autoComplete="off"
            />
            <span className="pointer-events-none absolute right-3 top-2 text-text-muted">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            {pendingAdd && results.length > 0 ? (
              <ul
                role="listbox"
                aria-label="ETF correspondants"
                className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border-cw bg-bg-elevated shadow-lg"
              >
                {results.map((etf) => (
                  <li key={etf.isin}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        onPick(etf);
                        setQuery("");
                      }}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-bg-subtle"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{etf.ticker}</span>
                        <span className="text-xs text-text-muted">{etf.indexCategory}</span>
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {etf.name} · {etf.isin}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        {selected ? (
          <div className="flex items-center gap-3 rounded-lg border border-border-cw bg-bg-subtle px-3 py-2">
            <p className="min-w-0 flex-1 text-sm text-text-secondary">Montant max</p>
            <input
              type="hidden"
              name="lines"
              value={JSON.stringify({ isin: selected.isin, maxAmountEur: selected.maxAmountEur })}
            />
            <Input
              aria-label="Montant max"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="1 500,00"
              className="w-32 text-right"
              value={selected.maxAmountEur}
              onChange={(e) => updateAmount(selected.isin, e.target.value)}
              required
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label
            htmlFor="dca-single-frequency"
            className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
          >
            Périodicité
          </label>
          <Select
            id="dca-single-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
          >
            {(Object.entries(DCA_FREQUENCY_LABELS) as [DcaFrequency, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </div>
        <div className="flex-1">
          <label
            htmlFor="dca-single-start"
            className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
          >
            Jour de départ
          </label>
          <Input
            id="dca-single-start"
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            placeholder="Ex. 5"
            value={startDay}
            onChange={(e) => setStartDay(e.target.value)}
            required
          />
          {firstDateLabel ? (
            <p className="mt-1 text-xs text-text-muted">
              Premier versement le {firstDateLabel}
            </p>
          ) : null}
        </div>
      </div>
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Suggestions — ETF de votre enveloppe
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.isin}
                type="button"
                onClick={() => onSuggestion(s)}
                className="flex items-center gap-2 rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-muted transition-colors hover:border-accent-500/50 hover:text-text-secondary"
              >
                <Plus className="h-3 w-3" aria-hidden />
                {s.ticker}
                <span className="max-w-32 truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
