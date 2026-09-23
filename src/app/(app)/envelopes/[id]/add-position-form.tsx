"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Search, X } from "lucide-react";
import { createPositionAction, type ActionState } from "@/server/actions";
import { searchEtfCatalog, type EtfCatalogEntry } from "@/lib/etf-catalog";
import { formatRate } from "@/lib/money";
import { Badge, Button, Field, Input, cn } from "@/components/ui";

export function AddPositionForm({ envelopeId }: { envelopeId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPositionAction,
    {},
  );

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

  return (
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
              {formatRate(selected.ter)} / an
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
            Changer
          </button>
        </div>
      ) : (
        <Field
          label="Recherche par nom ou ISIN"
          htmlFor="pos-search"
          hint="ETF éligibles au PEA — ex. CW8, MSCI World, LU1681043599"
          error={state?.errors?.isin}
        >
          <div className="relative">
            <Input
              id="pos-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, ticker ou ISIN…"
              autoComplete="off"
              aria-autocomplete="list"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-text-muted">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            {results.length > 0 ? (
              <ul
                role="listbox"
                aria-label="ETF correspondants"
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
        </Field>
      )}

      {selected ? (
        <>
          <Field
            label="Valeur actuelle de la position (€)"
            htmlFor="pos-value"
            hint="État des lieux : la valeur totale de cette ligne à l'instant T"
            error={state?.errors?.valueEur}
          >
            <Input
              id="pos-value"
              name="valueEur"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              placeholder="1250,00"
            />
          </Field>
          <Field
            label="Date de l'état des lieux"
            htmlFor="pos-date"
            error={state?.errors?.boughtAt}
          >
            <Input id="pos-date" name="boughtAt" type="date" required />
          </Field>
        </>
      ) : (
        <p className="text-sm text-text-secondary">
          Sélectionnez un ETF dans la liste pour saisir sa valeur.
        </p>
      )}

      {state?.message && !state.errors ? (
        <p role="status" className="text-sm text-positive">
          {state.message}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending || !selected}
        className={cn("w-full sm:w-auto")}
      >
        {pending ? "Ajout…" : "Ajouter la position"}
      </Button>
    </form>
  );
}
