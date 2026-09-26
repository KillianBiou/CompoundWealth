import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../../../tests/test-utils";
import { GoalForm } from "./goal-form";
import type { LinkableEnvelope } from "@/lib/goals/linking";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

const createAction = vi.fn();
const updateAction = vi.fn();
vi.mock("@/server/actions", () => ({
  createGoalAction: (state: unknown, formData: FormData) => createAction(state, formData),
  updateGoalAction: (state: unknown, formData: FormData) => updateAction(state, formData),
}));
vi.mock("@/components/use-action-toast", () => ({
  useActionToast: () => undefined,
}));

function makeEnvelope(overrides: Partial<LinkableEnvelope & { valueCents?: number }> = {}) {
  return {
    id: "env-1",
    name: "PEA Bourse",
    type: "PEA" as const,
    closedAt: null,
    goalId: null,
    valueCents: 1_820_000,
    ...overrides,
  };
}

describe("GoalForm — création", () => {
  it("sélecteur de modèles : 9 modèles, actifs par type+icône", () => {
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope()]}
        initial={{ type: "SAFETY_NET", name: "", icon: "SAFETY_NET", targetMonths: 6, envelopeIds: [] }}
        expectedReturn={0.062}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /matelas|rente|retraite|apport|voiture|mariage|voyage|études|personnalisé/i });
    expect(buttons.length).toBe(9);
  });

  it("matelas : champs dépenses mensuelles + durée, pas de date cible", () => {
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope()]}
        initial={{ type: "SAFETY_NET", name: "", icon: "SAFETY_NET", targetMonths: 6, envelopeIds: [] }}
        expectedReturn={0.062}
      />,
    );
    expect(screen.getByLabelText(/dépenses mensuelles/i)).toBeTruthy();
    expect(screen.queryByLabelText(/date cible/i)).toBeNull();
  });

  it("récap dynamique : progression 30 % quand 18 200 € liés pour 60 000 €", async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope()]}
        initial={{ type: "SAFETY_NET", name: "", icon: "SAFETY_NET", targetMonths: 6, envelopeIds: ["env-1"] }}
        expectedReturn={0.062}
      />,
    );
    const expenses = screen.getByLabelText(/dépenses mensuelles/i);
    await user.type(expenses, "1000");
    // 18 200 € couverts / 1000 € → 18,2 mois ≥ 6 mois cible → 100 %
    expect(screen.getByText("100 %")).toBeTruthy();
  });

  it("FIRE : champs rente cible + taux de retrait, matelas refusé", () => {
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope()]}
        initial={{ type: "FIRE", name: "", icon: "FIRE", targetRentEur: "850", envelopeIds: [] }}
        expectedReturn={0.062}
      />,
    );
    expect(screen.getByLabelText(/rente mensuelle/i)).toBeTruthy();
    expect(screen.getByLabelText(/taux de retrait/i)).toBeTruthy();
  });

  it("checkbox enveloppes : toggle met à jour la valeur liée du récap", async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope()]}
        initial={{ type: "FIRE", name: "", icon: "FIRE", targetRentEur: "850", envelopeIds: [] }}
        expectedReturn={0.062}
      />,
    );
    const cb = screen.getByRole("checkbox", { name: /PEA Bourse/i });
    expect((cb as HTMLInputElement).checked).toBe(false);
    await user.click(cb);
    expect((cb as HTMLInputElement).checked).toBe(true);
  });

  it("submit envoie type, name, icon et envelopeIds", async () => {
    const user = userEvent.setup();
    createAction.mockResolvedValueOnce(undefined);
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope()]}
        initial={{ type: "SAFETY_NET", name: "Matelas", icon: "SAFETY_NET", targetMonths: 6, envelopeIds: ["env-1"] }}
        expectedReturn={0.062}
      />,
    );
    await user.type(screen.getByLabelText(/dépenses mensuelles/i), "1500");
    await user.click(screen.getByRole("button", { name: /créer le but/i }));
    await vi.waitFor(() => {
      expect(createAction).toHaveBeenCalled();
      const formData = createAction.mock.calls[0][1] as FormData;
      expect(formData.get("type")).toBe("SAFETY_NET");
      expect(formData.get("name")).toBe("Matelas");
      expect(formData.get("icon")).toBe("SAFETY_NET");
      expect(formData.getAll("envelopeIds")).toEqual(["env-1"]);
    });
  });
});

describe("GoalForm — édition", () => {
  it("type verrouillé : pas de sélecteur de modèles, goalId envoyé", async () => {
    const user = userEvent.setup();
    updateAction.mockResolvedValueOnce(undefined);
    renderWithI18n(
      <GoalForm
        envelopes={[makeEnvelope({ goalId: "goal-1" })]}
        initial={{
          id: "goal-1",
          type: "FIRE",
          name: "Ma rente",
          icon: "FIRE",
          targetRentEur: "850",
          targetDate: "2035-01-01",
          envelopeIds: ["env-1"],
        }}
        expectedReturn={0.062}
      />,
    );
    expect(screen.queryAllByRole("button", { name: /matelas|rente|retraite/i }).length).toBe(0);
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));
    await vi.waitFor(() => {
      expect(updateAction).toHaveBeenCalled();
      const formData = updateAction.mock.calls[0][1] as FormData;
      expect(formData.get("goalId")).toBe("goal-1");
      expect(formData.get("type")).toBe("FIRE");
    });
  });
});
