# Guide produit — Enveloppes PEA & CTO

**Statut** : Référence produit
**Usage** : base des règles métier implémentées dans `src/lib/taxes` et des libellés UI (badges fiscaux)

---

## 1. PEA (Plan d'Épargne en Actions)

### Conditions

- **Plafond de versements** : **150 000 €** (versements cumulés, hors gains — la valorisation peut dépasser ce plafond).
- **Âge/éligibilité** : toute personne fiscalement majeure ; PEA Jeune (18–25 ans rattachés au foyer parental) plafonné à 20 000 €.
- **Univers éligible** : actions et ETF dont le siège est dans l'UE/EEE (ex. ETF actions européens « PEA » type CW8, ETF Amundi/Lyxor éligibles). Les ETF actions mondiaux classiques (ex. MSCI World irlandais/UCITS) ne sont **pas** éligibles.
- **Retrait avant 5 ans** : le retrait (partiel ou total) entraîne la **clôture du plan**, sauf cas légaux (licenciement, invalidité, retraite, création d'entreprise).
- **Retrait après 5 ans** (antériorité fiscale acquise) : le plan reste ouvert, les versements restent possibles jusqu'au plafond (loi Pacte 2019).

### Fiscalité (barème en vigueur pour les gains, sources 2026)

| Situation | Impôt sur le revenu | Prélèvements sociaux | Total |
|---|---|---|---|
| Retrait/gains **avant 5 ans** | 12,8 % | 18,6 % | **31,4 %** |
| Retrait/gains **après 5 ans** | **0 % (exonération)** | 18,6 % | **18,6 %** |

- Les prélèvements sociaux (CSG 10,6 %, CRDS, prélèvements de solidarité) sont dus dès le 1er euro de gain retiré, même après 5 ans.
- Les dividendes perçus **dans** le PEA avant 5 ans sont taxés en flat tax (31,4 %) ; réinvestis dans le plan avant 5 ans, ils bénéficient du régime de plan.

### Implémentation dans CompoundWealth

- Champs enveloppe PEA : nom, courtier, **date d'ouverture** (utilisée pour calculer l'antériorité fiscale), versements cumulés (issus des positions).
- Indicateurs affichés : « Versements : X € / 150 000 € », « Antériorité : restent X années » ou « Antériorité acquise ✓ ».
- Badge : « Exonération IR après 5 ans » / « Flat tax avant 5 ans ».

## 2. CTO (Compte-Titres Ordinaire)

### Conditions

- **Aucun plafond de versement** ; autant de CTO que voulu, dans autant d'établissements.
- **Univers illimité** : actions mondiales, obligations, ETF non éligibles PEA, fonds, produits dérivés...
- **Fiscalité par défaut (PFU / flat tax, en vigueur depuis le 1er janvier 2026)** :

| Revenu | Taux |
|---|---|
| Plus-values de cession | **31,4 %** (12,8 % IR + 18,6 % PS) |
| Dividendes | **31,4 %** |
| Intérêts (obligations) | **31,4 %** |

- **Option barème progressif** : possible à la déclaration annuelle, pour l'ensemble des revenus du capital ; intéressante surtout pour les foyers faiblement imposés (TMI ≤ 11–14 %), avec abattement de 40 % sur dividendes et CSG déductible (6,8 %).
- **Moins-values** : imputables sur les plus-values de la même année, reportables 10 ans.
- **Pas d'avantage de durée** : contrairement au PEA, la fiscalité ne s'améliore pas avec le temps.

### Implémentation dans CompoundWealth

- Champs enveloppe CTO : nom, courtier, date d'ouverture (informatif).
- Badge : « Flat tax 31,4 % ».
- Le CTO est présenté comme l'enveloppe de souplesse ; le PEA comme celle de l'optimisation long terme.

## 3. Aide au choix (libellé UI)

| Besoin | Enveloppe recommandée |
|---|---|
| Investir long terme dans des ETF/stocks éligibles UE | **PEA** |
| Diversifier au-delà (actions US, obligations, ETF mondiaux) | **CTO** |
| Maximiser l'avantage fiscal des 5 ans | **PEA** (ne pas retirer avant 5 ans) |

## 4. Sources et fraîcheur des taux

- Taux de référence de cette page : **LFSS 2026** (prélèvements sociaux portés de 17,2 % à 18,6 %, flat tax globale de 30 % à **31,4 %**).
- Les taux évoluent chaque année : ils vivent dans `src/lib/taxes/constants.ts` avec l'année de validité, et ce document doit être mis à jour en même temps.
- Sources publiques : Service-Public.fr (fiscalité PEA), impots.gouv.fr (PFU/CTO), fiches des établissements financiers.

> ⚠️ CompoundWealth est un outil de suivi, pas un conseil fiscal. Les valeurs affichées sont indicatives et ne remplacent pas une consultation personnalisée.
