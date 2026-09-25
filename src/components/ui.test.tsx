import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, Button, Kpi } from "./ui";

describe("Button", () => {
  it("affiche le label du bouton primaire", () => {
    render(<Button type="submit">Créer</Button>);
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("affiche le contenu du badge", () => {
    render(<Badge tone="positive">PEA</Badge>);
    expect(screen.getByText("PEA")).toBeInTheDocument();
  });
});

describe("Kpi", () => {
  it("affiche label, valeur et variation colorée", () => {
    render(
      <Kpi label="Gain / perte" value="+85,00 €" sub="+85,00 € (+17,0 %)" subTone="positive" />,
    );
    expect(screen.getByText("Gain / perte")).toBeInTheDocument();
    const sub = screen.getByText("+85,00 € (+17,0 %)");
    expect(sub).toHaveClass("text-positive");
  });

  it("expose la décomposition du score au survol de l'icône", () => {
    render(
      <Kpi
        label="Score"
        value="7/10"
        scoreTone="positive"
        scoreTotal="7/10"
        scoreLines={[
          { label: "Zone dominante ≤ 25 %", delta: "+3/4", tone: "warning" },
          { label: "Zones couvertes", delta: "+2/3", tone: "warning" },
          { label: "Équilibre top 3 zones", delta: "+2/3", tone: "warning" },
        ]}
      />,
    );
    const value = screen.getByText("7/10");
    expect(value).toHaveClass("text-positive");
    const icon = screen.getByText("Score").querySelector("svg")!;
    fireEvent.mouseEnter(icon);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Zone dominante ≤ 25 % +3/4");
    expect(tooltip).toHaveTextContent("Total 7/10");
    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
