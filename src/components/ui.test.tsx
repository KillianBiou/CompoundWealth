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

  it("expose une explication au survol de toute la tuile via hint", () => {
    render(<Kpi label="Score" value="6/10" sub="concentration pénalisée" hint="Détail du calcul" />);
    const tile = screen.getByText("Score").closest("div")!;
    fireEvent.mouseEnter(tile);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Détail du calcul");
    fireEvent.mouseLeave(tile);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
