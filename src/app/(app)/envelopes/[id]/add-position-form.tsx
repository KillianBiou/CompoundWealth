"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { createPositionAction, type ActionState } from "@/server/actions";
import type { InstrumentQuote } from "@/lib/instruments";
import { Button, Field, Input, cn } from "@/components/ui";

export function AddPositionForm({ envelopeId }: { envelopeId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPositionAction,
    {},
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstrumentQuote[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<InstrumentQuote | null>(null);
  const [marketPrice, setMarketPrice] = useState<string>("");
  const [snapshotMode, setSnapshotMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2 || selected) {
      debounceRef.current = setTimeout(() => {
        setResults([]);
        setSearching(false);
      }, 0);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/instruments/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const json = (await res.json()) as { results?: InstrumentQuote[] };
          setResults(json.results ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const pickInstrument = async (quote: InstrumentQuote) => {
    setSelected(quote);
    setResults([]);
    setQuery(quote.symbol);
    setMarketPrice("");
    try {
      const res = await fetch(`/api/instruments/search?price=${encodeURIComponent(quote.symbol)}`);
      if (res.ok) {
        const json = (await res.json()) as { quote?: InstrumentQuote | null };
        if (json.quote?.priceEur) {
          setMarketPrice(String(json.quote.priceEur.toFixed(2)));
        }
      }
    } catch {
      // pas bloquant : l'utilisateur saisit le prix manuellement
    }
  };

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="envelopeId" value={envelopeId} />
      {selected ? (
        <input type="hidden" name="symbol" value={selected.symbol} />
      ) : null}

      <Field
        label="Recherche par identifiant / ticker"
        htmlFor="pos-search"
        hint="Ex. CW8, CW8.PA, AAPL — nom, catégorie et cours récupérés depuis une base publique (Yahoo Finance)"
      >
        <div className="relative">
          <Input
            id="pos-search"
            value={query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
            placeholder="CW8, AAPL, MSFT…"
            autoComplete="off"
            aria-autocomplete="list"
          />
          <span className="pointer-events-none absolute right-3 top-2.5 text-text-muted">
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
          </span>
          {results.length > 0 && !selected ? (
            <ul
              role="listbox"
              aria-label="Résultats de recherche"
              className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border-cw bg-bg-elevated shadow-lg"
            >
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickInstrument(r)}
                    className="w-full px-3 py-2 text-left transition-colors hover:bg-bg-subtle"
                  >
                    <span className="font-medium text-text-primary">{r.symbol}</span>
                    <span className="ml-2 text-xs text-text-muted">{r.type}</span>
                    <span className="block truncate text-xs text-text-secondary">
                      {r.name} · {r.exchange}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Field>

      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-border-cw bg-bg-subtle px-3 py-2 text-sm">
          <div>
            <p className="font-medium">{selected.symbol}</p>
            <p className="text-xs text-text-secondary">{selected.name}</p>
          </div>
          <button
            type="button"
            className="text-xs text-text-muted hover:text-negative"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setMarketPrice("");
            }}
          >
            Changer
          </button>
        </div>
      ) : null}

      <Field label="Nom affiché" htmlFor="pos-name" error={state?.errors?.name}>
        <Input
          id="pos-name"
          name="name"
          required
          key={selected?.symbol ?? "empty"}
          defaultValue={selected ? selected.symbol : ""}
          placeholder={selected ? selected.symbol : "CW8, MSCI World…"}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={snapshotMode}
          onChange={(e) => setSnapshotMode(e.target.checked)}
          className="mt-0.5 accent-[var(--accent-500)]"
        />
        <span>
          <span className="font-medium text-text-primary">J&apos;arrive en cours</span> — je
          détiens déjà cette valeur : je fais l&apos;état des lieux (valeur actuelle à l&apos;instant
          T, sans montant investi historique).
        </span>
      </label>

      {snapshotMode ? (
        <div className="space-y-4 rounded-lg border border-border-cw bg-bg-subtle/50 p-4">
          <p className="text-xs text-text-secondary">
            État des lieux : renseignez la quantité détenue et le cours actuel (pré-rempli si
            trouvé), ou directement la valeur totale de la ligne.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantité détenue" htmlFor="pos-qty" error={state?.errors?.quantity}>
              <Input id="pos-qty" name="quantity" type="number" step="any" min="0" inputMode="decimal" />
            </Field>
            <Field
              label="Cours unitaire actuel (€)"
              htmlFor="pos-unit"
              error={state?.errors?.unitPriceEur}
            >
              <Input
                id="pos-unit"
                name="unitPriceEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                key={marketPrice || "noprice"}
                defaultValue={marketPrice}
              />
            </Field>
          </div>
          <Field
            label="Ou valeur totale de la ligne (€)"
            htmlFor="pos-initial"
            hint="Prioritaire sur quantité × cours si renseignée"
          >
            <Input
              id="pos-initial"
              name="initialValueEur"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
            />
          </Field>
          <input type="hidden" name="investedEur" value="" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="pos-category" error={state?.errors?.category}>
              <Input
                id="pos-category"
                name="category"
                key={selected?.symbol ?? "empty"}
                defaultValue={
                  selected
                    ? selected.type === "ETF"
                      ? "ETF"
                      : selected.type === "EQUITY"
                        ? "STOCK"
                        : selected.type === "BOND"
                          ? "BOND"
                          : selected.type === "FUND"
                            ? "FUND"
                            : "OTHER"
                    : "ETF"
                }
                className="hidden"
              />
              <span
                className={cn("block rounded-lg border border-border-cw bg-bg-subtle px-3 py-2 text-sm")}
              >
                {selected
                  ? selected.type === "ETF"
                    ? "ETF"
                    : selected.type === "EQUITY"
                      ? "Action"
                      : selected.type === "BOND"
                        ? "Obligation"
                        : selected.type === "FUND"
                          ? "Fonds"
                          : "Autre"
                  : "ETF (par défaut)"}
              </span>
            </Field>
            <Field label="Montant investi (€)" htmlFor="pos-invested" error={state?.errors?.investedEur}>
              <Input
                id="pos-invested"
                name="investedEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="500,00"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date d'achat" htmlFor="pos-date" error={state?.errors?.boughtAt}>
              <Input id="pos-date" name="boughtAt" type="date" required />
            </Field>
            <Field label="Quantité" htmlFor="pos-qty" error={state?.errors?.quantity} hint="Optionnel">
              <Input id="pos-qty" name="quantity" type="number" step="any" min="0" inputMode="decimal" />
            </Field>
            <Field label="Prix unitaire (€)" htmlFor="pos-unit" error={state?.errors?.unitPriceEur} hint="Optionnel">
              <Input id="pos-unit" name="unitPriceEur" type="number" step="0.01" min="0" inputMode="decimal" />
            </Field>
          </div>
        </>
      )}

      {snapshotMode ? (
        <Field label="Date de l'état des lieux" htmlFor="pos-date" error={state?.errors?.boughtAt}>
          <Input id="pos-date" name="boughtAt" type="date" required />
        </Field>
      ) : null}

      {state?.message && !state.errors ? (
        <p role="status" className="text-sm text-positive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Ajout…" : snapshotMode ? "Enregistrer l'état des lieux" : "Ajouter la position"}
      </Button>
    </form>
  );
}
