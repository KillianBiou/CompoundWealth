import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./toast";

function Harness() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("Position ajoutée", { details: ["CW8 · 12 parts"] })}>
        success
      </button>
      <button onClick={() => toast.error("Échec de l'actualisation")}>error</button>
      <button onClick={() => toast.info("Session expirée")}>info</button>
      <button onClick={() => toast.loading("Actualisation en cours…")}>loading</button>
    </div>
  );
}

describe("ToastProvider", () => {
  it("affiche un toast succès avec détails", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "success" }));
    expect(screen.getByText("Position ajoutée")).toBeInTheDocument();
    expect(screen.getByText("CW8 · 12 parts")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Position ajoutée");
  });

  it("affiche un toast erreur avec rôle alert", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "error" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Échec de l'actualisation");
  });

  it("empile plusieurs toasts", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "success" }));
    await user.click(screen.getByRole("button", { name: "info" }));
    expect(screen.getByText("Position ajoutée")).toBeInTheDocument();
    expect(screen.getByText("Session expirée")).toBeInTheDocument();
  });

  it("ferme un toast via le bouton de fermeture", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "loading" }));
    expect(screen.getByText("Actualisation en cours…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fermer la notification" }));
    expect(screen.queryByText("Actualisation en cours…")).not.toBeInTheDocument();
  });
});

function setup() {
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
  return { user: userEvent.setup() };
}
