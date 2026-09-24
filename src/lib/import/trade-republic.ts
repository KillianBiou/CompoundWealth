import { csvToRecords } from "./csv";
import type {
  BrokerImport,
  BrokerImportAdapter,
  ImportedCategory,
  ImportedEnvelope,
  ImportedPosition,
  ImportedValuation,
} from "./types";

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

interface TradeRepublicRow {
  datetime: string;
  date: string;
  account_type: string;
  category: string;
  type: string;
  asset_class: string;
  name: string;
  symbol: string;
  shares: string;
  price: string;
  amount: string;
  fee: string;
  currency: string;
}

function decimalToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function dateOnly(isoLike: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(isoLike)) {
    const parsed = new Date(isoLike);
    if (Number.isNaN(parsed.getTime())) return null;
  }
  return isoLike.slice(0, 10);
}

function rowDate(row: TradeRepublicRow): string {
  return (
    dateOnly(row.datetime) ??
    dateOnly(row.date) ??
    dateOnly(new Date().toISOString()) ??
    ""
  );
}

function mapCategory(row: TradeRepublicRow): ImportedCategory {
  if (row.asset_class === "FUND") return "ETF";
  if (row.asset_class === "STOCK") return "STOCK";
  if (row.asset_class === "BOND") return "BOND";
  if (row.asset_class === "PRIVATE_FUND") return "FUND";
  return "OTHER";
}

function isinOf(row: TradeRepublicRow): string | null {
  return ISIN_PATTERN.test(row.symbol) ? row.symbol : null;
}

interface PositionAccumulator {
  isin: string | null;
  name: string;
  category: ImportedCategory;
  quantity: number;
  investedCents: number;
  firstBoughtAt: string;
  /** dernier prix vu dans le CSV, en centimes (prix « actuel » statique) */
  lastPriceCents: number | null;
  /** achats triés par date, pour reconstruire l'historique au prix du CSV */
  buyDates: { date: string; quantityDelta: number; priceCents: number }[];
  /** versements individuels (montant investi par achat) */
  investments: { date: string; amountCents: number }[];
  /** dividendes et intérêts reçus en cash */
  cashIncomes: { date: string; amountCents: number; kind: string }[];
}

interface EnvelopeAccumulator {
  type: "PEA" | "CTO";
  name: string;
  depositsCents: number;
  firstBuyDate: string | null;
  positions: Map<string, PositionAccumulator>;
}

function envelopeName(accountType: string): string {
  return accountType === "PEA" ? "PEA Trade Republic" : "CTO Trade Republic";
}

function envelopeType(accountType: string): "PEA" | "CTO" {
  return accountType === "PEA" ? "PEA" : "CTO";
}

export const tradeRepublicAdapter: BrokerImportAdapter = {
  id: "trade-republic",
  label: "Trade Republic",
  detect(content: string): boolean {
    const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
    return /"?account_type"?/.test(firstLine) && /"?asset_class"?/.test(firstLine);
  },
  parse(content: string): BrokerImport {
    const records = csvToRecords(content);
    let skippedRows = 0;
    const envelopes = new Map<string, EnvelopeAccumulator>();

    for (const record of records as unknown as TradeRepublicRow[]) {
      const row = {
        datetime: record.datetime ?? "",
        date: record.date ?? "",
        account_type: record.account_type ?? "",
        category: record.category ?? "",
        type: record.type ?? "",
        asset_class: record.asset_class ?? "",
        name: record.name ?? "",
        symbol: record.symbol ?? "",
        shares: record.shares ?? "",
        price: record.price ?? "",
        amount: record.amount ?? "",
        fee: record.fee ?? "",
        currency: record.currency ?? "",
      };

      const isBuy = row.type === "BUY" && row.category === "TRADING";
      if (!isBuy) {
        skippedRows += 1;
        continue;
      }

      const shares = Number.parseFloat(row.shares);
      const priceCents = decimalToCents(row.price);
      const amountCents = decimalToCents(row.amount) ??
        (Number.isFinite(shares) && priceCents !== null
          ? Math.round(shares * priceCents)
          : null);
      const feeCents = decimalToCents(row.fee) ?? 0;
      if (
        !Number.isFinite(shares) ||
        shares <= 0 ||
        priceCents === null ||
        priceCents <= 0 ||
        amountCents === null ||
        row.currency !== "EUR"
      ) {
        skippedRows += 1;
        continue;
      }

      const name = envelopeName(row.account_type);
      let envelope = envelopes.get(name);
      if (!envelope) {
        envelope = {
          type: envelopeType(row.account_type),
          name,
          depositsCents: 0,
          firstBuyDate: null,
          positions: new Map(),
        };
        envelopes.set(name, envelope);
      }

      const date = rowDate(row);
      if (envelope.firstBuyDate === null || date < envelope.firstBuyDate) {
        envelope.firstBuyDate = date;
      }

      const isin = isinOf(row);
      const key = isin ?? row.name;
      let position = envelope.positions.get(key);
      if (!position) {
        position = {
          isin,
          name: row.name || isin || key,
          category: mapCategory(row),
          quantity: 0,
          investedCents: 0,
          firstBoughtAt: date,
          lastPriceCents: null,
          buyDates: [],
          investments: [],
          cashIncomes: [],
        };
        envelope.positions.set(key, position);
      }

      position.quantity += shares;
      position.investedCents += Math.abs(amountCents) + Math.abs(feeCents);
      position.lastPriceCents = priceCents;
      position.buyDates.push({ date, quantityDelta: shares, priceCents });
      position.investments.push({ date, amountCents: Math.abs(amountCents) + Math.abs(feeCents) });

      const invested = Math.abs(amountCents) + Math.abs(feeCents);
      envelope.depositsCents += invested;
    }

    const importedEnvelopes: ImportedEnvelope[] = [...envelopes.values()].map((envelope) => ({
      type: envelope.type,
      name: envelope.name,
      broker: "Trade Republic",
      openedAt: envelope.firstBuyDate,
      depositsCents: envelope.depositsCents,
      positions: [...envelope.positions.values()].map(
        (p): ImportedPosition => ({
          isin: p.isin,
          name: p.name,
          symbol: p.isin,
          category: p.category,
          quantity: p.quantity,
          investedCents: p.investedCents,
          unitPriceCents: p.lastPriceCents ?? 0,
          firstBoughtAt: p.firstBoughtAt,
          valuations: buildValuations(p),
          investments: [...p.investments].sort((a, b) => a.date.localeCompare(b.date)),
          cashIncomes: [...p.cashIncomes].sort((a, b) => a.date.localeCompare(b.date)),
        }),
      ),
    }));

    return { broker: "Trade Republic", envelopes: importedEnvelopes, skippedRows };
  },
};

function buildValuations(position: PositionAccumulator): ImportedValuation[] {
  const byDate = new Map<string, number>();
  let quantity = 0;
  for (const buy of [...position.buyDates].sort((a, b) => a.date.localeCompare(b.date))) {
    quantity += buy.quantityDelta;
    byDate.set(buy.date, Math.round(quantity * buy.priceCents));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, valueCents]) => ({ date, valueCents }));
}
