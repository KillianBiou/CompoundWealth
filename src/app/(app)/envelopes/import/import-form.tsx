"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { FileUp, Upload } from "lucide-react";
import {
  analyzeImportAction,
  confirmImportAction,
  type ImportActionState,
  type ImportPreviewEnvelope,
} from "@/server/actions";
import { formatEurCents } from "@/lib/money";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/components/cn";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] ?? "text/plain";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function ImportForm() {
  const [analyzeState, analyze, analyzing] = useActionState<ImportActionState, FormData>(
    analyzeImportAction,
    {},
  );
  const [confirmState, confirm, confirming] = useActionState<ImportActionState, FormData>(
    confirmImportAction,
    {},
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [storedFile, setStoredFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview: ImportPreviewEnvelope[] | null =
    analyzeState.preview && analyzeState.preview.length > 0 ? analyzeState.preview : null;
  const state = preview ? confirmState : analyzeState;
  const fileError = state?.errors?.file;

  const onFileChange = async (file: File) => {
    setFileName(file.name);
    setStoredFile(await fileToDataUrl(file));
  };

  const onConfirm = (formData: FormData) => {
    if (storedFile) {
      formData.set("file", dataUrlToBlob(storedFile));
    }
    return confirm(formData);
  };

  const reset = () => {
    setFileName(null);
    setStoredFile(null);
    if (inputRef.current) inputRef.current.value = "";
    window.location.reload();
  };

  if (preview) {
    return (
      <form action={onConfirm} className="space-y-5" noValidate>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{analyzeState.broker ?? "Courtier"}</Badge>
            <span className="text-sm text-text-secondary">{fileName}</span>
            {analyzeState.skippedRows ? (
              <span className="text-xs text-text-muted">
                {analyzeState.skippedRows} ligne{analyzeState.skippedRows > 1 ? "s" : ""} ignorée
                {analyzeState.skippedRows > 1 ? "s" : ""} (dividendes, espèces…)
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            Choisir un autre fichier
          </button>
        </div>

        {preview.map((envelope) => (
          <Card key={envelope.name} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-lg font-semibold">{envelope.name}</h2>
              <Badge tone={envelope.type === "PEA" ? "positive" : "warning"}>
                {envelope.type}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary">
              {envelope.openedAt
                ? `Premier achat le ${new Date(envelope.openedAt).toLocaleDateString("fr-FR")}`
                : "Date de premier achat inconnue"}
              {" · "}
              Versements cumulés : <strong>{formatEurCents(envelope.depositsCents)}</strong>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border-cw text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="py-2 pr-4 font-medium">Position</th>
                    <th className="py-2 pr-4 font-medium">Parts</th>
                    <th className="py-2 pr-4 text-right font-medium">Investi</th>
                    <th className="py-2 pr-4 text-right font-medium">Valeur actuelle</th>
                    <th className="py-2 text-right font-medium">Historique</th>
                  </tr>
                </thead>
                <tbody>
                  {envelope.positions.map((p) => (
                    <tr
                      key={`${envelope.name}-${p.isin ?? p.name}`}
                      className="border-t border-border-cw/60"
                    >
                      <td className="py-2 pr-4">
                        <span className="font-medium text-text-primary">{p.name}</span>
                        {p.isin ? (
                          <span className="ml-2 text-xs text-text-muted">{p.isin}</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-text-secondary">
                        {p.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatEurCents(p.investedCents)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatEurCents(p.currentValueCents)}
                      </td>
                      <td className="py-2 text-right text-xs text-text-muted">
                        {p.historyPoints} point{p.historyPoints > 1 ? "s" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {confirmState.errors?.file ? (
          <p className="text-sm text-negative">{confirmState.errors.file[0]}</p>
        ) : null}
        {confirmState.message && !confirmState.errors ? (
          <p className="text-sm text-negative">{confirmState.message}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={confirming}>
            <Upload className="h-4 w-4" aria-hidden />
            {confirming ? "Import en cours…" : "Importer et créer les enveloppes"}
          </Button>
          <p className="text-xs text-text-muted">
            Les enveloppes seront créées automatiquement avec leurs positions, leurs versements
            cumulés et l&apos;historique de valorisation reconstruit depuis le fichier.
          </p>
        </div>
      </form>
    );
  }

  return (
    <form action={analyze} className="space-y-5" noValidate>
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          fileError
            ? "border-negative/60 bg-negative/5"
            : "border-border-cw bg-bg-subtle hover:border-accent-500/50",
        )}
      >
        <FileUp className="h-8 w-8 text-text-muted" aria-hidden />
        <span className="font-medium text-text-primary">
          {fileName ?? "Choisissez votre fichier d'export"}
        </span>
        <span className="text-sm text-text-secondary">
          CSV des transactions — ex. Trade Republic (5 Mo max)
        </span>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFileChange(file);
          }}
        />
      </label>

      {fileError ? <p className="text-sm text-negative">{fileError[0]}</p> : null}
      {analyzeState.message && !analyzeState.errors ? (
        <p className="text-sm text-positive">{analyzeState.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={analyzing}>
          Analyser le fichier
        </Button>
        <p className="text-xs text-text-muted">
          Le courtier est détecté automatiquement. Rien n&apos;est enregistré à cette étape.
        </p>
      </div>
    </form>
  );
}
