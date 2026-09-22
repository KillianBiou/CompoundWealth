import { render, screen } from "@testing-library/react";
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
});
