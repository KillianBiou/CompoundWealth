# Charte graphique — CompoundWealth

**Statut** : Référence
**Application** : webapp, desktop-first avec adaptation mobile
**Dernière mise à jour** : 2026-09-22

---

## 1. Principes

Inspirée des trackers modernes les mieux notés (Finary, Kubera, Snowball Analytics, Capitally, Robinhood) — **sans copier leurs couleurs** (Finary : bleu/orange ; Robinhood : vert ; Kubera : orange ; Delta : violet). CompoundWealth adopte une identité propre :

1. **Noir profond + une teinte d'accent unique** : le noir structure et apaise, l'accent signe la marque.
2. **Dark mode par défaut** : les interfaces de données financières gagnent en lisibilité sur fond sombre (moins de fatigue oculaire, chiffres mis en valeur). Un mode clair est fourni.
3. **L'accent est rare** : réservé aux actions primaires, aux valeurs positives et au logo. Tout le reste est neutre. Un chiffre important se détache par sa taille, pas par sa couleur.
4. **Lumière du texte, pas des couleurs criardes** : les montants sont en blanc pur, les libellés en gris, l'accent en sous-rôle.

> Conformité au brief : « modernes et clair » = clarté de hiérarchie, pas de thèmes pastel. Le noir donne l'assise, l'accent donne le signe.

## 2. Palette

### Teinte d'accent : Corail énergique (signature CompoundWealth)

Un rouge-orangé chaud — la connotation de croissance et la chaleur du « compound interest », distinct des concurrents. Choix : **corail** (#FF5A5F ~ #F87171).

```
ACCENT (signature):
  --accent-500: #E84545    /* corail vif : actions primaires, gains */
  --accent-600: #C73E3E    /* hover */
  --accent-700: #A83232    /* pressed */
  --accent-100: #FFD9D9    /* fond de badge accent, dark mode */
```

> Le rouge a l'inconvénient classique d'être la couleur des pertes en finance. **Décision** : sur les graphiques et variations, le vert reste la convention « gain », le rouge la convention « perte » (attentes utilisateur fortes). Le **corail de marque** n'est utilisé que pour l'identité (boutons, logo, focus), jamais pour signifier une variation. Voir §5 Sémantique.

### Noirs et neutres (dark par défaut)

```
SURFACES:
  --bg:            #0D0F12   /* fond principal, noir bleuté profond */
  --bg-elevated:   #14171C   /* cartes */
  --bg-subtle:     #1C2027   /* surfaces secondaires, inputs */
  --border:        #262B33   /* bordures discrètes */

TEXTE:
  --text-primary:  #F4F6F8   /* titres, montants */
  --text-secondary:#9BA3AF  /* libellés, dates */
  --text-muted:    #5C6470   /* placeholders, aide */

SÉMANTIQUE (data viz & variations):
  --positive:      #34C77B   /* gains, hausses — vert */
  --negative:      #E84545   /* pertes, baisses — corail (réutilisé) */
  --warning:       #E8A33D   /* alertes fiscales */
  --info:          #4C9AFF   /* informations neutres */
```

### Mode clair

```
  --bg:            #F7F8FA
  --bg-elevated:   #FFFFFF
  --bg-subtle:     #EEF0F3
  --border:        #DFE3E8
  --text-primary:  #14171C
  --text-secondary:#5C6470
  --text-muted:    #9BA3AF
  --accent-500:    #D93838   /* corail légèrement assombri pour contraste AA */
```

Contrastes : tout couple texte/fond respecte **WCAG AA** (≥ 4.5:1 pour le texte courant, ≥ 3:1 pour le grand texte).

## 3. Typographie

- **Titres** : `Space Grotesk` — géométrique moderne, « fintech ».
- **Corps / chiffres** : `Inter`, avec **tabular-nums** activé pour tous les montants (alignement vertical parfait dans les tableaux).
- Hiérarchie :

| Niveau | Taille / poids |
|---|---|
| H1 (montant phare du dashboard) | 32–40 px / 600 |
| H2 (titres de section) | 20–24 px / 600 |
| Corps | 14–16 px / 400 |
| Métadonnées, libellés KPI | 12–13 px / 500, `--text-secondary` |

- Les symboles monétaires et unités (%, €) sont en `--text-secondary`, plus petits que le chiffre (ex. **12 345,67 €**).

## 4. Espacement, rayons, ombres

- **Grille de 4 px** : espacements 4/8/12/16/24/32/48.
- **Rayons** : 8 px (cartes), 999 px (badges, chips). Pas de rayons nuls — l'app reste douce.
- **Ombres** : très discrètes en dark (`0 1px 0 rgba(255,255,255,.04) inset` + halo léger) ; les cartes se distinguent surtout par `--bg-elevated` sur `--bg`.
- **Bordures** : 1px `--border` systématique sur les cartes — c'est le séparateur principal en dark.

## 5. Sémantique des couleurs (règles strictes)

| Contexte | Couleur |
|---|---|
| Bouton principal (CTA) | `--accent-500` corail, texte blanc |
| Gain / hausse / positive | `--positive` vert |
| Perte / baisse / négative | `--negative` corail-rouge |
| Badge fiscal PEA (exonération) | `--positive` en fond translucide (10 %) |
| Badge fiscal CTO / flat tax | `--warning` translucide |
| Focus clavier | contour 2px `--accent-500`, offset 2px |
| Erreur de formulaire | `--negative` + message texte explicite (jamais la couleur seule) |
| Montant d'argent engagé / investi (DCA, positions) | `--positive` vert, `font-semibold`, `tabular-nums` |
| Montant engagé non investi (reliquat parts entières) | `--warning` ambre |
| Échéance à venir (compte à rebours DCA) | `--accent-500` corail, texte 12px sous la date |

Le corail joue donc un double rôle maîtrisé : **identité** (CTA, focus) et **sémantique de perte** (variations), sans conflit car jamais sur les mêmes éléments.

## 6. Composants clés

- **Carte enveloppe** : `--bg-elevated`, bordure, rayon 8, padding 24 ; titre + badge type (PEA/CTO), montant en H2 tabulaire, mini-sparkline.
- **KPI** : libellé 13px secondaire au-dessus, valeur 28–32px primaire, variation en dessous avec flèche ↗/↘ colorée.
- **Graphique d'évolution** : courbe 2px, dégradé vertical subtil sous la courbe (accent 12 % → transparent), ligne pointillée horizontale pour le « total investi », tooltip sombre au survol. Axe Y en k€/M€ abrégé.
- **Formulaire** : labels au-dessus, un champ par ligne mobile, deux colonnes desktop ; erreurs en dessous du champ ; bouton principal en bas-droite, action destructive à gauche en `--negative` outline.
- **Section DCA** : en-tête de table sur fond `--bg-subtle/50` avec bordure basse 2px, lignes séparées par 1px et hover `--bg-subtle/30`. Récapitulatif « Engagé sur X mois » : bloc bordé `--positive/25` fond `--positive/5`, montant en H3 vert. Sélecteur de période en tabs segmentés ; répartition par position en barres horizontales / anneau / treemap (palette catégorielle 8 teintes), légende en chips ticker + montant compact.
- **Badges fiscaux** : chips translucides avec texte court (« Exonéré IR après 5 ans », « Flat tax 31,4 % ») — cliquables vers l'explication.

## 7. Iconographie & illustrations

- Icônes : **Lucide** (trait 1.5–2px, 20px), stroke `--text-secondary`, jamais colorées sauf signification sémantique.
- Logo : monogramme **CW** en corail sur pastille `--bg-elevated`, ou wordmark « CompoundWealth » en Space Grotesk 600 avec le « W » en corail.
- Pas d'illustrations photographiques : data-first.

## 8. Layout

- **Desktop** : sidebar gauche (240px) — logo, navigation (Dashboard, Enveloppes, Réglages) ; contenu max 1200px centré.
- **Mobile** : navigation bottom bar 56px, montants phares plein largeur, cartes empilées.
- Densité : maximum 2 niveaux d'information par carte ; les tableaux de positions sont des listes de cartes sur mobile, table sur desktop.

## 9. Motion

- Transitions 150–250 ms, `ease-out` ; hover sur cartes = élévation de bordure (accent 25 %), pas de scale.
- Graphiques : apparition de la courbe en 400 ms (dessin progressif), pas de loop.
- Respect de `prefers-reduced-motion`.

## 10. Accessibilité

- Contrastes AA partout (§2).
- État des champs non dépendant de la couleur seule (icône + texte).
- Navigation clavier complète, focus visible (§5).
- `aria-label` sur tous les graphiques avec résumé textuel des données.

## 11. Tokens d'implémentation

Les variables de ce document sont la source de vérité pour `src/app/globals.css` (Tailwind CSS v4, `@theme`). Tout composant consomme les tokens, jamais de valeur hex brute. Le mode clair bascule via `data-theme="light"` sur `<html>` et l'ajustement des variables CSS.

## 12. Interdits (anti-patterns)

- Rouge corail pour un montant en gain, vert pour une perte (inversion sémantique).
- Dégradés criards, glassmorphism, néons.
- Plus de 2 niveaux d'élévation de surface.
- Couleur de marque comme fond de section entière (elle perd sa rareté).
- Copie des codes couleurs exacts de Finary/Kubera/Robinhood (plagiat visuel).
