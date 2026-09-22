# CompoundWealth — Plan de projet

**Statut** : Actif
**Dernière mise à jour** : 2026-09-22
**Produit** : Webapp de suivi de portefeuille d'investissement long terme

---

## 1. Vision

CompoundWealth est une webapp moderne et claire de suivi de portefeuille, inspirée des meilleurs trackers du marché (Finary, Kubera, Sharesight, Snowball Analytics, Capitally), mais centrée sur **l'investissement long terme et les intérêts composés** — pas sur le trading. L'utilisateur visualise la croissance de son patrimoine investi, enveloppe par enveloppe, sans complexité inutile.

Voir : [docs/features/MVP.md](features/MVP.md), [docs/design/UI_CHARTER.md](design/UI_CHARTER.md).

## 2. Périmètre de la V1

1. **Compte utilisateur** : création simple (email + mot de passe), profil optionnel (âge, nom, travail, salaire).
2. **Enveloppes / types d'actifs** : pour cette version, **PEA** et **CTO** (fiscalité et conditions intégrées — voir [docs/guides/enveloppes-fiscalite.md](guides/enveloppes-fiscalite.md)).
3. **Positions** : ajout de positions (ETF, actions, ...) avec montant investi, au sein d'une enveloppe.
4. **Graphique d'évolution** : courbe de la valeur d'une enveloppe dans le temps.

### Hors périmètre V1 (inventaire, pas de décision)

Multi-comptes/foyers, agrégation bancaire automatique, crypto/immobilisé/assurance-vie, dividendes détaillés, devise autre qu'EUR, rapports fiscaux, mode hors-ligne, application mobile native.

## 3. Stack technique

| Couche | Choix | Justification |
|---|---|---|
| Framework | **Next.js (App Router) + React + TypeScript** | Framework « un peu plus lourd » demandé, SSR, routing, écosystème, conventions fortes, structure outillée pour une app évolutive |
| Style | **Tailwind CSS v4** + CSS variables pour le thème | Démarrage rapide, design tokens natifs, dark mode par défaut |
| Composants | **shadcn/ui** | Composants accessibles, personnalisables, cohérents avec la charte |
| Graphiques | **Recharts** | Simple, déclaratif, adapté aux courbes temps vs valeur |
| Formulaires | **React Hook Form + Zod** | Validation de schémas (montants, dates), erreurs propres |
| État serveur | **TanStack Query** | Cache, revalidation, séparation données/UI |
| Base de données | **SQLite + Prisma** (option backend : Postgres via Neon/Supabase) | Démarre local sans infra, migration Postgres simple si multi-utilisateur |
| Tests | **Vitest** (unitaires) + **Testing Library** (composants) + **Playwright** (E2E) | Environnement de test complet demandé |
| Qualité | **ESLint + Prettier + tsc strict** | Garde-fous dès le premier commit |
| CI | GitHub Actions (lint + typecheck + tests à chaque push) | Boucle de feedback rapide |

## 4. Architecture cible

```
compoundwealth/
├── src/
│   ├── app/                  # routes Next.js (App Router)
│   │   ├── (auth)/           # connexion, inscription
│   │   ├── (app)/dashboard/  # tableau de bord
│   │   ├── (app)/envelopes/  # liste + détail enveloppe
│   │   └── (app)/settings/   # profil
│   ├── components/           # UI (shadcn + composants métier)
│   │   └── ui/               # composants primitifs (design system)
│   ├── lib/                  # domaine : calculs, formats, fiscalité
│   │   ├── domain/           # types Portfolio, Position, Envelope
│   │   └── taxes/            # constantes PEA/CTO (plafonds, taux)
│   ├── server/               # actions serveur, accès Prisma
│   └── test/                 # setup et helpers de tests
├── prisma/schema.prisma
├── e2e/                      # tests Playwright
└── docs/
```

Décisions d'architecture :
- Le domaine (types, calculs, fiscalité) vit dans `src/lib` **sans dépendance à React** : testable unitairement.
- Toute la fiscalité est **constante de configuration** (`src/lib/taxes`), jamais codée en dur dans les composants. Les taux évoluent chaque année (ex. LFSS 2026).
- Une page = un segment de route, un composant de page mince qui délègue à des composants métier testés.
- Auth locale V1 (email/mot de passe, session httpOnly) ; design prêt pour un provider OAuth ultérieur.

## 5. Jalons

| # | Jalon | Contenu | Critère de sortie |
|---|---|---|---|
| M0 | Socle | Repo, Next.js, Tailwind, tokens de la charte, ESLint/Prettier/CI, Vitest qui tourne | `pnpm lint && pnpm test` verts sur un test de fumée |
| M1 | Compte | Inscription, connexion, session, profil optionnel | E2E Playwright : créer un compte, se connecter, compléter le profil |
| M2 | Enveloppes | CRUD PEA/CTO avec attribution des conditions (plafonds, date d'ouverture, fiscalité) | Tests unitaires des règles PEA/CTO + E2E création |
| M3 | Positions | Ajout/édition/suppression de positions (nom, catégorie, montant, date), liste par enveloppe | Tests unitaires de validation Zod + E2E |
| M4 | Valorisation & graphique | Saisie de valorisations périodiques, courbe d'évolution par enveloppe (Recharts) | Snapshot visuel + tests du calcul de série |
| M5 | Dashboard | Vue d'ensemble : total, par enveloppe, variation, mini-graphes | E2E dashboard avec données de démo |

## 6. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Données financières fausses | Fort (confiance) | Validation stricte, montants en centimes (entiers), tests des calculs |
| Complexité du « plus lourd » | Perte de focus MVP | Jalons courts, chacune livrable ; pas d'abstraction spéculative |
| Évolution des taux fiscaux | Contenu périmé | Constantes de config + mention de la source/année dans le doc fiscalité |
| Graphiques coûteux en perf | UI lente | Agrégation côté serveur, échantillonnage des séries longues |

## 7. Contributions

- Commits conventionnels (feat/fix/docs/chore), une préoccupation par commit.
- Toute fonctionnalité doit être couverte par au moins un test (unitaire ou E2E).
- Les décisions de produit sont consignées dans `docs/` avant implémentation.
