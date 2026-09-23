# Fonctionnalité — Investissements réguliers (DCA)

**ID** : FEAT-DCA-001
**Statut** : Spécifié (non implémenté)
**Jalons associés** : DCA-1 à DCA-4 — voir [docs/PLAN.md](../PLAN.md)

---

## 1. Résumé

Permettre à un investisseur long terme de planifier ses **investissements réguliers** (DCA — *Dollar Cost Averaging*) **par enveloppe** :

1. Déclarer, pour chaque enveloppe, des versements programmés sur des titres donnés (ETF du catalogue en V1).
2. Visualiser **d'un coup d'œil** l'effort d'épargne engagé : total sur **1 mois, 3 mois et 1 an**, avec le nombre de versements.
3. Voir le **détail** de chaque DCA : titre, montant maximal, périodicité et **prochaine échéance**.
4. Créer les DCA de deux manières : un **plan périodique multi-titres** (une périodicité + une date, plusieurs lignes) ou un **DCA sur un titre précis**.

Le DCA est une donnée de **planification**. Il alimente les calculs futurs (exposition régionale, simulateur de patrimoine, projections d'intérêts composés) mais **ne déclenche aucune action concrète** dans l'application V1 : aucun achat automatique, aucune écriture dans le patrimoine lors de l'échéance. L'exécution (ou l'enregistrement manuel des versements réels) sera conçue plus tard.

Positionnement : l'utilisateur sait **combien** il s'engage à investir, **sur quoi**, et **quand** — l'application fait les calculs, il garde la main.

---

## 2. Récits utilisateurs

### EPIC-DCA — Investissements réguliers

**US-D1 — Vue d'ensemble de mon effort d'épargne**

> En tant qu'investisseur, je veux voir d'un coup d'œil mes investissements réguliers, pour savoir combien je dépense et en combien de versements sur plusieurs laps de temps.

- Critères d'acceptation :
  - [ ] Une section dédiée **« Investissements réguliers »** sur la page de l'enveloppe, à côté des positions.
  - [ ] Trois KPI calculés par l'application : **1 mois**, **3 mois**, **1 an** (fenêtres glissantes à partir d'aujourd'hui).
  - [ ] Chaque KPI affiche : **montant maximal** engagé, **montant estimé réellement dépensé** (ajusté des parts entières pour un PEA), et **nombre de versements** sur la période.
  - [ ] Les DCA en pause sont exclus du calcul.
  - [ ] État vide : « Aucun investissement régulier. Planifiez votre premier DCA. » avec bouton d'appel à l'action.

**US-D2 — Détail de mes investissements réguliers**

> En tant qu'investisseur, je veux voir le détail de mes DCA — titre, montant maximal, périodicité et prochaine date d'échéance — pour organiser ma trésorerie.

- Critères d'acceptation :
  - [ ] Liste (table) des lignes de DCA de l'enveloppe : **titre** (ticker + nom complet), **montant max** en €, **périodicité**, **prochaine échéance** (date calculée).
  - [ ] Pour un PEA : affichage du **montant estimé** (parts entières) sous le montant max, avec le reliquat non investi.
  - [ ] Périodicités supportées : **2 semaines, 1 mois, 2 mois, 3 mois**.
  - [ ] Une ligne en pause est grisée, avec sa prochaine échéance masquée.
  - [ ] Actions par ligne : **mettre en pause / reprendre**, **supprimer**.

**US-D3 — Créer un plan DCA périodique multi-titres**

> En tant qu'investisseur, je veux créer un DCA périodique (ex. mensuel) avec une date de départ, puis saisir dans la même modale tous les titres sur lesquels je vais investir avec leur montant maximal — pour tout planifier en une fois.

- Critères d'acceptation :
  - [ ] Mode **« Plan périodique »** : choix de la **périodicité** et de la **date de départ** (ex. 2 octobre), puis saisie d'une **liste de lignes** : titre (recherche catalogue) + montant maximal en €.
  - [ ] Sous la liste saisie, une **zone de suggestions grisées** propose les ETF déjà détenus dans l'enveloppe (basés sur les positions existantes) ; un clic ajoute la suggestion à la liste, où je saisis alors son montant.
  - [ ] À la confirmation, un **DCA est créé pour chaque titre** avec les mêmes paramètres (date de départ, périodicité) et son montant maximal propre.
  - [ ] Un titre ne peut pas apparaître deux fois dans la liste ; le montant max est obligatoire et strictement positif.

**US-D4 — Créer un DCA sur un titre précis**

> En tant qu'investisseur, je veux créer un DCA sur un ETF précis : je saisis le titre (avec suggestions), la périodicité et la date — pour l'ajouter à la liste avec les bons paramètres.

- Critères d'acceptation :
  - [ ] Mode **« Titre unique »** : recherche du titre (mêmes suggestions que pour les positions), périodicité, date de départ, montant maximal.
  - [ ] À la confirmation, la ligne apparaît immédiatement dans la liste avec sa prochaine échéance calculée.
  - [ ] Si un DCA actif existe déjà pour ce titre dans l'enveloppe, l'application propose de le remplacer ou d'annuler (pas de doublon silencieux).

**US-D5 — Suggestions basées sur mes positions**

> En tant qu'investisseur, je veux que l'application me propose, en grisé, les ETF que je détiens déjà dans l'enveloppe, pour créer mes DCA plus vite.

- Critères d'acceptation :
  - [ ] Les suggestions = ETF du catalogue correspondant aux positions de l'enveloppe (rapprochement par ISIN, puis ticker).
  - [ ] Rendues en **grisé** (visuellement secondaires), placées **sous la liste réelle** dans la modale de création.
  - [ ] Un clic les fait passer dans la liste active, avec le champ montant prêt à saisir.
  - [ ] Aucune suggestion si l'enveloppe n'a pas de positions correspondantes ; aucune suggestion pour un titre déjà dans la liste.

**US-D6 — Gérer mes DCA**

> En tant qu'investisseur, je veux suspendre, reprendre ou supprimer un DCA, pour ajuster mon plan sans perdre l'historique de planification.

- Critères d'acceptation :
  - [ ] Pause / reprise immédiate, la ligne reste affichée (grisée) et les KPI se recalculent.
  - [ ] Suppression avec confirmation (même pattern que la suppression de position).
  - [ ] La suppression de l'enveloppe supprime en cascade ses DCA.

**Non-objectif explicite (V1)** : aucun déclenchement automatique — pas d'ajout au patrimoine, pas de notification, pas de cron. Voir §7 « Suite ».

---

## 3. Modèle de données

Deux modèles : un **plan** (paramètres partagés : périodicité + date de départ) et ses **lignes** (un titre + un montant). Le mode « plan périodique multi-titres » crée un plan à N lignes ; le mode « titre unique » crée un plan à 1 ligne. Ce découpage rend les deux saisies identiques côté serveur et facilitera les calculs d'exposition/simulation (regroupement par périodicité).

```prisma
enum DcaFrequency {
  BIWEEKLY   // 2 semaines (14 jours)
  MONTHLY    // 1 mois
  BIMONTHLY  // 2 mois
  QUARTERLY  // 3 mois
}

model DcaPlan {
  id         String        @id @default(cuid())
  envelopeId String
  envelope   Envelope      @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  frequency  DcaFrequency
  startDate  DateTime      // premier versement visé (ex. 2 octobre)
  active     Boolean       @default(true)
  createdAt  DateTime      @default(now())
  lines      DcaLine[]

  @@index([envelopeId])
}

model DcaLine {
  id             String   @id @default(cuid())
  planId         String
  plan           DcaPlan  @relation(fields: [planId], references: [id], onDelete: Cascade)
  isin           String   // ETF du catalogue (clé stable)
  name           String   // dénormalisé pour l'affichage
  maxAmountCents Int      // budget maximal en centimes
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())

  @@index([planId])
}
```

Choix :

- `startDate` sur le plan, pas sur la ligne : la date de départ saisie dans la modale s'applique à tous les titres du plan (US-D3).
- `active` sur la ligne **et** sur le plan : la pause peut concerner un titre (ligne) ou tout le plan (bouton global à venir) ; les KPI n'agrègent que les lignes actives d'un plan actif.
- `nextRunAt` **n'est pas stocké** : la prochaine échéance est **calculée** à la volée depuis `startDate` + `frequency` (§4.2). Aucun cron, aucun champ à maintenir — source de vérité unique.
- `isin` + `name` dénormalisés (même convention que le catalogue ETF, `src/lib/etf-catalog.ts`) : pas de relation forte vers `Position` (un DCA peut viser un ETF pas encore détenu).

---

## 4. Règles de calcul (domaine pur, `src/lib/dca.ts`)

Toute la logique vit dans `src/lib/dca.ts`, **sans dépendance à React**, testée unitairement — même architecture que `src/lib/taxes` et `src/lib/portfolio/series`.

### 4.1 Périodicités

| Fréquence | Écart | Ajout |
|---|---|---|
| `BIWEEKLY` | 14 jours | `+ 14 jours` |
| `MONTHLY` | 1 mois calendaire | `+ 1 mois` |
| `BIMONTHLY` | 2 mois calendaires | `+ 2 mois` |
| `QUARTERLY` | 3 mois calendaires | `+ 3 mois` |

- L'ajout de mois est **calendaire** et préserve le jour du mois : départ le 2 octobre, mensuel → 2 nov., 2 déc., 2 janv. …
- Recalage fin de mois : le 31 janvier + 1 mois → 28 (ou 29) février, puis reprise au jour d'origine (le 31) dès que possible.
- Les échéances tombent le jour exact ; l'application ne gère pas de jours ouvrés en V1 (l'utilisateur arbitre via la date de départ).

### 4.2 Prochaine échéance — `nextOccurrence(plan, from = today)`

Avance `startDate` par pas de `frequency` jusqu'à obtenir la première occurrence **≥ `from`** (minuit, date locale de l'utilisateur).
Cas limites :

- `startDate` aujourd'hui → aujourd'hui est l'échéance.
- `startDate` dans le passé (ex. créé avec des mois de retard) → la prochaine échéance **future** est calculée, les occurrences passées sont ignorées (le DCA V1 ne rejoue pas l'historique).

### 4.3 Occurrences sur une fenêtre — `occurrencesIn(plan, windowStart, windowEnd)`

Nombre d'échéances du plan dans `[windowStart, windowEnd]` (inclus), toujours **≥ 0**. Fenêtres glissantes calculées depuis aujourd'hui : `+1 mois`, `+3 mois`, `+1 an` (ajouts calendaires).

### 4.4 Parts entières (PEA) — `estimateSpendCents(maxAmountCents, priceCents, envelopeType)`

| Enveloppe | Règle | Exemple (budget 1 500 €, part à 120 €) |
|---|---|---|
| **PEA** | `qty = floor(max / prix)` ; `estimé = qty × prix` ; reliquat = `max − estimé` | 12 parts → **1 440 €** dépensés, 60 € non investis |
| **CTO** | parts fractionnaires autorisées → `estimé = max` | **1 500 €** |

- Le **prix de référence** est le dernier cours connu du titre dans l'enveloppe : dernière valorisation de position / quantité, sinon `unitPriceCents`, sinon le prix du fichier d'import.
- Prix inconnu → l'estimation affiche « — » et les KPI comptent le **montant max** (hypothèse haute, jamais basse).
- `maxAmountCents` reste la donnée saisie ; l'estimation est **dérivée, jamais stockée** (le prix bouge, le budget reste).

### 4.5 Agrégats des KPI — `summarizeDca(lines, plans, envelope, today)`

Pour chaque fenêtre (1 mois, 3 mois, 1 an) :

```
versements = Σ occurrences(plan, fenêtre)         [lignes actives de plans actifs]
totalMax   = Σ versements_line × maxAmountCents
totalEstimé = Σ versements_line × estimateSpendCents(...)
```

L'affiche : « **1 450 € estimés** sur 1 250 € max · 2 versements » — le couple max/estimé rend visible le rognage des parts entières.

### 4.6 Validation — `createDcaSchema` (Zod, `src/lib/validations.ts`)

| Champ | Règle | Message |
|---|---|---|
| `mode` | `plan` \| `single` | — |
| `frequency` | enum des 4 valeurs | « Périodicité invalide » |
| `startDate` | date valide, obligatoire ; **future autorisée**, passée autorisée | « Date de départ invalide » |
| `lines[]` | 1 à 20 lignes | « Ajoutez au moins un titre » |
| `lines[].isin` | doit exister dans le catalogue ETF | « ETF inconnu » |
| `lines[].maxAmountEur` | > 0, ≤ 1 000 000 €, 2 décimales | « Le montant doit être positif » |
| `lines[].isin` | unique dans la soumission | « Ce titre est déjà dans la liste » |

Montants saisis en EUR, stockés en centimes (règle R1 du MVP, `eurosToCents`).

---

## 5. Écrans, menus et design

### 5.1 Emplacement

La page enveloppe (`src/app/(app)/envelopes/[id]/page.tsx`) gagne une **carte « Investissements réguliers »** placée directement **sous la carte Positions** (même largeur, même rythme vertical). Sur mobile, elle suit naturellement les positions. Un compteur discret dans le titre de la carte (« 4 ») indique le nombre de lignes actives, comme le compteur de positions.

### 5.2 Anatomie de la carte

```
┌────────────────────────────────────────────────────────────────┐
│ Investissements réguliers                              [4]     │
│                                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ 1 mois       │ │ 3 mois       │ │ 1 an         │             │
│ │ 1 440 € est. │ │ 4 320 € est. │ │ 17 280 € est.│             │
│ │ 1 450 € max  │ │ 4 350 € max  │ │ 17 400 € max │             │
│ │ 2 versements │ │ 6 versements │ │ 24 versements│             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                │
│ ┌─ table ────────────────────────────────────────────────────┐ │
│ │ Titre          │ Montant max    │ Périodicité │ Prochaine  │ │
│ │                │ (estimé PEA)   │            │ échéance   │ │
│ ├────────────────┼────────────────┼────────────┼────────────┤ │
│ │ CW8 MSCI World  │ 1 500,00 €     │ 1 mois     │ 2 oct.     │ │
│ │                │ ≈ 1 440 € (12p) │            │            │ │
│ │ PAEON Nasdaq   │ 500,00 €       │ 2 semaines │ 3 oct.     │ │
│ │                │ ≈ 500 €        │            │            │ │
│ │ ESEB Stoxx Eur │ 300,00 €       │ 3 mois     │ en pause   │ │
│ └────────────────┴────────────────┴────────────┴────────────┘ │
│                                                                │
│            [ + Planifier un investissement régulier ]          │
└────────────────────────────────────────────────────────────────┘
```

- **KPI (US-D1)** : trois mini-cartes (grille 3 colonnes desktop, empilées mobile) ; montant estimé en **blanc pur tabular-nums** (chiffre important = taille, pas de couleur — charte §1.3), montant max et nombre de versements en gris.
- **Table (US-D2)** : même structure que la table Positions (en-têtes uppercase, `text-text-muted`, lignes séparées par `border-cw/60`). Périodicité en `Badge tone="neutral"` (« 1 mois »), prochaine échéance avec badge relatif (« dans 12 jours ») sous la date. Ligne en pause : opacité réduite (`text-text-muted`) et badge « En pause ».
- **Estimation PEA (US-D2)** : sous le montant max, en `text-xs text-text-muted` : « ≈ 1 440 € · 12 parts · 60 € non investis ». C'est l'information clé qui matérialise la règle des parts entières.
- **Bouton d'appel à l'action** : même pattern que « + Ajouter une position » — bouton pleine largeur discret en bas de carte, qui ouvre la modale de création.
- **État vide** : message + CTA, aucune section fantôme.

### 5.3 Modale de création (US-D3 / US-D4)

Nouveau composant `Modal` dans `src/components/ui.tsx` (aucun composant de dialogue n'existe aujourd'hui) : overlay `bg-black/60`, panneau `bg-bg-elevated` arrondi, focus trapé, fermeture par Échap/backdrop, `role="dialog" aria-modal="true"`.

La modale s'ouvre sur un **sélecteur de mode** (segmenté, deux onglets) :

**Mode 1 — « Plan périodique »** :

```
┌─ Planifier un investissement régulier ──────────── [X] ┐
│  [ Plan périodique ] [ Titre unique ]                  │
│                                                        │
│  Périodicité      [ 1 mois            ▾ ]              │
│  Date de départ   [ 02/10/2026 ]                       │
│                                                        │
│  Titres du plan                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │ CW8  MSCI World                 [ 1 500,00 € ] ✕│   │
│  │ PAEON Nasdaq-100                [   500,00 € ] ✕│   │
│  │ [+ Ajouter un titre… (recherche catalogue)]     │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  Suggestions — ETF de votre enveloppe                 │
│  ┌─ grisées ──────────────────────────────────────┐   │
│  │ ESEB · Stoxx Europe 600            [ + ]       │   │
│  │ CW8 · MSCI World (déjà dans la liste — masqué)  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│            [ Confirmer ]  [ Annuler ]                  │
└────────────────────────────────────────────────────────┘
```

1. Périodicité + date de départ saisis **une fois** en haut.
2. Ajout de lignes par **recherche catalogue** (réutilise `searchEtfCatalog`, même liste déroulante que l'ajout de position) + champ montant par ligne.
3. **Suggestions grisées** (US-D5) : rangée de puces désaturées sous la liste, alimentée par les positions de l'enveloppe. Un clic les fait **monter dans la liste active** avec le champ montant focus. Une puce déjà sélectionnée disparaît.
4. Confirmation → `createDcaAction` crée **un plan + une ligne par titre**, puis `router.refresh()` : la table et les KPI reflètent immédiatement les nouvelles échéances.

**Mode 2 — « Titre unique »** :

```
│  Titre            [ CW8 / recherche catalogue… ]      │
│  Montant max      [ 1 500,00 € ]                      │
│  Périodicité      [ 1 mois ▾ ]                         │
│  Date de départ   [ 02/10/2026 ]                       │
│  Suggestions grisées (idem, cliquables)                │
```

Même suggestions grisées, même action serveur (`mode: "single"` → plan à 1 ligne).

### 5.4 Réutilisation de l'existant

| Besoin | Source |
|---|---|
| Recherche ETF + liste déroulante | `AddPositionRow` (`add-position-row.tsx`) — extraire si besoin la recherche en composant partagé |
| Catalogue & recherche | `searchEtfCatalog` / `getEtfByIsin` (`src/lib/etf-catalog.ts`) |
| Montants | `eurosToCents` / `formatEurCents` (`src/lib/money.ts`) |
| Primitives UI | `Card`, `Badge`, `Button`, `Input`, `Select`, `Kpi` (`src/components/ui.tsx`) |
| Actions serveur + `ActionState` | `src/server/actions.ts` (pattern `useActionState`) |
| Vérification de propriété | même garde que les actions existantes (`envelope.userId` = utilisateur de session) |

Charte graphique : accent corail réservé aux actions primaires (« Confirmer ») ; aucune couleur pour les montants, hiérarchie par la taille ; suggestions grisées = `text-text-muted` + fond `bg-bg-subtle`, jamais l'accent.

---

## 6. Architecture technique & fichiers prévus

| Couche | Fichier | Contenu |
|---|---|---|
| Schéma | `prisma/schema.prisma` | `DcaFrequency`, `DcaPlan`, `DcaLine` + relation `dcaPlans` sur `Envelope` ; `pnpm prisma db push` |
| Domaine | `src/lib/dca.ts` | `addMonths`, `nextOccurrence`, `occurrencesIn`, `estimateSpendCents`, `summarizeDca` (pur, testable) |
| Tests domaine | `src/lib/dca.test.ts` | périodicités, fin de mois, échéances passées, fenêtres 1/3/12 mois, parts entières (cas 1 500 €), prix inconnu, CTO |
| Validation | `src/lib/validations.ts` (+ tests) | `createDcaSchema` |
| Serveur | `src/server/actions.ts` | `createDcaAction` (plan + N lignes, transaction), `toggleDcaLineAction` (pause/reprise), `deleteDcaLineAction`, `deleteDcaPlanAction` |
| Requêtes | `src/server/queries.ts` | `getEnvelope` inclut `dcaPlans.lines` |
| UI page | `src/app/(app)/envelopes/[id]/page.tsx` | montage de la carte DCA, calcul serveur des agrégats |
| UI section | `src/app/(app)/envelopes/[id]/dca-section.tsx` | carte : KPI 1/3/12 mois + table + état vide |
| UI table | `src/app/(app)/envelopes/[id]/dca-table.tsx` | lignes, pause, suppression |
| UI modale | `src/app/(app)/envelopes/[id]/dca-create-dialog.tsx` | modes « plan » / « titre unique », lignes dynamiques, suggestions |
| Primitives | `src/components/ui.tsx` | `Modal` accessible (focus trap, Échap, overlay) |

Les agrégats (KPI) sont calculés **côté serveur** dans la page (pas de fetch client), l'application reste SSR comme le reste.

---

## 7. Jalons & sortie

| # | Jalon | Contenu | Critère de sortie |
|---|---|---|---|
| DCA-1 | Modèle + domaine | Schéma Prisma, `src/lib/dca.ts` + tests, validation Zod | `pnpm test` verts sur le domaine (périodicités, parts entières, fenêtres) |
| DCA-2 | Section & KPI | Carte DCA sur la page enveloppe, KPI 1/3/12 mois, table détaillée | Affichage correct avec données réelles et état vide |
| DCA-3 | Création | Modale 2 modes, recherche catalogue, suggestions grisées, `createDcaAction` | E2E manuel des US-D3/D4/D5 ; tests de validation |
| DCA-4 | Gestion | Pause/reprise, suppression, `router.refresh()` | KPI recalculés ; lint + typecheck + build verts |

### Hors périmètre V1 (inventaire, pas de décision)

- **Exécution automatique** : pas d'écriture dans le patrimoine à l'échéance, pas de notification, pas de cron. Le déclenchement (saisie manuelle « ce versement a eu lieu » → réutilisation de `PositionInvestment`) sera conçu plus tard.
- Périodicités libres (ex. 6 mois, annuel), jours ouvrés, prélèvement des dividendes, DCA multi-enveloppes synchronisés.
- **Consommateurs futurs de la donnée** (prévus par ce modèle) : exposition régionale pondérée par les flux DCA, simulateur de patrimoine (projections de versements), objectifs d'épargne.

---

## 8. Références

- [docs/PLAN.md](../PLAN.md) — vision, jalons (le DCA figure dans « Idées pour la suite » du MVP, désormais spécifié)
- [docs/features/MVP.md](MVP.md) — épics existants, règles R1 (centimes) et R4 (valeur actuelle)
- [docs/design/UI_CHARTER.md](../design/UI_CHARTER.md) — palette, typographie, primitives
- [docs/design/USAGE_GUIDE.md](../design/USAGE_GUIDE.md) — parcours enveloppes (la section DCA s'y ajoutera à l'implémentation)
