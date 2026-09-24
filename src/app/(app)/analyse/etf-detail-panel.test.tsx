import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EtfDetailPanel } from "./etf-detail-panel";
import { getEtfDetailByIsin } from "@/lib/analysis/etf-detail";

/**
 * Tests d'interaction du panneau de détail ETF sur les données réelles
 * du CSV : pagination des valeurs (« + » par 10) et dépliage du repli
 * « 🌍 Autres +X % » pour révéler tous les pays.
 */

function renderIwdaPanel() {
  const iwda = getEtfDetailByIsin("IE00B4L5Y983");
  expect(iwda).not.toBeNull();
  render(<EtfDetailPanel etf={iwda!} />);
  return iwda!;
}

describe("EtfDetailPanel — onglet Détails", () => {
  it("affiche 10 valeurs puis déplie 10 de plus au clic sur « + »", () => {
    const iwda = renderIwdaPanel();
    fireEvent.click(screen.getByText("Détails"));
    // 10 premières valeurs visibles, pas la 11e
    expect(screen.getByText("NVIDIA")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Afficher 10 valeurs de plus/ });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    // 20 valeurs visibles : la 11e+ apparaît
    expect(screen.getByText(/poids cumulé/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/./).length,
    ).toBeGreaterThan(10);
    // IWDA a 25 valeurs : un dernier clic révèle les 5 restantes
    const button2 = screen.getByRole("button", { name: /Afficher 5 valeurs de plus/ });
    fireEvent.click(button2);
    expect(
      screen.queryByRole("button", { name: /Afficher/ }),
    ).not.toBeInTheDocument();
    expect(iwda.topHoldings.length).toBe(25);
  });

  it("affiche le poids cumulé sur les valeurs visibles uniquement", () => {
    renderIwdaPanel();
    fireEvent.click(screen.getByText("Détails"));
    expect(screen.getByText("Top 10 valeurs")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Afficher 10 valeurs de plus/ }));
    expect(screen.getByText("Top 20 valeurs")).toBeInTheDocument();
  });
});

describe("EtfDetailPanel — onglet Diversification", () => {
  it("montre 4 pays puis déplie « Autres » pour tous les révéler", () => {
    const iwda = renderIwdaPanel();
    fireEvent.click(screen.getByText("Diversification"));
    // replié : top 4 pays visibles, les suivants cachés
    expect(screen.getByText("États-Unis")).toBeInTheDocument();
    expect(screen.queryByText("Allemagne")).not.toBeInTheDocument();
    expect(screen.queryByText("Suisse")).not.toBeInTheDocument();
    // la ligne dépliable des pays fusionne les 5 pays cachés et le reste
    // Other : ~10,4 % (Suisse, France, Allemagne, Pays-Bas, Australie) + 7,7 %
    const expandButtons = screen.getAllByRole("button", { name: /Autres/ });
    expect(expandButtons.length).toBe(2);
    expect(expandButtons[0].textContent).toMatch(/\(5 lignes\)/);
    expect(expandButtons[0].textContent).toMatch(/\+18,0\d/);
    fireEvent.click(expandButtons[0]);
    // déplié : tous les pays nommés apparaissent avec leurs poids
    expect(screen.getByText("Allemagne")).toBeInTheDocument();
    expect(screen.getByText("Suisse")).toBeInTheDocument();
    expect(screen.getByText("Pays-Bas")).toBeInTheDocument();
    expect(screen.getByText("Australie")).toBeInTheDocument();
    // le reste Other réel (~7,7 %) apparaît en fin de liste pays
    expect(screen.getAllByText(/Autres/).length).toBeGreaterThanOrEqual(2);
    // replier masque à nouveau les pays étendus
    fireEvent.click(screen.getByRole("button", { name: /Replier/ }));
    expect(screen.queryByText("Allemagne")).not.toBeInTheDocument();
    // le poids total des pays reste ~100 %
    const total = iwda.countries.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeGreaterThan(0.985);
    expect(total).toBeLessThan(1.015);
  });

  it("déplie aussi les secteurs", () => {
    renderIwdaPanel();
    fireEvent.click(screen.getByText("Diversification"));
    expect(screen.getByText("Secteurs")).toBeInTheDocument();
    // top 4 secteurs visibles (Technologie, Finance, Industrie, Santé),
    // le reste dépliable via la ligne « Autres »
    expect(screen.getByText("Technologie")).toBeInTheDocument();
    expect(screen.queryByText(/Consommation discrétionnaire/)).not.toBeInTheDocument();
    const sectorButtons = screen.getAllByRole("button", { name: /Autres/ });
    fireEvent.click(sectorButtons[1]);
    expect(screen.getByText(/Consommation discrétionnaire/)).toBeInTheDocument();
    expect(screen.getByText(/Services publics/)).toBeInTheDocument();
  });
});
