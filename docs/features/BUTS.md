# Fonctionnalité Buts (Objectifs) — Spécification fonctionnelle & artéfact de conception

**Statut** : Spécification prête pour implémentation
**Nouveau menu** : `Dashboard · Enveloppes · Analyse · Buts · Réglages` (entrée « Buts » / `Goals`, route `/buts`)
**Dernière mise à jour** : 2026-09-25

---

## 1. Vision

CompoundWealth suit aujourd'hui **où en est** le patrimoine (enveloppes, performance). Les Buts ajoutent **où l'on va** : l'utilisateur définit des projets financiers à long terme (matelas de sécurité, rente à X ans, apport immobilier, retraite…), y **lie des enveloppes**, et l'application calcule automatiquement la progression réelle du but à partir du patrimoine suivi — pas d'une estimation théorique.

La philosophie de l'app reste l'**investissement long terme et les intérêts composés** : chaque but expose la confrontation entre le but (cible) et l'actuel (valeur réelle des enveloppes liées), avec l'évolution mois par mois et les **leviers d'ajustement** (rendement requis, épargne mensuelle nécessaire, date cible).

> Contrairement à competition (création/édition réservée au mobile, web en lecture seule), CompoundWealth est **web-first** : création, édition et suivi se font intégralement sur le web.

### 1.1 Benchmark — la fonctionnalité Objectifs de competition

Références : [Créer et suivre mes objectifs](https://help.competition.com/fr/articles/15301061-creer-et-suivre-mes-objectifs), [Qu'est-ce que le matelas de sécurité ?](https://help.competition.com/fr/articles/15483906-qu-est-ce-que-le-matelas-de-securite), [Objectifs : donnez un cap à votre patrimoine](https://competition.com/fr/actualites-produit/objectifs).

Points clés observés chez competition, à reprendre :

1. **Types d'objectifs prédéfinis** (modèles pré-remplis) : Matelas de sécurité, Apport immobilier, Indépendance financière, Retraite, Études des enfants, Voiture, Mariage, Voyage, Épargne de précaution — plus un objectif 100 % personnalisé (nom, icône, montant, horizon).
2. **Paramètres d'un objectif** : montant cible (obligatoire, en devise courante), date cible (1 mois → 50 ans), contribution facultative (montant + fréquence : hebdo/mensuel/trimestriel/annuel), **actifs liés** (obligatoire).
3. **Rendement annuel requis** calculé automatiquement : le rendement qui permet d'atteindre la cible dans le délai, compte tenu du capital actuel et des contributions. Pré-récapitulatif avant création : progression estimée, rendement requis, statut.
4. **Statuts dynamiques** (competition en affiche 4–7 selon les vues) :
   - **Sur la bonne voie** — le rendement requis est atteignable avec la composition du portefeuille ;
   - **Compromis** — le rendement requis dépasse ce que le portefeuille peut raisonnablement viser → leviers d'ajustement proposés ;
   - **Excédentaire / Dépassé** — la trajectoire dépasse la cible, une partie de l'épargne peut être réallouée ;
   - **Atteint / Surfinancé** — le montant actuel atteint ou dépasse la cible ;
   - **Sous-financé** — la progression est en dessous de la trajectoire nécessaire ;
   - **En retard** — date cible dépassée sans que le but soit atteint.
5. **Matelas de sécurité = logique distincte** : pas de taux ni d'horizon, il mesure **combien de mois de dépenses** les liquidités couvrent (« 4/6 mois »). Cible = dépenses mensuelles × durée de couverture (0–12 mois, 6 par défaut ; alerte sous 3 mois). **Seuls des actifs sans risque et disponibles immédiatement** peuvent y être liés.
6. **Anti double comptage** : si un actif est lié à plusieurs objectifs, sa valeur est répartie entre eux — un même euro n'est jamais compté deux fois. Le matelas est servi en premier, puis les objectifs par date cible la plus proche.
7. **Leviers d'ajustement** (objectif compromis/dépassé/en retard) : augmenter/réduire la contribution, avancer/reporter la date, augmenter/réduire la cible, lier plus d'actifs.
8. **Vue détaillée** : graphique de projection (contributions cumulées + courbe de rendement requis), message d'analyse adapté au statut.
9. **Signal « matelas trop élevé »** : si les liquidités dépassent nettement la cible, signalement qu'un surplus pourrait être réalloué (perte de pouvoir d'achat).
10. **Avertissement réglementaire** : les projections sont indicatives, pas une prévision — affiché discrètement dans la vue détaillée.

### 1.2 Ce que CompoundWealth fait de différent

- **Calculs transparents et honnêtes**, fidèles à la maison : rendement attendu réel issu du module Analyse (historique si ≥ 6 mois de données, sinon moyenne long terme), **rendement requis plafonné à l'affichage**, inflation optionnelle en euros constants (déjà le standard du simulateur).
- **But « rente »** (demande utilisateur, inexistant chez competition en tant que type dédié) : générer X €/mois à Y ans — conversion capital ↔ rente via taux de retrait (règle 4 % / 3,5 % paramétrable), cohérente avec le simulateur Analyse existant.
- **Anti double comptage simplifié** : une enveloppe appartient à **au plus un but actif** (contrainte en base) — pas de répartition proportionnelle, le même euro ne peut jamais compter deux fois. Voir §4.2 (justification).
- **Catégories de buts** : Épargne de précaution · Indépendance & retraite · Projets de vie · Personnalisé — chaque catégorie a son calcul de progression propre (voir §4.3).

---

## 2. Types de buts et catégories

| Catégorie | Type | Cible définie par | Progression affichée | Exemple |
|---|---|---|---|---|
| Épargne de précaution | `SAFETY_NET` (matelas de sécurité) | dépenses mensuelles × nombre de mois (3–12, 6 par défaut) | **X mois / Y mois** de couverture (valeur liquidités ÷ dépenses mensuelles) | « 4/6 mois » |
| Indépendance & retraite | `FIRE` (rente / indépendance) | rente mensuelle cible X € + âge/année cible Y | **rente actuelle X € / Y €** (patrimoine × taux de retrait ÷ 12) + capital correspondant | « 212 €/mois de rente actuelle sur 850 € visés » |
| Indépendance & retraite | `RETIREMENT` (retraite) | capital cible à la date/âge cible | capital actuel / cible (+ rente équivalente) | « 63 400 € / 500 000 € » |
| Projets de vie | `DOWN_PAYMENT` (apport immobilier) | montant d'apport + date cible | apport actuel / cible | « 18 200 € / 60 000 € d'apport » |
| Projets de vie | `CUSTOM_LIFEVENT` (voiture, mariage, voyage, études…) | montant + date | valeur actuelle / cible | « 4 300 € / 25 000 € » |
| Personnalisé | `CUSTOM` | montant + date optionnelle | valeur actuelle / cible | — |

**Modèles pré-remplis** à la création (nom + type + préfills) : Matelas de sécurité, Générer une rente, Indépendance financière, Préparer ma retraite, Apport immobilier, Voiture, Mariage, Voyage, Études des enfants, Objectif personnalisé.

### 2.1 Particularité du matelas (`SAFETY_NET`)

- Cible = `dépensesMensuellesCents × duréeMois`. Dépenses mensuelles : préfill via `estimateMonthlyExpenses(salaryCents, averageMonthlySavingsCents)` (`src/lib/analysis/scanners.ts:793`), ajustable librement dans le formulaire du but.
- **Un seul matelas actif par utilisateur** (règle competition reprise).
- **Seules les enveloppes sans risque de marché peuvent être liées** : `LIVRET_A` et `PRIV` (cash). Un `PEA`/`CTO` lié au matelas est refusé à la validation — même règle que competition (« disponible immédiatement et sans risque »).
- Progression en mois de couverture : `moisCouverts = valeurLiée / dépensesMensuelles` (affiché « 4,2/6 mois », jamais arrondi au-dessus).
- Badge **alerte** si couverture < 3 mois (référence competition/Banque de France) ; badge **informatif « trop élevé »** si couverture > durée cible + 50 % (réallocable vers d'autres buts) ; on réutilise le calcul de perte de pouvoir d'achat `projectOneYear` (`src/lib/livret.ts`) pour étayer le message.

### 2.2 Particularité de la rente (`FIRE`)

- Cible définie en **rente mensuelle nette** X € et en **âge ou année cible** Y. Capital cible dérivé : `cibleCapital = renteMensuelle × 12 / tauxRetrait` (défaut 4 %, modifiable 2–10 %).
- Progression : `renteActuelle = valeurLiée × tauxRetrait / 12` — affichée en évidence « Rente actuelle : 212 €/mois → Cible : 850 €/mois », avec l'équivalent capital en sous-texte (`tabular-nums`).
- Le taux de retrait et le rendement attendu sont les mêmes que ceux du simulateur Analyse — **une seule source de vérité** (voir §5.3).

---

## 3. Parcours utilisateur & écrans

### 3.1 Liste des buts (`/buts`)

- Regroupés **par catégorie** (Épargne de précaution, Indépendance & retraite, Projets de vie, Personnalisé), chaque groupe avec son titre et son icône `lucide-react`.
- **Carte de résumé par but** (clic → détail) :
  - nom + icône, badge de **statut** (semantics existantes : `positive` = atteint/bonne voie, `warning` = sous-financé/compromis, `negative` = en retard, `neutral` = —, `accent` = excédentaire) ;
  - **le but et l'actuel en haut, en évidence** : `font-heading text-3xl tabular-nums` pour l'actuel, cible en `text-text-secondary`, flèche `→` entre les deux (« 18 200 € → 60 000 € », « 4,2 → 6 mois », « 212 €/mois → 850 €/mois ») ;
  - barre de progression (pourcentage, couleur `--accent-500` neutre — pas vert/rouge, la progression n'est ni un gain ni une perte ; seuil 100 % plafonné) ;
  - ligne d'évolution : « X mois / Y mois d'économie », « rente actuelle X € / Y € », « apport actuel X € / cible Y € » selon le type ;
  - mini-sparkline réutilisable (`Sparkline`, `src/components/envelope-card.tsx:27` — à extraire dans `src/components/sparkline.tsx` pour partage) sur la série agrégée des enveloppes liées.
- **En-tête** : statut combiné (« 2 sur la bonne voie · 1 à revoir »), bouton **Nouveau but**.
- **Empty state** : si aucun but, écran d'accueil avec bouton **« Créer mon matelas de sécurité »** (première étape recommandée, comme competition) + accès aux autres modèles.

### 3.2 Création / édition (`/buts/nouveau`, `/buts/[id]/modifier`)

Formulaire server action + `useActionState`, même style que `new-envelope-form.tsx` :

1. **Modèle & nom** : liste de modèles pré-remplis ou personnalisé ; nom (max 80 car.) ; icône parmi un sous-ensemble de `lucide-react`.
2. **Paramètres cibles** selon le type : montant (ou dépenses mensuelles × durée pour le matelas ; rente mensuelle + âge/année pour la rente), date cible (sélecteur, 1 mois → 50 ans), contribution mensuelle **facultative** (préfill par le DCA actif des enveloppes liées via `dcaMonthlyCents`).
3. **Enveloppes liées** : checkboxes des enveloppes ouvertes (`closedAt: null`) ; contraintes : pas de doublon avec un autre but actif, matelas = uniques, matelas n'accepte que `LIVRET_A`/`PRIV`.
4. **Récapitulatif pré-validation** (exigence competition §3) : progression actuelle, **rendement annuel requis**, statut prévisionnel — calculés en direct côté client (module pur `src/lib/goals/progress.ts`, mêmes fonctions que le serveur).

Édition : mêmes champs, plus **danger zone** (suppression) comme `danger-zone.tsx` existant. Changement de type interdit après création (les cibles ne sont pas comparables) — l'édition propose de recréer.

### 3.3 Détail d'un but (`/buts/[id]`)

Le but et l'actuel **en haut, en évidence**, pour connaître l'évolution d'un coup d'œil :

- **Bloc héro** : actuel (`text-4xl font-heading tabular-nums`) → cible, barre de progression, badge statut + **HintLabel** (aide au survol) expliquant le statut, date cible et pourcentage.
- **KPIs** (composant `Kpi` existant) : contribution mensuelle engagée (DCA + saisie), rendement requis vs rendement attendu, épargne mensuelle nécessaire pour combler sans rendement, mois restants.
- **Leviers d'ajustement** si statut = compromis/sous-financé/en retard : trois cartes cliquables (épargne mensuelle nécessaire pour tenir la date · date réaliste au rythme actuel · cible atteignable au rythme actuel) — les mêmes nombres en trois cadrages.
- **Graphiques** (Recharts, thème existant) selon le type :
  1. **Évolution du but (par mois)** — ligne temporelle de la **métrique du but** : mois de couverture pour le matelas, rente mensuelle équivalente pour `FIRE`/`RETIREMENT`, % de la cible pour les autres ; graduée 0–100 %+ avec ligne pointillée à la cible (`--accent-500`), la ligne de **trajectoire théorique requise** (ligne droite capital→cible à la date) en pointillé `--text-muted`.
  2. **Évolution de la valeur des enveloppes liées** — réutilisation directe du pattern `wealth-chart` : `aggregateSeries(envelopesLiées.series)` + toggle par enveloppe, valeur cumulée investie en seconde série.
  3. **Projection jusqu'à la date cible** (types capitalisés seulement) : capital projeté au rendement attendu (`simulateTwoTracks` simplifié, un seul compartiment — rendement pondéré des enveloppes liées) vs trajectoire requise, avec avertissement indicatif.
- **Enveloppes liées** : cartes compactes (nom, type, valeur actuelle, part du but, lien `/enveloppes/[id]`).
- **Avertissement indicatif** (footer, `text-xs text-text-muted`) : projections indicatives basées sur les données actuelles, pas une prévision — formulation courte adaptée de competition.

---

## 4. Logique de calcul — précision & cohérence

Nouveau module pur `src/lib/goals/progress.ts` (testable, sans Prisma ni serveur) + enveloppe serveur dans `src/server/queries.ts`.

### 4.1 Monnaie & arrondis

- Tous les montants en **centimes entiers** (`*Cents`), jamais de flottants dans la persistance ni entre modules — convention existante (`eurosToCents`, `formatEurCents`).
- Les rendements/inflation restent des fractions flottantes ; **les sorties monétaires passent par `Math.round` une seule fois**, au dernier moment (même discipline que `livret.ts` et `simulator.ts`).
- Affichage via `formatEurCents` / `formatMoneyCents` (respecte la devise et le `numberLocale` de l'utilisateur), mois de couverture en `Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })`.

### 4.2 Anti double comptage (cohérence de calcul)

**Décision** : `Envelope.goalId` (FK unique) — une enveloppe appartient à au plus **un** but actif. La valeur du but = `Σ valeur(enveloppe liée)` via la **même chaîne de valorisation que le dashboard** : `currentValueCents` sur les valuations, solde livret quinzaine par quinzaine (`buildLivretBalanceSeries`). **Aucune deuxième voie de calcul de la valeur d'une enveloppe** — les buts et le dashboard affichent toujours le même chiffre pour la même enveloppe.

### 4.3 Métriques par type

```
SAFETY_NET : moisCouverts = valeurLiée / dépensesMensuelles ; cible = duréeMois
             progression = moisCouverts / duréeMois (peut dépasser 1 → « surfinancé »)
FIRE       : renteActuelle = valeurLiée × tauxRetrait / 12 ; cible = renteCible
             capitalCible = renteCible × 12 / tauxRetrait
RETIREMENT, DOWN_PAYMENT, CUSTOM_* : progression = valeurLiée / cibleMontant
```

- `valeurLiée` = valeur actuelle (dernier point connu). Historique mensuel = même valeur recalculée **à chaque fin de mois écoulé** (itération sur `aggregateSeries` des séries liées, échantillonnage au dernier jour de chaque mois — interpolation plate `valueAt` existante, `src/lib/portfolio/series.ts:79`).
- Le taux de retrait du `FIRE` et le rendement attendu viennent des **préférences du simulateur** (mêmes valeurs par défaut que la page Analyse) — un seul réglage utilisateur, jamais deux.

### 4.4 Rendement requis (capitalisés : `RETIREMENT`, `DOWN_PAYMENT`, `CUSTOM_*`, `CUSTOM`)

Résolution du taux annuel `r` tel que :

```
cible = valeurActuelle × (1+r)^années + contributionMensuelle × 12 × [((1+r)^années − 1)/r]
```

- Résolution numérique : **bissection** sur r ∈ [−0,05 ; 0,30] (50 itérations, précision 1e-6 — pas de solution fermée quand il y a des contributions) ; si `contributionMensuelle = 0`, solution fermée `r = (cible/valeurActuelle)^(1/années) − 1`.
- `rendementRequis = null` si `valeurActuelle ≤ 0` et pas de contribution (but inatteignable par le rendement seul → statut compromis), ou si `années ≤ 0`.
- **Seuil de réalisme** (statuts) : `EXPECTED_EQUITY_RETURN = 6,2 %` (scanners.ts) − marge de sécurité de 2 points → **but « bonne voie » si rendementRequis ≤ 4,2 %** quand des enveloppes actions sont liées ; pour un but 100 % livret, le plafond est le taux livret réel (`interestRate ?? LIVRET_A_RATE`). Ces seuils vivent dans `src/lib/goals/progress.ts` comme constantes nommées, testés (§6).
- **Aucune approximation du genre « cible − actuel ÷ mois restants » n'est exposée sans libellé exact** : l'épargne mensuelle nécessaire sans rendement est affichée comme telle (« hors rendement »), l'épargne nécessaire à rendement attendu est calculée par inversion de la même formule (bissection sur la contribution).

### 4.5 Machine à statuts (une seule, partagée par la liste et le détail)

```
atteint        : progression ≥ 1 et date cible non dépassée
enRetard       : progression < 1 et now > dateCible
surfinancé     : progression ≥ 1,5 (excédent net → suggestion de réallocation)
bonneVoie      : rendementRequis ≤ seuilRéaliste OU progression ≥ trajectoireRequise(t)
sousFinancé    : progression < trajectoireRequise(t) (retard sur la ligne droite capital→cible)
compromis      : rendementRequis > seuilRéaliste ET progression < trajectoireRequise(t)
excédentaire   : projection au rendement attendu dépasse la cible de > 10 % à la date cible
```
(`SAFETY_NET` : `atteint` = moisCouverts ≥ durée ; `alerte` < 3 mois ; `tropÉlevé` > durée × 1,5 — pas de rendement requis.)

`trajectoireRequise(t) = min(1, moisÉcoulés/moisTotaux)` pour un démarrage à la création du but (la date de création est persistée).

### 4.6 Historique de progression

La série « évolution du but » est **dérivée, jamais persistée** (pas de table de snapshots V1) : à chaque visite, échantillonnage mensuel des séries d'enveloppes existantes → recompute des métriques du but à chaque date. Cohérent avec la philosophie de l'app (« métriques recalculées à chaque visite », README §Recalcul planifié) et zéro migration de données.

---

## 5. Prérequis d'implémentation (ce que l'app doit compléter)

### 5.1 Modèle de données (Prisma)

```prisma
model Goal {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              GoalType
  name              String
  icon              String    @default("target")
  status            String?            // dernier statut calculé (cache d'affichage), recalculé à la visite
  // cible
  targetAmountCents Int?               // RETIREMENT/DOWN_PAYMENT/CUSTOM_*
  targetRentCents   Int?               // FIRE : rente mensuelle
  targetMonths      Int?               // SAFETY_NET : durée de couverture
  targetDate        DateTime?          // date cible (tous sauf SAFETY_NET)
  withdrawalRate    Float?             // FIRE : taux de retrait (fraction)
  monthlyExpensesCents Int?            // SAFETY_NET : dépenses mensuelles saisies
  monthlyContributionCents Int?        // contribution déclarée (en plus du DCA)
  createdAt         DateTime  @default(now())
  envelopes         Envelope[]
  @@index([userId])
}

enum GoalType { SAFETY_NET FIRE RETIREMENT DOWN_PAYMENT CUSTOM_LIFEVENT CUSTOM }

model Envelope {
  // ...champs existants
  goalId String?
  goal   Goal? @relation(fields: [goalId], references: [id], onDelete: SetNull)
  @@index([goalId])
}
```

- `pnpm prisma db push` (pas de workflow de migrations dans le repo).
- Suppression d'un but : `SetNull` sur les enveloppes (elles redeviennent « non allouées »). Suppression d'une enveloppe : elle disparaît simplement du but (cascade existante côté enveloppe).
- Enveloppe **clôturée** (`closedAt ≠ null`) : exclue du calcul de progression (le dashboard l'exclut déjà), affichée grisée dans le détail du but.

### 5.2 Validation (Zod, `src/lib/validations.ts` — messages en français comme les existants)

- `goalSchema` : nom 1–80 car. ; type dans l'enum ; selon type, exactement un des trois coupleurs cible (`targetAmountCents > 0` OU `targetRentCents > 0` OU `targetMonths` 3–12) ; `targetDate` future obligatoire sauf `SAFETY_NET`/`CUSTOM` ; `withdrawalRate` 0,02–0,10 ; `monthlyContributionCents` ≥ 0 ; `monthlyExpensesCents` > 0 pour le matelas.
- Contraintes serveur (dans l'action, pas seulement Zod) : un seul `SAFETY_NET` actif par utilisateur ; enveloppe déjà liée à un autre but actif → erreur par enveloppe ; `SAFETY_NET` n'accepte que `LIVRET_A`/`PRIV`.

### 5.3 Server actions (`src/server/actions.ts`)

- `createGoalAction`, `updateGoalAction`, `deleteGoalAction` (pattern `ActionState` + `fieldErrors` existant), `revalidatePath("/buts")` + `revalidatePath("/dashboard")`.
- Aucune nouvelle source distante : tout est calculé sur les données existantes (aucun appel réseau, donc aucun risque sur les règles de `quotes.ts`).

### 5.4 Requêtes (`src/server/queries.ts`)

- `getGoalSummaries()` : buts de l'utilisateur + enveloppes liées + **réutilisation stricte** de `getEnvelopeSummaries` (le `cache()` React déduplique naturellement) ; assemble `GoalSummary { progress, monthsCovered, currentRentCents, status, requiredReturn, monthlySeries, linkedValue }`.
- Le calcul pur est dans `src/lib/goals/progress.ts` (importable par le client pour le récapitulatif pré-création).

### 5.5 i18n (`fr.json` + `en.json`, structure identique)

- Nouvelle clé `nav.goals` (« Buts » / « Goals ») — **et `Dictionary` étant typé depuis `fr.json`, les deux dictionnaires doivent être mis à jour dans le même commit** (règle AGENTS.md).
- Nouvelle section `goals` : liste (catégories, statuts, empty state), formulaire (modèles, paramètres, erreurs), détail (KPIs, leviers, avertissement indicatif). Aucune chaîne en dur dans les composants.
- Sections `dashboard` : une carte résumé des buts sur le dashboard (statut combiné + lien `/buts`), textes ajoutés aux deux dictionnaires.

### 5.6 UI & charte

- `NAV_KEYS` (`src/components/app-shell.tsx:17`) : ajouter `{ href: "/buts", key: "goals", icon: Target }` entre « Analyse » et « Réglages » — l'entrée apparaît automatiquement en desktop **et** dans la barre mobile (les deux bouclent sur `NAV_KEYS`).
- Icônes buts (`lucide-react`) : `Shield` (matelas), `TrendingUp` (rente), `Palmtree` (retraite), `Home` (apport), `Car`, `Heart`, `Plane`, `GraduationCap`, `Target` (personnalisé).
- Couleurs : **aucune nouvelle couleur**. Progression = `--accent-500` (identité, pas une variation), statuts = `Badge` tones existants, courbes = `CATEGORY_COLORS` du module Analyse pour les enveloppes liées, ligne cible = `--text-muted` pointillé, trajectoire requise = `--warning` pointillé. Le vert/rouge restent réservés aux gains/pertes (charte §2 : « le corail de marque n'est utilisé que pour l'identité… jamais pour signifier une variation » — ici il s'agit de progression, pas de variation).
- Bulles d'informations : réutiliser `HintLabel` / `InfoRow` (`src/app/(app)/analyse/`) pour tous les KPIs du but — hints détaillés sur « rendement requis », « trajectoire requise », « taux de retrait », « surfinancé ». Pas de nouveau composant tooltip.
- KPIs et cartes : composants `Kpi`, `Card`, `Badge`, `Button` existants ; tabular-nums partout sur les montants (charte §3).
- Les stats du but sur le **dashboard** : une seule carte compacte (statut combiné), pas un nid de widgets — le dashboard reste sobre (conforme à sa version actuelle).

---

## 6. Batterie de tests (précision des calculs, enveloppes, intégrité)

Nouveaux fichiers de test Vitest, style existant (describe/it, `expect(x).toBe(y)`, valeurs en centimes, `new Date(...)` explicites comme `livret.test.ts`) :

### 6.1 `src/lib/goals/progress.test.ts` — précision des calculs (module pur)

1. **Progression par type** : matelas (valeur 10 000 €, dépenses 1 500 €/mois, cible 6 mois → 4,0/6, progression 0,667 arrondi affiché 66,7 %) ; FIRE (valeur 127 200 €, taux 4 % → rente 424 €/mois exact) ; capital (18 200/60 000 → 30,33 %).
2. **Rendement requis, cas fermé** : 50 000 € actuels, cible 100 000 €, 10 ans, 0 contribution → 7,177 % (50 000×2^(1/10)) ; tolérance 1e-6 sur la bissection.
3. **Rendement requis avec contributions** : 35 000 € actuels, 500 €/mois, cible 500 000 €, 20 ans → r tel que la formule §4.4 soit satisfaite (vérification par substitution, pas valeur codée en dur) ; convergence bornée à 50 itérations.
4. **Bornes** : valeur actuelle 0 + contribution 0 → `rendementRequis = null` ; cible < valeur actuelle → r négatif bien géré (statut excédentaire, pas de crash) ; date cible passée → statut en retard même à 99 %.
5. **Épargne nécessaire** : inversion de la contribution à rendement fixé — vérification par substitution (cible atteinte ± 1 centime près après arrondi au centime).
6. **Machine à statuts** : les 8 statuts déclenchés par leurs conditions exactes, y compris les cas limites (progression exactement 1 → atteint ; 1,5 exactement → surfinancé ; matelas < 3 mois → alerte ; matelas > 1,5× → tropÉlevé).
7. **Séries mensuelles** : 3 enveloppes aux historiques décalés (une ouverte en cours de route) → échantillonnage mensuel sans faille, interpolation plate `valueAt` (avant la première valuation d'une enveloppe = 0, jamais le premier point — régresse le bug déjà documenté dans `series.ts:86`).
8. **Trajectoire requise** : à la création = 0, à la date cible = 1, linéaire en mois, clampée [0, 1] si la date glisse.

### 6.2 Précision des enveloppes liées (cohérence de calcul)

9. **Égalité stricte dashboard ↔ but** : la valeur d'une enveloppe dans `GoalSummary` est **exactement** `EnvelopeSummary.valueCents` pour la même enveloppe au même instant — livret (solde quinzaine, pas la somme des dépôts), PEA/CTO (dernière valuation cumulée). Test sur un fixture mixte PEA + LIVRET_A + PRIV.
10. **Anti double comptage** : fixture 2 buts + 3 enveloppes, dont une liée au but A → la somme des valeurs de tous les buts ≤ somme des enveloppes (invariant), et chaque enveloppe compte au plus une fois.
11. **Livret partiel** : un livret avec dépassement de plafond (`overCapCents`) → la progression du matelas compte le **solde** (capital + intérêts), pas les dépôts bruts ; le surplafond reste visible dans le détail.
12. **Enveloppe clôturée** : exclue de la progression, la série du but ne chute pas (l'enveloppe disparaît de la courbe à sa date de clôture, la valeur est retirée — le test vérifie que la chute éventuelle reflète la réalité, pas un saut d'agrégation).

### 6.3 Validations & actions (`src/lib/validations.test.ts` + `tests/smoke-goals.test.ts`)

13. `goalSchema` : chaque règle §5.2 (cibles par type, dates, taux de retrait 2–10 %, dépenses > 0) ; messages d'erreur français exacts.
14. Smoke des actions (pattern `tests/smoke-actions.test.ts`) : création OK, 2e matelas rejeté, enveloppe déjà liée rejetée, `PEA` lié au matelas rejeté, suppression → `goalId` null sur les enveloppes.

### 6.4 Composants (`src/app/(app)/buts/goal-card.test.tsx`, Testing Library, pattern `envelope-list-panel.test.tsx`)

15. Carte de but : actuel/cible en évidence, badge statut correct, barre plafonnée à 100 %, clic → `/buts/[id]`.
16. Liste vide : bouton « Créer mon matelas de sécurité ».
17. i18n : rendu avec les deux dictionnaires (le build casse si une clé manque — test de parité des clés `goals` fr/en).

### 6.5 Non-régression

18. `pnpm typecheck` + `pnpm lint` + `pnpm test:run` verts ; la carte nav mobile affiche bien 5 entrées sans débordement (les tests composants de `app-shell` via `ui.test.tsx` si présents, sinon visuel).

---

## 7. Observations d'implémentation issues de la codebase

Ce que la lecture du code impose ou facilite pour l'implémentation :

- **AppShell à point unique** (`src/components/app-shell.tsx:17`) : `NAV_KEYS` alimente la sidebar desktop **et** la barre mobile — une seule ligne à ajouter. Icône `Target` de `lucide-react` (déjà dépendance, v1.47).
- **Chaîne de valorisation à ne pas dupliquer** : `getEnvelopeSummaries` (`src/server/queries.ts`) centralise valeur + séries + livret + DCA. Les buts doivent **consommer** ces summaries, jamais recalculer — c'est l'invariant de cohérence §6.2-9. Le `cache()` React évite tout surcoût de double appel dans une même requête.
- **`EnvelopeSummary.dcaMonthlyCents` existe déjà** : préfill naturel de la contribution mensuelle du but (épigraphe du DCA actif des enveloppes liées). Le simulateur Analyse fait pareil (`SimulatorDefaults.monthlySavingsCents`).
- **Séries agrégées prêtes** : `aggregateSeries` (interpolation plate) et `investedSeries` de `src/lib/portfolio/series.ts` donnent directement les deux courbes du graphique « valeur des enveloppes liées » ; l'échantillonnage mensuel du but est un `valueAt` sur ces séries.
- **Rendement attendu prêt** : `historicalCagr` (scanners.ts, Modified Dietz annualisé, null si < 6 mois) + `DEFAULT_EQUITY_RETURN`/`EXPECTED_EQUITY_RETURN` = la source unique du « rendement que le portefeuille peut raisonnablement viser » pour le statut. Le module Analyse a déjà tranché ce débat (commits récents sur XIRR/TWR) — les buts ne réintroduisent pas un autre calcul de performance.
- **Taux de retrait déjà dans le simulateur** : `simulateWealth` expose `withdrawalRate` et `fireYear` — le but FIRE réutilise le même paramètre et le même 4 % par défaut. Deux endroits qui diraient des choses différentes seraient un bug produit.
- **Le matelas a son calcul livret prêt** : `buildLivretBalanceSeries` + `projectOneYear` (`src/lib/livret.ts`) fournissent solde actuel, surplafond et perte de pouvoir d'achat — le signal « matelas trop élevé » s'appuie dessus plutôt que sur une nouvelle formule.
- **Dépenses mensuelles** : `estimateMonthlySavings`/`estimateMonthlyExpenses` (scanners.ts) préfillent le matelas depuis le salaire et l'épargne observée (12 mois glissants). Si `salaryCents` est null, le champ est simplement requis — pas de magie.
- **Bulles d'information** : `HintLabel`/`InfoRow` (`src/app/(app)/analyse/`) sont le pattern maison (hover + focus, tooltip positionné, `HelpCircle`) — à dupliquer dans le dossier `buts/` ou à extraire dans `src/components/` si réutilisés (extraction recommandée pour éviter la duplication client/serveur).
- **Couleurs** : le module Analyse définit `CATEGORY_COLORS` (8 teintes, `colorFor(index)`) pour toutes les séries multi-enveloppes — le but avec N enveloppes liées doit réutiliser cette palette et cette fonction (cohérence Analyse ↔ Buts pour la même enveloppe idéalement : index stable par enveloppe au sein du but). Les variables CSS (`--accent-500`, `--positive`, `--warning`…) passent par les tokens Tailwind `@theme inline` — ne jamais hardcoder d'hex dans les nouveaux composants, sauf si réutilisant le tableau Analyse (qui hardcode par héritage).
- **i18n piège connu** : `Dictionary` est typé **depuis `fr.json`** — une clé `goals.*` absente d'un des deux fichiers casse `pnpm build`. Mettre à jour les deux dictionnaires dans le même commit que les composants (règle AGENTS.md). Interpolation `.replace("{clé}", valeur)` et pluriels `{s}` comme partout.
- **Dates** : toujours passer des `Date` explicites aux fonctions pures (`now: Date = new Date()` paramètre par défaut comme `livret.ts`) pour la testabilité ; attention aux fuseaux (l'app a déjà corrigé des bugs de dates mixtes minuit local/UTC — `toUtcMidnight` dans performance.ts). L'échantillonnage mensuel doit utiliser des dates locales au premier du mois (pattern `new Date(y, m, 1)` de `livret.ts`).
- **Tests** : tout module pur dans `src/lib/**` avec un `*.test.ts` adjacent (convention vitest include `src/**/*.test.{ts,tsx}`) ; smoke des server actions dans `tests/` avec la DB de test existante (`tests/test-utils.tsx`, `smoke-actions.test.ts` comme modèle).
- **Structure de page** : une page `page.tsx` serveur (données via `getGoalSummaries`) + composants client pour l'interactivité (`goal-detail-view.tsx` client, comme `analysis-view.tsx`) ; le détail par id suit le pattern `envelopes/[id]/page.tsx`. Le panneau latéral n'est pas nécessaire ici — la liste et le détail sont deux pages, comme les enveloppes.
- **Dashboard non-régressif** : la carte résumé des buts doit rester optionnelle et discrète — le dashboard actuel calcule tout depuis `getEnvelopeSummaries` en server ; ajouter les buts nécessite un `getGoalsCombinedStatus()` léger, pas une jointure lourde.
- **Aucune nouvelle dépendance** : Recharts, lucide-react, zod, tout y est. Pas de lib de résolution numérique (bissection maison, 20 lignes).

---

## 8. Phasage suggéré

1. **Socle** : Prisma + validations + actions + module pur `progress.ts` + tests 6.1 (la précision d'abord).
2. **Liste & navigation** : nav, `/buts` (liste par catégories, statuts, carte), i18n, tests composants.
3. **Création/édition** : formulaires, contraintes d'enveloppes liées, récapitulatif pré-validation.
4. **Détail** : bloc héro, KPIs + hints, graphiques (évolution du but, valeur des enveloppes, projection), leviers.
5. **Finitions** : matelas (alertes, trop élevé, livret), carte dashboard, statut combiné, avertissement indicatif.
