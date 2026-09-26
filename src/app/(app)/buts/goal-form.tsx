"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Shield,
  TrendingUp,
  Palmtree,
  Home,
  Car,
  Heart,
  Plane,
  GraduationCap,
  Target,
  type LucideIcon,
} from "lucide-react";
import { createGoalAction, updateGoalAction, type ActionState } from "@/server/actions";
import type { GoalType } from "@/lib/goals/progress";
import { computeGoalMetrics, DEFAULT_SAFETY_NET_MONTHS, DEFAULT_WITHDRAWAL_RATE } from "@/lib/goals/progress";
import { checkGoalEnvelopes, type LinkableEnvelope } from "@/lib/goals/linking";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { cn } from "@/components/cn";
import { useActionToast } from "@/components/use-action-toast";
import { useI18n } from "@/i18n/provider";
import { GoalStatusBadge } from "./goal-status-badge";

export interface GoalFormInitial {
  id?: string;
  type: GoalType;
  name: string;
  icon: string;
  targetAmountEur?: string;
  targetRentEur?: string;
  targetMonths?: number;
  targetDate?: string;
  withdrawalRate?: string;
  monthlyExpensesEur?: string;
  monthlyContributionEur?: string;
  envelopeIds: string[];
}

interface Template {
  type: GoalType;
  iconKey: string;
  Icon: LucideIcon;
  /** CUSTOM_LIFEVENT décliné : voiture, mariage, voyage, études */
  presetName?: string;
}

const TEMPLATES: Template[] = [
  { type: "SAFETY_NET", iconKey: "SAFETY_NET", Icon: Shield },
  { type: "FIRE", iconKey: "FIRE", Icon: TrendingUp },
  { type: "RETIREMENT", iconKey: "RETIREMENT", Icon: Palmtree },
  { type: "DOWN_PAYMENT", iconKey: "DOWN_PAYMENT", Icon: Home },
  { type: "CUSTOM_LIFEVENT", iconKey: "CAR", Icon: Car },
  { type: "CUSTOM_LIFEVENT", iconKey: "WEDDING", Icon: Heart },
  { type: "CUSTOM_LIFEVENT", iconKey: "TRAVEL", Icon: Plane },
  { type: "CUSTOM_LIFEVENT", iconKey: "STUDIES", Icon: GraduationCap },
  { type: "CUSTOM", iconKey: "CUSTOM", Icon: Target },
];

function typeOfTemplate(t: Template): GoalType {
  return t.type;
}

export function GoalForm({
  envelopes,
  initial,
  expectedReturn,
  defaultMonthlyExpensesEur,
}: {
  envelopes: (LinkableEnvelope & { valueCents?: number })[];
  initial: GoalFormInitial;
  expectedReturn: number;
  defaultMonthlyExpensesEur?: string;
}) {
  const { t } = useI18n();
  const isEdit = Boolean(initial.id);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateGoalAction : createGoalAction,
    {},
  );
  useActionToast(state);

  const [type, setType] = useState<GoalType>(initial.type);
  const [name, setName] = useState(initial.name);
  const [nameEdited, setNameEdited] = useState(Boolean(initial.name));
  const [iconKey, setIconKey] = useState(initial.icon || "target");
  const [targetAmountEur, setTargetAmountEur] = useState(initial.targetAmountEur ?? "");
  const [targetRentEur, setTargetRentEur] = useState(initial.targetRentEur ?? "");
  const [targetMonths, setTargetMonths] = useState(String(initial.targetMonths ?? DEFAULT_SAFETY_NET_MONTHS));
  const [targetDate, setTargetDate] = useState(initial.targetDate ?? "");
  const [withdrawalRate, setWithdrawalRate] = useState(
    initial.withdrawalRate ?? String(DEFAULT_WITHDRAWAL_RATE),
  );
  const [monthlyExpensesEur, setMonthlyExpensesEur] = useState(
    initial.monthlyExpensesEur ?? defaultMonthlyExpensesEur ?? "",
  );
  const [monthlyContributionEur, setMonthlyContributionEur] = useState(
    initial.monthlyContributionEur ?? "",
  );
  const [selected, setSelected] = useState<string[]>(initial.envelopeIds);
  const [safetyMode, setSafetyMode] = useState<"RESERVE" | "AMOUNT">(
    initial.targetAmountEur ? "AMOUNT" : "RESERVE",
  );

  const toggleEnvelope = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const templates = useMemo(
    () => TEMPLATES.filter((t, i) => TEMPLATES.findIndex((x) => x.iconKey === t.iconKey) === i),
    [],
  );

  // récapitulatif pré-validation : mêmes fonctions que le serveur
  const preview = useMemo(() => {
    const linkedValueCents = selected.reduce(
      (s, id) => s + (envelopes.find((e) => e.id === id)?.valueCents ?? 0),
      0,
    );
    const contributionEur = Number.parseFloat(monthlyContributionEur.replace(",", ".")) || 0;
    const expensesEur = Number.parseFloat(monthlyExpensesEur.replace(",", ".")) || 0;
    const metrics = computeGoalMetrics({
      type,
      linkedValueCents,
      targetAmountCents: targetAmountEur ? Math.round(Number.parseFloat(targetAmountEur.replace(",", ".")) * 100) : null,
      targetRentCents: targetRentEur ? Math.round(Number.parseFloat(targetRentEur.replace(",", ".")) * 100) : null,
      targetMonths: type === "SAFETY_NET" ? Number.parseInt(targetMonths, 10) : null,
      monthlyExpensesCents: expensesEur > 0 ? Math.round(expensesEur * 100) : null,
      withdrawalRate: type === "FIRE" ? Number.parseFloat(withdrawalRate) : null,
      monthlyContributionCents: Math.round(contributionEur * 100),
      targetDate: targetDate ? new Date(targetDate) : null,
      createdAt: new Date(),
      expectedReturn,
    });
    return { metrics, linkedValueCents };
  }, [type, selected, targetAmountEur, targetRentEur, targetMonths, monthlyExpensesEur, withdrawalRate, monthlyContributionEur, targetDate, envelopes, expectedReturn]);

  const linkError = checkGoalEnvelopes(
    type,
    envelopes,
    selected,
    isEdit ? initial.id : undefined,
  );

  const showTemplatePickers = !isEdit;

  return (
    <form action={action} className="space-y-6">
      {isEdit ? <input type="hidden" name="goalId" value={initial.id} /> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="icon" value={iconKey} />

      {showTemplatePickers ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {templates.map((tpl) => {
            const active = type === tpl.type && iconKey === tpl.iconKey;
            return (
              <button
                key={tpl.iconKey}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setType(typeOfTemplate(tpl));
                  setIconKey(tpl.iconKey);
                  if (!nameEdited) {
                    setName(
                      t.goals.new.templates[
                        tpl.iconKey as keyof typeof t.goals.new.templates
                      ] ?? "",
                    );
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                  active
                    ? "border-accent-500 bg-accent-100/40"
                    : "border-border-cw bg-bg-elevated hover:border-accent-500/40",
                )}
              >
                <tpl.Icon className="h-5 w-5 text-accent-500" aria-hidden />
                <span className="text-[11px] leading-tight text-text-secondary">
                  {t.goals.new.templates[tpl.iconKey as keyof typeof t.goals.new.templates]}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Card className="p-4">
          <p className="text-sm text-text-secondary">{t.goals.edit.typeLocked}</p>
        </Card>
      )}

      <Field label={t.goals.new.name} htmlFor="name" error={state?.errors?.name}>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameEdited(true);
          }}
          placeholder={t.goals.new.namePlaceholder}
        />
      </Field>

      {type === "SAFETY_NET" ? (
        <div className="space-y-4">
          <div className="flex gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={safetyMode === "RESERVE"}
              onClick={() => setSafetyMode("RESERVE")}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                safetyMode === "RESERVE"
                  ? "border-accent-500 bg-accent-100/40 font-medium"
                  : "border-border-cw bg-bg-elevated hover:border-accent-500/40",
              )}
            >
              {t.goals.new.safetyModeReserve}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={safetyMode === "AMOUNT"}
              onClick={() => setSafetyMode("AMOUNT")}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                safetyMode === "AMOUNT"
                  ? "border-accent-500 bg-accent-100/40 font-medium"
                  : "border-border-cw bg-bg-elevated hover:border-accent-500/40",
              )}
            >
              {t.goals.new.safetyModeAmount}
            </button>
          </div>
          {safetyMode === "RESERVE" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t.goals.new.monthlyExpenses}
                htmlFor="monthlyExpensesEur"
                error={state?.errors?.monthlyExpensesEur}
                hint={t.goals.new.monthlyExpensesHint}
              >
                <Input
                  id="monthlyExpensesEur"
                  name="monthlyExpensesEur"
                  type="number"
                  step="0.01"
                  min="1"
                  inputMode="decimal"
                  required
                  value={monthlyExpensesEur}
                  onChange={(e) => setMonthlyExpensesEur(e.target.value)}
                  placeholder="1 500,00"
                />
              </Field>
              <Field
                label={t.goals.new.targetMonths}
                htmlFor="targetMonths"
                error={state?.errors?.targetMonths}
              >
                <Select
                  id="targetMonths"
                  name="targetMonths"
                  required
                  value={targetMonths}
                  onChange={(e) => setTargetMonths(e.target.value)}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {m} {t.goals.new.targetMonthsUnit}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <Field
              label={t.goals.new.safetyAmountTarget}
              htmlFor="targetAmountEur"
              error={state?.errors?.targetAmountEur}
              hint={t.goals.new.safetyAmountTargetHint}
            >
              <Input
                id="targetAmountEur"
                name="targetAmountEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                required
                value={targetAmountEur}
                onChange={(e) => setTargetAmountEur(e.target.value)}
                placeholder="15 000,00"
              />
            </Field>
          )}
        </div>
      ) : type === "FIRE" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.goals.new.targetRent}
            htmlFor="targetRentEur"
            error={state?.errors?.targetRentEur}
          >
            <Input
              id="targetRentEur"
              name="targetRentEur"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              value={targetRentEur}
              onChange={(e) => setTargetRentEur(e.target.value)}
              placeholder="850,00"
            />
          </Field>
          <Field
            label={t.goals.new.withdrawalRate}
            htmlFor="withdrawalRate"
            error={state?.errors?.withdrawalRate}
            hint={t.goals.new.withdrawalRateHint}
          >
            <Select
              id="withdrawalRate"
              name="withdrawalRate"
              value={withdrawalRate}
              onChange={(e) => setWithdrawalRate(e.target.value)}
            >
              {[0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.06, 0.07, 0.08].map((r) => (
                <option key={r} value={r}>
                  {formatPercent(r)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (
        <Field
          label={t.goals.new.targetAmount}
          htmlFor="targetAmountEur"
          error={state?.errors?.targetAmountEur}
        >
          <Input
            id="targetAmountEur"
            name="targetAmountEur"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            value={targetAmountEur}
            onChange={(e) => setTargetAmountEur(e.target.value)}
            placeholder="60 000,00"
          />
        </Field>
      )}

      {type !== "SAFETY_NET" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.goals.new.targetDate}
            htmlFor="targetDate"
            error={state?.errors?.targetDate}
          >
            <Input
              id="targetDate"
              name="targetDate"
              type="date"
              required={type !== "CUSTOM"}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </Field>
          <Field
            label={t.goals.new.monthlyContribution}
            htmlFor="monthlyContributionEur"
            error={state?.errors?.monthlyContributionEur}
            hint={t.goals.new.monthlyContributionHint}
          >
            <Input
              id="monthlyContributionEur"
              name="monthlyContributionEur"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={monthlyContributionEur}
              onChange={(e) => setMonthlyContributionEur(e.target.value)}
              placeholder="500,00"
            />
          </Field>
        </div>
      ) : null}

      <Field
        label={t.goals.new.envelopes}
        htmlFor="envelopes"
        error={state?.errors?.envelopeIds ?? (linkError ? [linkError] : undefined)}
        hint={t.goals.new.envelopesHint}
      >
        <div id="envelopes" className="space-y-2">
          {envelopes.length === 0 ? (
            <p className="text-sm text-text-muted">{t.goals.card.noEnvelopes}</p>
          ) : (
            envelopes.map((env) => {
              const checked = selected.includes(env.id);
              const linkedToOther = env.goalId !== null && env.goalId !== initial.id;
              return (
                <label
                  key={env.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                    checked
                      ? "border-accent-500 bg-accent-100/20"
                      : "border-border-cw bg-bg-elevated hover:border-accent-500/40",
                    linkedToOther && !checked ? "opacity-60" : "",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="envelopeIds"
                      value={env.id}
                      checked={checked}
                      onChange={() => toggleEnvelope(env.id)}
                      className="h-4 w-4 accent-[var(--accent-500)]"
                    />
                    <span className="text-sm">
                      <span className="font-medium">{env.name}</span>
                      <span className="ml-2 text-xs text-text-muted">{env.type}</span>
                    </span>
                  </span>
                  {linkedToOther && !checked ? (
                    <Badge tone="neutral">{t.goals.new.envelopeLinkedToOther}</Badge>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
      </Field>

      {/* récapitulatif pré-validation (exigence spec §3.2.4) */}
      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">{t.goals.new.recap}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">
              {t.goals.new.recapProgress}
            </p>
            <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
              {Math.round(preview.metrics.displayProgress * 100)} %
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">
              {t.goals.new.recapRequiredReturn}
            </p>
            <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
              {preview.metrics.requiredReturn !== null
                ? formatPercent(preview.metrics.requiredReturn)
                : t.goals.new.notApplicable}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">
              {t.goals.new.recapStatus}
            </p>
            <div className="mt-1">
              <GoalStatusBadge status={preview.metrics.status} />
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          {t.goals.detail.current} : {formatEurCents(preview.linkedValueCents)}
        </p>
      </Card>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending
          ? isEdit
            ? t.goals.edit.saving
            : t.goals.new.creating
          : isEdit
            ? t.goals.edit.save
            : t.goals.new.create}
      </Button>
    </form>
  );
}
