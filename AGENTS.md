<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:i18n-rules -->
## i18n — traductions

- Toute chaîne visible de l'UI passe par le système i18n (`src/i18n/`) : dictionnaires externes `src/i18n/dictionaries/fr.json` et `src/i18n/dictionaries/en.json`.
- **À chaque modification de l'UI** : mettre à jour `fr.json` ET `en.json` dans le même commit, en gardant les deux fichiers structurellement identiques (mêmes clés). `Dictionary` est typé depuis `fr.json` — une clé manquante casse le build.
- Composants serveur : `getLocaleFromCookies().then(getDictionary)` (voir `src/app/(app)/envelopes/page.tsx` comme exemple). Composants client : `const { t } = useI18n()` depuis `@/i18n/provider`.
- Interpolation simple par `replace("{clé}", valeur)` ; pluriels via un placeholder `{s}`.
- Ne jamais laisser du texte français en dur dans un composant ; si une chaîne est ajoutée, elle doit exister dans les deux dictionnaires.
<!-- END:i18n-rules -->

<!-- BEGIN:remote-sources-rules -->
## Sources distantes — règles de récupération de données

Toute récupération de données distantes passe par `src/lib/market/quotes.ts` ou un module dédié dans `src/lib/` ; jamais de fetch direct dans un composant ou une page. Règles à respecter pour toute nouvelle source ou modification :

- **Timeout** : chaque requête part avec `AbortSignal.timeout(8000)` (constante `FETCH_TIMEOUT_MS` dans `quotes.ts`). Pas de requête sans timeout.
- **Nombre de requêtes** : un seul essai par hôte, avec bascule `query1` → `query2` uniquement sur échec réseau (pas sur 429). Pour les traitements en masse (cron `src/app/api/cron/refresh/route.ts`), espacer les requêtes d'au moins 1 s et respecter un cooldown de 5 min par enveloppe — ne jamais rattraper un 429 en relançant immédiatement.
- **Rate limits Yahoo (429)** : Yahoo Finance est une API ouverte sans clé. Envoyer uniquement un User-Agent navigateur et `Accept: application/json` — pas de cookie (un cookie sans crumb déclenche 429). Sur 429, afficher le message d'erreur à l'utilisateur et attendre quelques minutes ; ne pas réessayer en boucle.
- **Résolution de symbole** : passer par le catalogue local (`src/lib/etf-catalog.ts`, `yahooSymbol` par ISIN/ticker) avant toute recherche distante ; cache de résolution en mémoire, TTL 24 h (`RESOLUTION_TTL_MS`). Ne pas multiplier les requêtes de recherche quand le catalogue sait répondre.
- **Sources de référence (données statiques)** : les fiches ETF/actions viennent de CSV fournis (`data/etfDetail.csv`, `data/actionDetail.csv`) — pas de scraping justETF/émetteur dans le runtime ; ces fichiers sont mis à jour manuellement ou par un futur enrichissement hors-ligne. Les répartitions (pays, secteurs, holdings) du fichier font foi.
- **Échec gracieux** : toute erreur distante retourne `{ ok: false, reason }` et l'UI affiche la raison sans casser la page ; jamais d'exception non capturée vers l'utilisateur.
- **Caching** : favoriser le cache serveur (`cache()` de React, voir `src/server/analysis.ts`) et les caches mémoire avec TTL plutôt que de re-demander la même ressource.
<!-- END:remote-sources-rules -->
