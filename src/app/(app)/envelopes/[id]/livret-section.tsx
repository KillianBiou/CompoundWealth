"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, PiggyBank, TrendingDown } from "lucide-react";
import {
  addLivretDepositAction,
  deleteLivretDepositAction,
  updateLivretSettingsAction,
  type ActionState,
} from "@/server/actions";
import { LIVRET_A_DEFAULT_INFLATION, LIVRET_A_RATE } from "@/lib/livret";
import { formatEurCents } from "@/lib/money";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { useActionToast } from "@/components/use-action-toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";
import { LivretChart, type LivretPointRow } from "./livret-chart";

export interface LivretDepositRow {
  id: string;
  date: Date;
  amountCents: number;
}

function pctLabel(rate: number): string {
  const pct = toPercentValue(rate);
  return `${pct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function toPercentValue(rate: number): number {
  return Math.round(rate * 100 * 100) / 100;
}

export function LivretSection({
  envelopeId,
  deposits,
  series,
  balanceCents,
  interestRate,
  inflationRate,
  projection,
}: {
  envelopeId: string;
  deposits: LivretDepositRow[];
  series: LivretPointRow[];
  balanceCents: number;
  interestRate: number | null;
  inflationRate: number | null;
  projection: {
    interestCents: number;
    inflationLossCents: number;
    overCapCents: number;
    realBalanceCents: number;
    realChangeCents: number;
    realRate: number;
  } | null;
}) {
  const { t } = useI18n();
  const [showCap, setShowCap] = useState(false);
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [depositAmount, setDepositAmount] = useState("");
  const rate = interestRate ?? LIVRET_A_RATE;
  const inflation = inflationRate ?? LIVRET_A_DEFAULT_INFLATION;
  const overCapCents = projection?.overCapCents ?? 0;
  const totalDeposits = deposits.reduce((s, d) => s + d.amountCents, 0);

  const [depositState, depositAction, depositPending] = useActionState<ActionState, FormData>(
    addLivretDepositAction,
    {},
  );
  const [settingsState, settingsAction, settingsPending] = useActionState<ActionState, FormData>(
    updateLivretSettingsAction,
    {},
  );
  useActionToast(depositState);
  useActionToast(settingsState);

  return (
    <div className="space-y-6">
      {overCapCents > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-negative/50 bg-negative/10 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-negative" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-negative">
              {t.envelopes.livret.overCapTitle.replace("{amount}", formatEurCents(overCapCents))}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {t.envelopes.livret.overCapText}
            </p>
          </div>
        </div>
      ) : null}

      <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
            {t.envelopes.livret.balance}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {formatEurCents(balanceCents)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t.envelopes.livret.interestIncluded.replace("{amount}", formatEurCents(Math.max(0, balanceCents - totalDeposits)))}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
            {t.envelopes.livret.expectedInterest}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-positive">
            +{formatEurCents(projection?.interestCents ?? 0)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t.envelopes.livret.atRate.replace("{rate}", pctLabel(rate))}
          </p>
        </div>
        {projection ? (
          <div>
            <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
              {t.envelopes.livret.purchasingPower}
            </p>
            <p
              className={cn(
                "mt-1 font-heading text-2xl font-semibold tabular-nums",
                projection.realChangeCents >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {projection.realChangeCents >= 0 ? "+" : "−"}
              {formatEurCents(Math.abs(projection.realChangeCents))}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                projection.realChangeCents >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {projection.realRate >= 0 ? "+" : "−"}
              {Math.abs(projection.realRate * 100).toFixed(1).replace(".", ",")} % ·{" "}
              {projection.realChangeCents < 0
                ? t.envelopes.livret.realRateNeg
                    .replace("{amount}", formatEurCents(Math.abs(projection.realChangeCents)))
                    .replace("{inflation}", pctLabel(inflation))
                : t.envelopes.livret.realRatePos.replace("{inflation}", pctLabel(inflation))}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
              {t.envelopes.livret.purchasingPower}
            </p>
            <p className="mt-1 text-sm text-text-muted italic">{t.envelopes.livret.addDeposit}</p>
          </div>
        )}
      </Card>

      {projection && projection.realChangeCents < 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <p className="text-sm text-text-secondary">
            <strong className="text-warning">{t.envelopes.livret.powerLossTitle}</strong> {t.envelopes.livret.powerLossText
              .replace("{rate}", pctLabel(rate))
              .replace("{inflation}", pctLabel(inflation))
              .replace("{loss}", `−${formatEurCents(projection.inflationLossCents)}`)
              .replace("{interest}", `+${formatEurCents(projection.interestCents)}`)
              .replace("{net}", `−${formatEurCents(Math.abs(projection.realChangeCents))}`)
              .replace("{rate2}", (projection.realRate * 100).toFixed(1).replace(".", ","))}
            
          </p>
        </div>
      ) : null}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">{t.envelopes.livret.balanceEvolution}</h2>
          <Badge tone="neutral">{pctLabel(rate)}</Badge>
        </div>
        <LivretChart
          series={series}
          showCap={showCap}
          onToggleCap={() => setShowCap((v) => !v)}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-heading text-lg font-semibold">{t.envelopes.livret.depositsTitle}</h2>
          <form action={depositAction} className="mt-4 space-y-3" noValidate>
            <input type="hidden" name="envelopeId" value={envelopeId} />
            <div className="flex items-end gap-3">
              <div className="w-40 shrink-0">
                <Field
                  label={t.envelopes.livret.date}
                  htmlFor="livret-deposit-date"
                  error={depositState?.errors?.date}
                >
                  <Input
                    id="livret-deposit-date"
                    name="date"
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field
                  label={t.envelopes.livret.amount}
                  htmlFor="livret-deposit-amount"
                  error={depositState?.errors?.amountEur}
                >
                  <Input
                    id="livret-deposit-amount"
                    name="amountEur"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="500,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className={cn(
                      depositAmount.trim() !== "" &&
                        Number(depositAmount) < 0 &&
                        "border-negative/60 text-negative",
                      depositAmount.trim() !== "" &&
                        Number(depositAmount) > 0 &&
                        "border-positive/60 text-positive",
                    )}
                    required
                  />
                </Field>
              </div>
            </div>
            {depositState?.errors?.form ? (
              <p role="alert" className="text-sm text-negative">
                {depositState.errors.form[0]}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={depositPending}
              className={cn(
                "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-50",
                Number(depositAmount) < 0
                  ? "bg-negative hover:bg-negative/85"
                  : "bg-positive hover:bg-positive/85",
              )}
            >
              <PiggyBank className="h-4 w-4" aria-hidden />
              {depositPending
                ? t.envelopes.livret.saving
                : Number(depositAmount) < 0
                  ? t.envelopes.livret.saveWithdrawal
                  : t.envelopes.livret.saveDeposit}
            </button>
          </form>
          {deposits.length > 0 ? (
            <ul className="mt-5 space-y-1.5 border-t border-border-cw/60 pt-4">
              {deposits
                .slice()
                .reverse()
                .map((dep) => (
                  <DepositRow key={dep.id} envelopeId={envelopeId} deposit={dep} />
                ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              {t.envelopes.livret.noMovements}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-heading text-lg font-semibold">{t.envelopes.livret.settingsTitle}</h2>
          <p className="mt-1 text-xs text-text-muted">
            {t.envelopes.livret.settingsHint
              .replace("{rate}", pctLabel(LIVRET_A_RATE))
              .replace("{inflation}", pctLabel(LIVRET_A_DEFAULT_INFLATION))}
          </p>
          <form action={settingsAction} className="mt-4 space-y-4" noValidate>
            <input type="hidden" name="envelopeId" value={envelopeId} />
            <Field
              label={t.envelopes.livret.rateLabel}
              htmlFor="livret-rate"
              error={settingsState?.errors?.interestRate}
              hint={t.envelopes.livret.rateHint}
            >
              <Input
                id="livret-rate"
                name="interestRate"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={toPercentValue(rate).toString()}
                required
              />
            </Field>
            <Field
              label={t.envelopes.livret.inflationLabel}
              htmlFor="livret-inflation"
              error={settingsState?.errors?.inflationRate}
              hint={t.envelopes.livret.inflationHint}
            >
              <Input
                id="livret-inflation"
                name="inflationRate"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={toPercentValue(inflation).toString()}
                required
              />
            </Field>
            {settingsState?.errors?.form ? (
              <p role="alert" className="text-sm text-negative">
                {settingsState.errors.form[0]}
              </p>
            ) : null}
            <Button type="submit" variant="secondary" disabled={settingsPending}>
              {settingsPending ? t.envelopes.livret.saving : t.envelopes.livret.updateSettings}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function DepositRow({
  envelopeId,
  deposit,
}: {
  envelopeId: string;
  deposit: LivretDepositRow;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deleteLivretDepositAction,
    {},
  );
  useActionToast(state);
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="tabular-nums text-text-secondary">
        {deposit.date.toLocaleDateString("fr-FR")}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          deposit.amountCents >= 0 ? "text-positive" : "text-negative",
        )}
      >
        {deposit.amountCents >= 0 ? "+" : "−"}
        {formatEurCents(Math.abs(deposit.amountCents))}
      </span>
      <form action={action}>
        <input type="hidden" name="depositId" value={deposit.id} />
        <input type="hidden" name="envelopeId" value={envelopeId} />
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer text-xs text-text-muted transition-colors hover:text-negative disabled:opacity-50"
        >
          {t.common.delete}
        </button>
      </form>
    </li>
  );
}
