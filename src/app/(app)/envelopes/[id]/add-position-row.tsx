"use client";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Search, X } from "lucide-react";
import { createPositionAction, type ActionState } from "@/server/actions";
import { searchEtfCatalog, type EtfCatalogEntry } from "@/lib/etf-catalog";
import { formatRate } from "@/lib/money";
import { Badge, Button, Input } from "@/components/ui";
import { useActionToast } from "@/components/use-action-toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

export function AddPositionRow({ envelopeId }: { envelopeId: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPositionAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EtfCatalogEntry | null>(null);
  const results = useMemo(
    () => (selected ? [] : searchEtfCatalog(query).slice(0, 8)),
    [query, selected],
  );
  const pick = (etf: EtfCatalogEntry) => {
    setSelected(etf);
    setQuery(etf.ticker);
  };
  const reset = () => {
    setOpen(false);
    setSelected(null);
    setQuery("");
  };
  useActionToast(state, reset);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 border-t border-border-cw px-6 py-3 text-sm text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-secondary"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t.envelopes.positions.addPosition}
      </button>
    );
  }
  return (
    <div className="border-t border-border-cw px-6 py-5">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="envelopeId" value={envelopeId} />
        {selected ? <input type="hidden" name="isin" value={selected.isin} /> : null}
        {selected ? (
          <div className="flex items-center justify-between rounded-lg border border-border-cw bg-bg-subtle px-3 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium text-text-primary">
                <span>{selected.ticker}</span>
                <Badge tone="accent">{selected.indexCategory}</Badge>
              </p>
              <p className="truncate text-xs text-text-secondary">
                {selected.name} · {selected.isin} · {selected.issuer} ·{" "}
                {formatRate(selected.ter)} {t.envelopes.positions.perYear}
              </p>
            </div>
            <button
              type="button"
              className="ml-3 flex shrink-0 items-center gap-1 text-xs text-text-muted hover:text-negative"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
            >
              <X className="h-3 w-3" aria-hidden />
              {t.envelopes.positions.change}
            </button>
          </div>
        ) : (
          <div className="relative">
            <label htmlFor="pos-search" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
              {t.envelopes.positions.searchLabel}
            </label>
            <Input
              id="pos-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.envelopes.positions.searchPlaceholder}
              autoComplete="off"
              aria-autocomplete="list"
            />
            <span className="pointer-events-none absolute right-3 top-7 text-text-muted">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            {results.length > 0 ? (
              <ul
                role="listbox"
                aria-label={t.envelopes.positions.resultsLabel}
                className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border-cw bg-bg-elevated shadow-lg"
              >
                {results.map((etf) => (
                  <li key={etf.isin}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => pick(etf)}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-bg-subtle"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {etf.ticker}
                        </span>
                        <span className="text-xs text-text-muted">
                          {etf.indexCategory} · {formatRate(etf.ter)}
                        </span>
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
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="pos-quantity"
                className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
              >
                {t.envelopes.positions.quantity}
              </label>
              <Input
                id="pos-quantity"
                name="quantity"
                type="number"
                step="0.0001"
                min="0"
                inputMode="decimal"
                required
                placeholder="12,5"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="pos-date"
                className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
              >
                {t.envelopes.positions.boughtAt}
              </label>
              <Input id="pos-date" name="boughtAt" type="date" required />
            </div>
            {selected.isPrivate ? (
              <div className="flex-1">
                <label
                  htmlFor="pos-price"
                  className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
                >
                  {t.envelopes.positions.navPrice}
                </label>
                <Input
                  id="pos-price"
                  name="manualPriceEur"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  required
                  placeholder="100,00"
                />
                <p className="mt-1 text-xs text-text-muted">
                  {t.envelopes.positions.privPriceHint}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            {t.envelopes.positions.selectEtf}
          </p>
        )}
        {state?.errors?.form ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.form[0]}
          </p>
        ) : null}
        {state?.errors?.isin ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.isin[0]}
          </p>
        ) : null}
        {state?.errors?.quantity ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.quantity[0]}
          </p>
        ) : null}
        {state?.errors?.boughtAt ? (
          <p role="alert" className="text-sm text-negative">
            {state.errors.boughtAt[0]}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={pending || !selected}
            className={cn("w-full sm:w-auto")}
          >
            {pending ? t.envelopes.positions.adding : t.envelopes.positions.addPosition}
          </Button>
          <Button type="button" variant="ghost" onClick={reset} disabled={pending}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}
