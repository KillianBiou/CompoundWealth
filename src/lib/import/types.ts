export type ImportedCategory = "ETF" | "STOCK" | "BOND" | "FUND" | "OTHER";
export type ImportedEnvelopeType = "PEA" | "CTO" | "PRIV";

export interface ImportedValuation {
  date: string;
  valueCents: number;
}

export interface ImportedPosition {
  isin: string | null;
  name: string;
  symbol: string | null;
  category: ImportedCategory;
  quantity: number;
  investedCents: number;
  unitPriceCents: number;
  firstBoughtAt: string;
  valuations: ImportedValuation[];
  /** achats individuels reconstruits depuis l'historique */
  investments: { date: string; amountCents: number }[];
  /** dividendes et intérêts reçus, reconstruits depuis l'historique */
  cashIncomes: { date: string; amountCents: number; kind: string }[];
}

export interface ImportedEnvelope {
  type: ImportedEnvelopeType;
  name: string;
  broker: string | null;
  openedAt: string | null;
  depositsCents: number;
  positions: ImportedPosition[];
}

export interface BrokerImport {
  broker: string;
  envelopes: ImportedEnvelope[];
  skippedRows: number;
}

export interface BrokerImportAdapter {
  id: string;
  label: string;
  detect(content: string): boolean;
  parse(content: string): BrokerImport;
}
