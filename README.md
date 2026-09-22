# CompoundWealth

Webapp moderne de suivi de portefeuille d'investissement long terme — visualisez la croissance de votre patrimoine, enveloppe par enveloppe (PEA, CTO), et laissez les intérêts composés travailler.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4** — design tokens de la [charte graphique](docs/design/UI_CHARTER.md)
- **Prisma + SQLite** (migration Postgres possible)
- **Auth locale** : Argon2id + session JWT (jose) en cookie httpOnly
- **Recharts** pour le graphique d'évolution
- **Tests** : Vitest + Testing Library

## Démarrage

```bash
pnpm install
cp .env.example .env          # puis définissez un SESSION_SECRET fort
pnpm prisma db push           # crée/migre la base SQLite et régénère le client Prisma
pnpm dev                      # http://localhost:3000
```

Après chaque `git pull` qui modifie `prisma/schema.prisma`, relancez :

```bash
pnpm prisma db push
pnpm dev  # ou supprimez .next si le serveur dev était déjà lancé
```

## Commandes

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` / `pnpm start` | Build et serveur de production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript strict |
| `pnpm test` / `pnpm test:run` | Vitest (watch / une fois) |
| `pnpm db:push` | Synchronise le schéma Prisma avec la base |

## Documentation

| Document | Contenu |
|---|---|
| [Plan de projet](docs/PLAN.md) | Vision, périmètre, stack, architecture, jalons |
| [Fonctionnalité MVP](docs/features/MVP.md) | Récits utilisateurs, modèle de données, règles métier |
| [Guide d'utilisation](docs/design/USAGE_GUIDE.md) | Parcours utilisateur de bout en bout |
| [Charte graphique](docs/design/UI_CHARTER.md) | Palette (noir + corail), typographie, composants |
| [Enveloppes PEA & CTO](docs/guides/enveloppes-fiscalite.md) | Conditions et fiscalité (LFSS 2026) |

## Structure

```
src/
├── app/            # routes Next.js (App Router)
│   ├── (auth)/     # inscription, connexion
│   ├── (app)/      # dashboard, enveloppes, réglages (session requise)
│   └── page.tsx    # page d'accueil
├── components/     # UI + composants métier
├── lib/            # domaine : money, fiscalité, séries, validation (testé unitairement)
└── server/         # Prisma, session, actions serveur, requêtes
```

## Licence

À définir.
