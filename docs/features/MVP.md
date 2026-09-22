# Fonctionnalité — MVP « Suivi de portefeuille long terme »

**ID** : FEAT-MVP-001
**Statut** : Spécifié (non implémenté)
**Jalons associés** : M1 à M5 — voir [docs/PLAN.md](../PLAN.md)

---

## 1. Résumé

Permettre à un investisseur long terme de :

1. Créer un compte simplement, avec un profil **facultatif** (âge, nom, travail, salaire).
2. Créer des **enveloppes** parmi deux types pour la V1 : **PEA** et **CTO**.
3. Ajouter dans chaque enveloppe des **positions** (ETF, actions, ...) avec la valeur investie.
4. Visualiser un **graphique d'évolution** de la valeur de chaque enveloppe.

Positionnement : suivi et compréhension de la croissance (intérêts composés), **pas** un outil de trading (pas d'ordres, pas de temps réel, pas de recommandation).

## 2. Récits utilisateurs

### EPIC-1 — Compte

**US-101 — Créer un compte**
> En tant que visiteur, je veux créer un compte avec juste un email et un mot de passe, pour commencer à suivre mon portefeuille en moins d'une minute.

- Critères d'acceptation :
  - [ ] Formulaire : email + mot de passe (min. 8 caractères).
  - [ ] L'email est unique ; erreur claire si déjà pris.
  - [ ] Après inscription, l'utilisateur est connecté et arrivé sur un dashboard vide avec un appel à l'action « Créer ma première enveloppe ».
  - [ ] Aucune donnée de profil n'est requise pour créer le compte.

**US-102 — Profil optionnel**
> En tant qu'utilisateur, je veux renseigner optionnellement mon âge, nom, travail et salaire, pour personnaliser mon suivi (ex. taux d'épargne).

- Critères d'acceptation :
  - [ ] Champs tous optionnels : nom, âge (18–120), travail (texte libre), salaire mensuel net (≥ 0).
  - [ ] Enregistrable partiellement (ex. seulement l'âge).
  - [ ] Modifiable à tout moment depuis les réglages.
  - [ ] Données supprimables (conformité RGPD).

### EPIC-2 — Enveloppes

**US-201 — Créer une enveloppe PEA ou CTO**
> En tant qu'utilisateur, je veux créer une enveloppe PEA ou CTO nommée, pour organiser mes investissements par cadre fiscal.

- Critères d'acceptation :
  - [ ] Choix du type : PEA ou CTO (les deux proposés, PEA mis en avant).
  - [ ] Champs : nom de l'enveloppe, date d'ouverture (optionnelle mais utile pour le PEA), courtier (optionnel).
  - [ ] Pour un PEA : affichage du plafond de versements **150 000 €** et d'un indicateur « Antériorité fiscale : X années restantes » si la date d'ouverture est renseignée.
  - [ ] Pour un CTO : affichage de la fiscalité flat tax **31,4 %** (LFSS 2026) — informatif.
  - [ ] Validation : nom requis, date d'ouverture non future.

**US-202 — Voir la fiche d'une enveloppe**
> En tant qu'utilisateur, je veux ouvrir une enveloppe pour voir mes positions, le total investi, la valeur actuelle et le graphique d'évolution.

- Critères d'acceptation :
  - [ ] Carte d'identité : nom, type, courtier, date d'ouverture.
  - [ ] KPIs : total investi, valeur actuelle, gain/perte en € et %.
  - [ ] Graphique temps réel vs valeur (voir EPIC-4).
  - [ ] Liste des positions triable (nom, montant, date).
  - [ ] Badges fiscaux contextuels : « Flat tax avant 5 ans », « Exonération IR après 5 ans », etc.

**US-203 — Clôturer une enveloppe**
> En tant qu'utilisateur, je veux clôturer une enveloppe sortie de mon suivi, sans perdre l'historique.

- Critères d'acceptation :
  - [ ] Confirmation obligatoire avec texte explicite.
  - [ ] L'enveloppe clôturée n'apparaît plus dans le dashboard mais reste consultable (mode archive).

### EPIC-3 — Positions

**US-301 — Ajouter une position**
> En tant qu'utilisateur, je veux ajouter une position (ETF, action, ...) avec ma valeur investie, pour suivre la composition de mon portefeuille.

- Critères d'acceptation :
  - [ ] **Recherche par identifiant/ticker** : à partir de 2 caractères, une liste de suggestions (symbole, nom, place, type) est proposée depuis une base publique (Yahoo Finance) ; la sélection pré-remplit nom, catégorie et cours actuel.
  - [ ] Champs : nom/ticker (requis), catégorie — ETF / Action / Obligation / Fonds / Autre, montant investi (requis, > 0), date d'achat (requis, non future), quantité (optionnelle), prix unitaire (optionnel), notes (optionnel).
  - [ ] Montants en EUR, saisie avec 2 décimales, stockage en centimes (entier).
  - [ ] La position apparaît immédiatement dans l'enveloppe et met à jour le total investi.
  - [ ] Si la recherche est indisponible (API limitée), le formulaire reste utilisable en saisie manuelle complète.

**US-301b — État des lieux (« j'arrive en cours »)**
> En tant qu'investisseur qui détient déjà des valeurs dans un compte existant chez un courtier, je veux saisir l'état des lieux actuel — pour tel titre, j'ai X à l'instant T — sans reconstituer l'historique.

- Critères d'acceptation :
  - [ ] Mode dédié activable par case à cocher « J'arrive en cours ».
  - [ ] Saisie : quantité détenue + cours actuel (pré-rempli si trouvé), OU valeur totale de la ligne.
  - [ ] Le montant investi est **optionnel** dans ce mode (`investedCents` nullable) ; gain/perte affichés « — » avec mention « état des lieux » tant qu'il manque des données.
  - [ ] Une valorisation initiale de position est créée à la date de l'état des lieux.

**US-302 — Éditer / supprimer une position**
- [ ] Édition de tous les champs avec validation identique à la création.
- [ ] Suppression avec confirmation ; les valorisations historiques liées restent intactes au niveau enveloppe.

**US-303 — Valoriser une position ou une enveloppe**
> En tant qu'utilisateur, je veux saisir périodiquement la valeur actuelle de mes positions, pour générer l'historique du graphique.

- Critères d'acceptation :
  - [ ] Saisie d'une valorisation à une date donnée (position ou enveloppe entière).
  - [ ] Une valorisation par date max (la nouvelle remplace l'ancienne à même date).
  - [ ] La valeur « actuelle » est la dernière valorisation connue ; à défaut, le montant investi.

### EPIC-4 — Graphique d'évolution

**US-401 — Graphique de l'évolution de la valeur d'une enveloppe**
> En tant qu'utilisateur, je veux voir la courbe de la valeur de mon enveloppe dans le temps, pour visualiser l'effet des intérêts composés.

- Critères d'acceptation :
  - [ ] Courbe « valeur dans le temps » (axis X temps, axis Y EUR).
  - [ ] Sélecteur de période : 6 mois / 1 an / Tout.
  - [ ] Tooltip au survol : date, valeur, variation depuis la période.
  - [ ] Séries cumulant les valorisations saisies + interpolations plates entre dates connues (pas de valeur inventée).
  - [ ] État vide : si aucune valorisation, message « Ajoutez une première valorisation pour voir la courbe ».

### EPIC-5 — Dashboard

**US-501 — Vue d'ensemble**
- [ ] Total patrimoine investi (somme des enveloppes actives).
  - [ ] Répartition par enveloppe (barres empilées ou donut).
  - [ ] Variation globale sur la période sélectionnée.
  - [ ] Cartes cliquables vers chaque enveloppe.

## 3. Modèle de données (V1)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  age          Int?
  job          String?
  salaryEur    Int?     // salaire mensuel net, en centimes
  createdAt    DateTime @default(now())
  envelopes    Envelope[]
}

model Envelope {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id])
  type           EnvelopeType // PEA | CTO
  name           String
  broker         String?
  openedAt       DateTime?
  closedAt       DateTime?
  createdAt      DateTime  @default(now())
  positions      Position[]
  valuations     EnvelopeValuation[]
}

model Position {
  id             String   @id @default(cuid())
  envelopeId     String
  envelope       Envelope @relation(fields: [envelopeId], references: [id])
  name           String
  category       PositionCategory // ETF | STOCK | BOND | FUND | OTHER
  investedCents  Int
  quantity       Decimal?
  unitPriceCents Int?
  notes          String?
  boughtAt       DateTime
  createdAt      DateTime @default(now())
  valuations     PositionValuation[]
}

model EnvelopeValuation {
  id          String   @id @default(cuid())
  envelopeId  String
  envelope    Envelope @relation(fields: [envelopeId], references: [id])
  date        DateTime
  valueCents  Int
  @@unique([envelopeId, date])
}

model PositionValuation {
  id          String   @id @default(cuid())
  positionId  String
  position    Position @relation(fields: [positionId], references: [id])
  date        DateTime
  valueCents  Int
  @@unique([positionId, date])
}
```

## 4. Règles métier clés

| # | Règle |
|---|---|
| R1 | Les montants sont saisis en EUR avec 2 décimales et stockés en centimes (entiers) pour éviter les erreurs de virgule flottante. |
| R2 | `PEA` : plafond de versements 150 000 € (versements, pas valorisation) ; retrait avant 5 ans = clôture du plan (sauf cas légaux) ; après 5 ans : exonération d'IR, prélèvements sociaux 18,6 % (LFSS 2026). Sources : [docs/guides/enveloppes-fiscalite.md](../guides/enveloppes-fiscalite.md). |
| R3 | `CTO` : pas de plafond ; flat tax 31,4 % (12,8 % IR + 18,6 % PS, LFSS 2026) sur dividendes, intérêts et plus-values, par défaut ; option barème progressif possible. |
| R4 | La valeur actuelle d'une enveloppe = dernière valorisation connue, sinon somme des montants investis. |
| R5 | Une date de valorisation future est invalide ; une valorisation à date existante remplace l'ancienne. |
| R6 | La suppression d'une position n'entraîne pas la suppression des valorisations d'enveloppe. |

## 5. Interactions/Écrans

Voir [docs/design/USAGE_GUIDE.md](../design/USAGE_GUIDE.md) (parcours utilisateur) et [docs/design/UI_CHARTER.md](../design/UI_CHARTER.md) (charte graphique).

## 6. Critères de sortie du MVP

- [ ] Un nouvel utilisateur peut créer un compte et compléter son profil optionnel (E2E).
- [ ] Il peut créer un PEA et un CTO, y ajouter des positions, saisir des valorisations (E2E).
- [ ] Le graphique d'évolution s'affiche avec des données réelles saisies (E2E + test de calcul de série).
- [ ] Lint, typecheck et tests verts en CI.

## 7. Idées pour la suite (hors V1)

Projets d'investissement récurrents (DCA), objectifs de patrimoine, dividendes/coupons, PEA-PME et assurance-vie, multi-devises, export CSV, mode démo, agrégation automatique de comptes.
