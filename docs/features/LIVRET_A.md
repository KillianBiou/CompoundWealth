# Fonctionnalité — Enveloppes Livret A (épargne réglementée)

**ID** : FEAT-LIVRET-001

**Statut** : Implémenté (V1 — suivi du solde, planification, pédagogie du rendement réel)

---

## 1. Résumé

Ajouter un nouveau type d'enveloppe : les **livrets**, limité en V1 au **Livret A**.

Contrairement aux enveloppes titres (PEA/CTO), un livret **n'a pas de positions** : l'enveloppe
est un **solde**, alimenté par des **versements et retraits** (`EnvelopeDeposit`). Les intérêts
sont calculés par l'application selon les règles officielles du Livret A :

- **Plafond de dépôt** : 22 950 € (particuliers).
- **Taux** : 1,7 % par an depuis le 1er août 2026 (révision semestrielle, Banque de France —
  1er février / 1er août). Prérempli à la création de l'enveloppe, ajustable par l'utilisateur.
- **Intérêts par quinzaine** : 24 quinzaines par an (1er → 15, 16 → fin de mois). Un versement
  ne produit des intérêts qu'à partir de **la quinzaine suivant** sa date de valeur.
- **Capitalisation annuelle** : les intérêts de l'année sont crédités au solde au 31 décembre
  (modélisé au 1er janvier suivant).
- **Fiscalité** : exonérée d'impôt sur le revenu et de prélèvements sociaux.
- **Au-delà du plafond** : le plafond s'applique aux **versements** (service-public.gouv.fr,
  art. L221-4/R221-2) — la banque refuse tout versement qui ferait dépasser 22 950 €. Le solde
  crédité peut en revanche dépasser le plafond via les intérêts capitalisés au 31 décembre,
  et continue alors d'être rémunéré **en totalité** au taux du livret. L'excédent refusé est
  suivi à part (`overCapCents`) : il reste hors livret, rémunéré à un taux très faible.

L'objectif pédagogique est de montrer la **non-rentabilité réelle** du livret : à horizon 1 an,
« + X € d'intérêts (mais Y % de baisse de pouvoir d'achat) » lorsque l'inflation dépasse le
taux nominal.

---

## 2. Récits utilisateurs

### US-L0 — Créer mon livret avec son montant actuel

> En tant qu'épargnant, je veux créer mon livret en indiquant directement le montant actuellement
> dessus, plutôt qu'une date d'ouverture.

- Critères d'acceptation :
  - [x] Formulaire de création : champ « Montant actuellement sur le livret (€) » à la place de la
    date d'ouverture pour le type Livret A.
  - [x] Un versement initial à la date du jour est créé automatiquement si le montant est renseigné.

### US-L1 — Suivre le solde de mon livret

> En tant qu'épargnant, je veux saisir mes versements et retraits et voir le solde réel de mon
> Livret A, intérêts compris.

- Critères d'acceptation :
  - [x] Création d'une enveloppe de type « Livret A » (sans positions), avec préfill du taux
    (1,7 %) et de l'inflation (2 %).
  - [x] Formulaire de mouvement : date + montant (négatif = retrait), avec validation
    (date non future, montant non nul, ±500 000 €).
  - [x] Liste des mouvements avec suppression, notifications toast pour chaque opération.
  - [x] KPI « Solde actuel » dont intérêts cumulés (solde − cumul des versements nets).

### US-L2 — Voir le plafond et l'alerte de dépassement

> En tant qu'épargnant, je veux voir le plafond de 22 950 € sur le graphique et être alerté
> si mon solde le dépasse.

- Critères d'acceptation :
  - [x] Ligne pointillée au plafond, activée par une case « Montrer la limite » ; décochée,
    l'ordonnée se centre sur l'intervalle investi ; cochée, l'ordonnée couvre 0 → plafond × 1,05.
  - [x] Zone au-dessus du plafond signalée en rouge dans le tooltip du graphique.
  - [x] Bandeau d'alerte rouge (rôle `alert`) si dépassement : la banque refuse les versements
    au-delà du plafond, l'excédent reste hors livret à un taux très faible — « très nocif pour
    votre épargne ».
  - [x] Sur le graphique, l'excédent refusé est empilé au-dessus du plafond dans une zone
    **hachurée rouge** (pattern SVG), distincte du solde crédité.

### US-L3 — Comprendre mon rendement réel

> En tant qu'épargnant, je veux voir, à horizon 1 an, mes intérêts attendus et l'évolution de
> mon pouvoir d'achat pour comprendre la non-rentabilité du livret.

- Critères d'acceptation :
  - [x] KPI « Intérêts attendus (1 an) » (vert) : min(solde, plafond) × taux.
  - [x] KPI « Pouvoir d'achat à 1 an » : variation en euros constants
    (solde projeté / (1 + inflation)), vert/rouge selon le signe, avec % réel.
  - [x] Bandeau pédagogique ambre quand le rendement réel est négatif : « + X € d'intérêts
    mais − Y € en euros constants ».
  - [x] Paramètres modifiables : taux de rémunération (%, borné 0–15) et inflation (%, borné
    −5–20), enregistrés sur l'enveloppe.

### US-L4 — Planifier des versements réguliers (DCA)

> Le champ « Date de départ » est remplacé par un **Jour de départ** (1–31) : seule la périodicité
> mensuelle importe, la première échéance est la prochaine date tombant ce jour du mois
> (`nextDateForDay`).

> En tant qu'épargnant, je veux planifier des virements réguliers vers mon livret.

- Critères d'acceptation :
  - [x] Section « Versements réguliers » sur la page du livret.
  - [x] Création : périodicité (2 semaines, 1 mois, 2 mois, 3 mois), date de départ, montant.
  - [x] Liste avec prochaine échéance (absolue + relative), mise en pause / reprise et
    suppression, avec toasts.
  - [x] Planification uniquement — aucun virement automatique (cohérent avec FEAT-DCA-001).

### US-L5 — Voir mon épargne dans mon patrimoine global

> En tant qu'investisseur, je veux voir la part de mon épargne (livrets) distincte de mes
> actions/ETF sur le graphique du tableau de bord.

- Critères d'acceptation :
  - [x] Aire bleue empilée en bas pour l'épargne (livrets), aire verte au-dessus pour les
    actions/ETF.
  - [x] Ligne bleue pointillée indépendante pour l'investi total.
  - [x] Tooltip détaillé par classe d'actif + plus/moins-value.
  - [x] Les séries du livret alimentent le patrimoine consolidé et les cartes d'enveloppe
    (sparkline du solde quinzaine par quinzaine).

---

## 3. Modèle de données

```prisma
enum EnvelopeType { PEA CTO LIVRET_A }

model Envelope {
  // …
  type          EnvelopeType
  interestRate  Float?   // taux annuel, fraction (0.017) — livret
  inflationRate Float?   // inflation annuelle estimée, fraction — livret
  deposits      EnvelopeDeposit[]
}

model EnvelopeDeposit {
  id          String   @id @default(cuid())
  envelopeId  String
  envelope    Envelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  date        DateTime
  amountCents Int      // positif = versement, négatif = retrait
  createdAt   DateTime @default(now())

  @@index([envelopeId])
}
```

Le DCA livret réutilise `DcaPlan`/`DcaLine` avec une ligne unique `isin = "LIVRET"`,
`name = "Versement"`.

---

## 4. Systèmes et calculs (`src/lib/livret.ts`)

| Fonction | Rôle |
| --- | --- |
| `nextFortnightStart(date)` | Début de la quinzaine qui produit des intérêts (versement du 15 → 16 ; du 16 → 1er du mois suivant). |
| `fortnightStart(date)` | Quinzaine contenant la date. |
| `buildLivretBalanceSeries(events, rate, now, horizonMonths = 12)` | Série du solde quinzaine par quinzaine : versements (refusés au-delà du plafond, excédent `overCapCents` hors livret), retraits (consomment d'abord l'excédent), capitalisation au 1er janvier, intérêts = solde × taux / 24 (le solde capitalisé peut dépasser le plafond), cumul `depositedCents`. |
| `projectOneYear(events, rate, inflation, now)` | Projection pédagogique : intérêts attendus (solde × taux), perte de valeur brute due à l'inflation seule (`inflationLossCents`), solde en euros constants (/(1+inflation)), variation réelle nette et taux réel. |

**Solde actuel** = dernier point de la série **≤ maintenant** (et non la projection).
**Valeur d'enveloppe** = ce solde ; **investi** = cumul des versements nets (hors intérêts).

Sur le tableau de bord, la classe d'actif « épargne » agrège les séries livret
(`series` = solde par quinzaine, `investedSeries` = `depositedCents`).

---

## 5. Écrans et navigation

| Écran | Contenu |
| --- | --- |
| `/envelopes/new` | Troisième carte « Livret A » (description plafond/taux/exonération), encart explicatif dédié, placeholder « Livret A épargne ». |
| `/envelopes/[id]` (livret) | KPI solde/intérêts/pouvoir d'achat, bandeaux d'alerte, graphique du solde avec plafond pointillé, mouvements, paramètres, versements réguliers (DCA), zone de danger. |
| `/envelopes` | Carte d'enveloppe : badge « Livret A » neutre, sparkline du solde, alerte de dépassement de plafond dans le pied. |
| `/dashboard` | Graphique empilé : épargne bleue (bas) + actions/ETF vertes (dessus) + investi total en ligne pointillée. |

---

## 6. Design

- Solde et mouvements positifs en vert (`--positive`), retraits en rouge (`--negative`).
- Alerte de dépassement : bandeau rouge `--negative` avec icône ⚠.
- Pédagogie du rendement réel : bandeau ambre `--warning` avec chiffres verts/rouges.
- Épargne en bleu `--info` (aire + trait), actions en vert `--positive`, investi en bleu
  pointillé — empilement du plus stable (bas) au plus volatile (haut), extensible aux
  crypto/fonds euros plus tard.

---

## 7. Hors périmètre V1

- Exécution automatique des versements DCA (planification uniquement).
- LDDS, LEP, fonds euros / assurance-vie (le modèle `EnvelopeDeposit` + taux/inflation est
  extensible).
- Révision automatique semestrielle du taux (constante à mettre à jour ; le taux de
  l'enveloppe reste modifiable manuellement).
- Historique des taux passés (le calcul applique le taux courant sur tout l'historique).
