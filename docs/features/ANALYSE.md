# Onglet Analyse — Spécification fonctionnelle

Vision en **panels** : une grille de cartes résumé. Au clic sur une carte, un **panneau latéral droit (Sheet/Drawer)** s'ouvre avec l'analyse détaillée. Le panel se ferme via X, Échap ou clic hors zone. L'état `panelOuvert` est dans l'URL (`?scanner=frais`) pour un lien partageable et un retour arrière natif.

**Layout Next.js :** `app/analyse/page.tsx` rend la grille de `<ScannerCard>` (composants serveur, résumé calculé côté serveur). Chaque carte est un `<Link href="?scanner=frais">`. `app/analyse/[scanner]/panel.tsx` (route Intercepting Route + parallel route) affiche le détail dans un Drawer client. Fallback natif : `/analyse/frais` en pleine page pour le SEO/refresh.

---

## 1. Scanner de frais

**But.** Révéler le coût total de détention de chaque ligne du patrimoine et projeter son impact long terme. Les frais sont le premier facteur contrôlable de performance. competition documente un manque à gagner moyen de ~75 349 € sur 30 ans pour 100 k€ à 2 % de frais ([source](https://competition.com/fr/actualites-produit/fee-scanner-optimiser-ses-frais)).

**Résumé (carte).**
- KPI : « Frais annuels totaux : 214 € (0,31 % du patrimoine) »
- Badge vert (< 0,5 %) / orange (0,5-1 %) / rouge (> 1 %)
- Mini-barre : répartition des frais par enveloppe
- Texte : « Impact estimé sur 20 ans : −4 830 € »

**Panel détaillé.**
1. **Table par ligne** : nom, ISIN, enveloppe, TER/frais de gestion, frais d'enveloppe (custody), frais de transaction cumulés (issus de la colonne `fee` de l'export TR), coût annuel € = (TER + frais enveloppe) × valeur ligne.
2. **Projection du manque à gagner** : graphique 10/20/30 ans, courbe « avec tes frais » vs « à 0,15 % », capital final différé.
3. **Recommandations** : alternatives ETF même indice, TER inférieur (ex. LU1681045370 Amundi EM 0,20 % vs concurrents 0,30 %+), avec économie projetée.
4. **Limites affichées** : « Frais d'entrée SCPI et certains frais d'assurance-vie ne sont pas modélisés » (même limite que competition, [source](https://help.competition.com/fr/articles/6521721-comprendre-les-frais-caches)).

**User stories.**
- *En tant qu'investisseur, je veux voir le coût annuel réel de chaque ligne afin d'identifier les valeurs trop chères.*
- *En tant qu'investisseur, je veux une projection du manque à gagner sur 20-30 ans afin de mesurer l'enjeu réel des frais.*
- *En tant qu'investisseur PEA/CTO, je veux les frais de transaction réels issus de mon export Trade Republic afin d'avoir un coût complet, pas seulement le TER.*

**Logique de calcul.** Pour chaque position : `coutAnnuel = valeur × (TER + fraisEnveloppe)`. Frais de transaction = somme des `-fee` de l'export pour cette valeur (amortis sur la durée de détention). TER source : à enrichir par ISIN (justETF/extraETF scraping ou saisie manuelle).

---

## 2. Scanner de revenus passifs

**But.** Centraliser et projeter les revenus (dividendes, distributions, intérêts, loyers) dispersés entre enveloppes. competition couvre ~20 000 titres et projette sur 12 mois ([source](https://competition.com/fr/actualites-produit/suivez-vos-dividendes)).

**Résumé (carte).**
- KPI : « Revenus passifs 12 derniers mois : 237 € » + projection 12 prochains mois
- Badge de régularité (mensuel/trimestriel)
- Mini-graphique barres par mois

**Panel détaillé.**
1. **Calendrier 12 mois** : barres mensuelles glissantes, drapeaux par source (NVIDIA trimestriel, intérêts TR mensuels).
2. **Table par source** : valeur, type (action/ETF Dist/interest), montant par versement, fréquence, yield sur capital investi (ex. NVIDIA : 0,44 € net en juin, [données export]).
3. **Yield global pondéré** du portefeuille : Σ(revenu estimé) / Σ(valeur), cash uniquement.
4. **Positions sans dividende en cash** : les ETF capitalisants (Acc — dividende réinvesti dans le cours) et les valeurs ne versant aucun dividende sont explicitement listés à part, hors compteur de revenus.
5. **Historique** : cumul annuel par année fiscale.
6. **Taux de couverture** : revenus passifs / dépenses mensuelles moyennes (lien avec scanner d'abonnements).

**User stories.**
- *En tant qu'investisseur, je veux un calendrier des versements à venir afin d'anticiper ma trésorerie.*
- *En tant qu'investisseur, je veux connaître la fréquence et la date estimée du prochain versement de chaque ligne payante.*
- *En tant qu'utilisateur, je veux le taux de couverture de mes dépenses afin de mesurer ma progression vers l'indépendance financière.*

**Logique.** Seules les positions versant des dividendes **en cash** sont listées : ETF distribuants (`distributing=true` du fichier `data/etfDetail.csv`, projection = valeur × `dividend_yield_2025`) et actions payantes (`dividend_yield` du fichier `data/actionDetail.csv`). Revenus cash depuis l'export (`DIVIDEND`, `INTEREST_PAYMENT`), conversion devise via `original_amount`/`fx_rate`. Fréquence et calendrier : mois réels des versements de l'historique, sinon cycle trimestriel usuel des actions US (mars/juin/septembre/décembre) ; le prochain versement en est déduit avec son montant estimé. Les ETF capitalisants ne versent rien en cash : leurs dividendes sont réinvestis dans le cours et suivis par la performance, pas par ce scanner.

---

## 3. Scanner de diversification sectorielle

**But.** Révéler la concentration sectorielle réelle, y compris **au travers des ETF** (look-through). competition fournit un score de diversification à partir de l'allocation réelle ([source](https://competition.com/fr/insights/diversification)).

**Résumé (carte).**
- KPI : « Score de diversification : 6/10 »
- Top secteur : « Technologie 34 % »
- Treemap ou barres des 5 premiers secteurs

**Panel détaillé.**
1. **Répartition sectorielle réelle** : barres horizontales par secteur GICS, avec décomposition de chaque barre par ligne (ETF/stock).
2. **Look-through ETF** : table « MSCI World 63 % de ton patrimoine → détail : Tech 24 %, Finance 15 %... ». Source : holdings des ETF via API (fiches justETF ou DICI émetteur).
3. **Alertes concentration** : « Technologie 38 % (> 30 % recommandé), dont 12 % via Europe Info Tech + contribution MSCI World » ; « Défense 9 % — secteur thématique, volatilité élevée ».
4. **Comparaison avec un benchmark** (ex. MSCI World All-Caps) : écart par secteur, sur/sous-exposition.
5. **Score** : pénalités par concentration (Herfindahl index ou règle simple : max 30 % par secteur, 10 % par ligne unique).

**User stories.**
- *En tant qu'investisseur en ETF, je veux voir la répartition sectorielle sous-jacente de mes ETF afin de mesurer ma vraie exposition Tech (souvent 40 %+ avec World + S&P 500 + ESIT cumulés).*
- *En tant qu'investisseur, je veux être alerté quand un secteur dépasse un seuil afin de décider d'un rééquilibrage.*

**Logique.** Nécessite une table `Secteur` par valeur + holdings ETF (top 10 suffisent, ou réplication par index de référence). Méthode identique à competition : répartition par sous-jacent des ETF ([source](https://community.competition.com/t/diversification-geographique-sectorielle-etf-par-sous-jacent/13892)).

---

## 4. Scanner de diversification géographique

**But.** Même principe, par pays/région. Un portefeuille 90 % US n'est pas diversifié même avec 10 ETF différents ([source](https://competition.com/fr/actualites-produit/la-diversification-une-strategie-cle-doptimisation-de-portefeuille)).

**Résumé (carte).**
- KPI : « Score géographique : 5/10 »
- Top : « 🌎 Amérique du Nord 58 % » (zone continentale)
- Carte du monde choroplèthe ou barres par zone

**Panel détaillé.**
0. **Sélecteur de granularité** : vue **Zones** (continents/régions — Amérique du Nord, Amérique latine, Europe, Asie de l'Est développée, Asie émergente, Afrique & Moyen-Orient, Océanie), vue **Pays** (chaque pays ≥ 1 % du portefeuille, les petits pays et l'entrée « Other » des fonds étant regroupés en « Autres pays ») ou vue **Économie** (classification MSCI des marchés : développés — MSCI World, 23 pays ; émergents — Chine, Inde, Taïwan, Corée du Sud, Brésil... ; frontières — Vietnam, Slovénie, Maroc, Kenya... ; l'entrée « Other » des fonds est écartée, sans catégorie MSCI).
1. **Répartition par pays** avec look-through ETF (ex. MSCI France → 60 % Total/LVMH/BNP...).
2. **Exposition devise** : USD/GBP/JPY... (proche mais distincte : un ETF World EUR a ~70 % de risque USD). Croisé avec la fiscalité retenue à la source (W-15 % sur dividendes US).
3. **Alertes** : « 58 % US, dont risque de change significatif » ; « 0 % obligations » ; « 0 % immobilier » (hors Private Equity).
4. **Écarts vs benchmark** MSCI ACWI : sous-exposition EM si LU1681045370 = 6 % du total.
5. **Score** : combinaison concentration pays max + nombre de régions couvertes.

**User stories.**
- *En tant qu'investisseur, je veux connaître mon exposition réelle par pays, ETF dépliés, afin d'éviter une concentration cachée US/tech (le duo World + S&P 500 double l'exposition Apple/Microsoft).*
- *En tant qu'investisseur, je veux connaître mon exposition devise afin de comprendre mon risque de change.*

---

## 5. Scanner d'abonnements

**But.** Détecter les paiements récurrents qui grignotent le budget. competition analyse 6 mois de transactions et exige au moins 3 occurrences pour valider une récurrence ([source](https://help.competition.com/fr/articles/10279144-utiliser-le-scanner-de-depenses)).

**Résumé (carte).**
- KPI : « 7 abonnements — 78 €/mois »
- Badge : « +2 nouveaux ce trimestre »
- Mini-liste des 3 plus chers

**Panel détaillé.**
1. **Liste des abonnements** : marchand, montant, fréquence, dernière occurrence, catégorie (jeux : Steam/Instant Gaming/Blizzard/Pixiv ; SaaS : Mistral, Patreon ; utilities : SFR). Basé sur les `CARD_TRANSACTION` de l'export : MCC 5816 (digital), 5815 (Patreon), 5734 (logiciel), 4814 (télécom).
2. **Actions par ligne** : exclure de l'analyse, renommer (fonctions présentes chez competition), comparer à l'usage (« 9 achats Steam en 2026 »).
3. **Coût annualisé** : « Steam : 214 €/an ».
4. **Graphique** : coût mensuel total par catégorie.
5. **Détection** : regroupement par `mcc_code` + normalisation du libellé (plusieurs alias pour un même marchand : "STEAMGAMES.COM", "STEAM PURCHASE", "WL *STEAM PURCHASE" → un seul abonnement/consommateur récurrent). Seuil : ≥ 3 occurrences sur 6 mois, intervalle régulier ±15 % (cf. règle competition des 3 transactions).

**User stories.**
- *En tant qu'utilisateur, je veux la liste consolidée de mes abonnements et dépenses récurrentes afin d'identifier ceux que je n'utilise plus.*
- *En tant qu'utilisateur, je veux le coût annualisé de chaque abonnement afin de décider objectivement d'une résiliation.*
- *En tant qu'utilisateur, je veux fusionner les alias d'un même marchand afin d'éviter les doublons dans l'analyse.*

---

## 6. Simulateur de patrimoine

**But.** Projeter le patrimoine futur et les revenus passifs générables. Approche similaire au simulateur competition : patrimoine actuel, épargne annuelle, horizon, rendements attendus, fiscalité, puis revenu passif via le taux de retrait ([source](https://competition.com/en/simulateur-de-patrimoine)).

**Résumé (carte).**
- KPI : « Patrimoine projeté dans 20 ans : 189 000 € »
- « Indépendance financière (règle 4 %) atteinte en : 2041 »
- Sparkline de la projection

**Panel détaillé.**
1. **Paramètres (sliders)** : épargne mensuelle (défaut : déduit du flux réel de l'export, ex. ~1 150 €/mois versé en 2026), rendement attendu (5 % défaut), inflation (2 %), horizon (10/20/30 ans), taux de retrait (4 %), fiscalité (PFU 31,4 % / PEA PS 17,2 % après 5 ans).
2. **Graphique** : courbe patrimoine nominal vs réel (déflaté), bornes pessimiste/réaliste/optimiste (rendement 3/5/8 %).
3. ** jalonnements calculés** :
   - « Capital = 25 × dépenses annuelles » (indépendance à 4 %)
   - « Capital = 100 k€ », « 500 k€ », « 1 M€ » — dates prévisionnelles
4. **Phase de retrait** : prolonger la courbe après l'horizon d'épargne avec retraits au taux choisi (demande récurrente des utilisateurs competition, [source](https://community.competition.com/t/simulateur-de-patrimoine/30124)) — dont le coussin cash et les retraits flexibles (plancher/plafond) comme discuté pour la règle des 4 % en crise.
5. **Sensibilité** : table du capital final selon rendement × épargne.
6. **Données réelles** : part défaut du patrimoine actuel (PEA + CTO + cash + Private Equity), épargne mensuelle moyenne glissante 12 mois issue de l'export.

**User stories.**
- *En tant qu'utilisateur, je veux projeter mon patrimoine avec mes vraies données d'épargne afin d'avoir une trajectoire personnelle, pas une simulation générique.*
- *En tant qu'utilisateur, je veux connaître la date d'atteinte de mon indépendance financière (règle 4 %, ajustable 3-4 %) afin d'avoir un objectif concret.*
- *En tant qu'utilisateur, je veux voir la phase de retrait après l'accumulation afin de vérifier que mon plan tient, y compris en scénario de crise (−40 %).*

---

## Points communs UX

| Élément | Composant | Détail panel |
|---|---|---|
| KPI principal | StatCard large + badge vert/orange | Table détaillée + graphique + recommandations |
| Données | Résumé pré-calculé serveur | Drill-down par ligne, export CSV possible |
| Actions | Clic carte → panel | Exclusions, renommage, édition de paramètres |
| Erreurs | « Données insuffisantes » si < 3 mois d'historique | Choix par défaut, pas de blocage |

## Données manquantes à enrichir par ISIN (via Yahoo/OpenFIGI)

`TER` (frais), `secteur`, `pays/zone`, `yield` (dividende), `holdings ETF` (pour le look-through). Ces 5 champs conditionnent les scanners 1, 2, 3 et 4. Le scanner 5 n'utilise que l'export TR ; le simulateur utilise tout + des hypothèses.

## Sources

| Source | Fiabilité | Dernière mise à jour |
|---|---|---|
| [competition — Scanner de frais](https://competition.com/fr/insights/fees-scanner) | 4/5 | - |
| [competition — Frais assurance-vie (annonce produit)](https://competition.com/fr/actualites-produit/fee-scanner-optimiser-ses-frais) | 4/5 | - |
| [Centre d'aide competition — Frais cachés](https://help.competition.com/fr/articles/6521721-comprendre-les-frais-caches) | 5/5 | ~3 semaines |
| [Centre d'aide competition — Suivi des dividendes](https://help.competition.com/fr/articles/7973821-suivre-ses-dividendes) | 5/5 | - |
| [competition — Suivi des dividendes (annonce)](https://competition.com/fr/actualites-produit/suivez-vos-dividendes) | 4/5 | - |
| [competition — Diversification](https://competition.com/fr/insights/diversification) | 4/5 | - |
| [Centre d'aide competition — Scanner de dépenses](https://help.competition.com/fr/articles/10279144-utiliser-le-scanner-de-depenses) | 5/5 | - |
| [competition — Simulateur de patrimoine](https://competition.com/en/simulateur-de-patrimoine) | 4/5 | - |
| [Forum competition — Diversification ETF sous-jacent](https://community.competition.com/t/diversification-geographique-sectorielle-etf-par-sous-jacent/13892) | 3/5 | - |
| [Forum competition — Prolonger simulateur après épargne](https://community.competition.com/t/simulateur-de-patrimoine/30124) | 3/5 | - |
| [Avis competition 2026](https://outilsinvestisseur.fr/competition-avis/) | 3/5 | 2026 |
| [Avis competition 2026 (epargnoo)](https://epargnoo.com/epargnews/articles/avis-competition) | 3/5 | 2026 |