import { tradeRepublicAdapter } from "./trade-republic";
import type { BrokerImport, BrokerImportAdapter } from "./types";

export const BROKER_ADAPTERS: BrokerImportAdapter[] = [tradeRepublicAdapter];

export function detectBrokerAdapter(content: string): BrokerImportAdapter | null {
  return BROKER_ADAPTERS.find((adapter) => adapter.detect(content)) ?? null;
}

export function parseBrokerImport(content: string): BrokerImport {
  const adapter = detectBrokerAdapter(content);
  if (!adapter) {
    throw new Error("Format de fichier non reconnu");
  }
  return adapter.parse(content);
}

export type {
  BrokerImport,
  BrokerImportAdapter,
  ImportedEnvelope,
  ImportedPosition,
  ImportedValuation,
} from "./types";
export { tradeRepublicAdapter } from "./trade-republic";
