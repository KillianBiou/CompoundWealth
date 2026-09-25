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
