# Guide d'utilisation — CompoundWealth V1

> Public : l'utilisateur final. Ce document décrit le parcours idéal, écran par écran.

---

## 1. Premiers pas

### Créer son compte (30 secondes)

1. Ouvrir CompoundWealth → page d'accueil : titre « Suivez votre patrimoine, laissez les intérêts composés travailler », bouton **Créer mon compte**.
2. Renseigner : **email** + **mot de passe** (8 caractères minimum). C'est tout — aucune autre information n'est demandée.
3. Atterrissage sur un **dashboard vide** avec le message « Bienvenue. Créez votre première enveloppe pour commencer » et un bouton **+ Nouvelle enveloppe**.

> Confidentialité : aucune donnée bancaire n'est demandée. Tout est saisi manuellement, rien n'est synchronisé.

### Compléter son profil (optionnel)

Réglages → Profil. Champs tous facultatifs :

| Champ | Exemple | Utilité future |
|---|---|---|
| Nom | Camille | Personnalisation |
| Âge | 32 | Horizon de placement, projections |
| Travail | Ingénieure | Contexte |
| Salaire mensuel net | 2 800 € | Taux d'épargne |

Chaque champ peut être renseigné séparément et modifié ou effacé à tout moment.

## 2. Enveloppes — organiser par cadre fiscal

### Choisir son enveloppe : PEA ou CTO ?

| | **PEA** | **CTO** |
|---|---|---|
| Univers d'investissement | Actions/ETF éligibles (UE, ETF actions européens) | Illimité (actions mondiales, obligations, ETF non éligibles PEA...) |
| Plafond de versements | 150 000 € | Aucun |
| Fiscalité après 5 ans | Exonération d'IR, PS 18,6 % | Flat tax 31,4 % |
| Fiscalité avant 5 ans | Flat tax 31,4 %, retrait = clôture | Flat tax 31,4 % |

**Règle simple affichée dans l'app** : le PEA est l'enveloppe par défaut pour de l'actions long terme ; le CTO est la souplesse pour tout le reste.

### Créer une enveloppe

1. Dashboard → **+ Nouvelle enveloppe**.
2. Choisir le type : cartes **PEA** (recommandée) et **CTO** avec leur fiscalité résumée.
3. Renseigner : nom (ex. « PEA Bourse »), courtier (optionnel), date d'ouverture (recommandée pour le PEA : elle déclenche le compte à rebours des 5 ans).
4. Enregistrer → l'enveloppe apparaît sur le dashboard.

Pour un PEA, l'app affiche ensuite en permanence : **Versements cumulés / 150 000 €** et **Antériorité fiscale : X ans restants**.

## 3. Positions — la composition

### Ajouter une position

Dans l'enveloppe → **+ Ajouter une position** :

1. **Recherche par nom ou ISIN** dans le catalog des ETF éligibles au PEA (ex. `CW8`, `MSCI World`, `LU1681043599`). La liste affiche le ticker, la catégorie d'indice, le TER, le nom et l'ISIN de chaque ETF.
2. Saisissez la **valeur actuelle de la position** (€) — pas de nombre de parts ni de cours unitaire : la valeur de la ligne à l'instant T.
3. Renseignez la **date de l'état des lieux**.

L'ajout se fait en deux valeurs : l'ETF depuis le catalog, la valeur en euros. Aucun montant investi historique n'est demandé — la variation et les détails de la valeur viendront plus tard.

### « J'arrive en cours » — état des lieux d'une enveloppe existante

Vous avez déjà un PEA ou un CTO chez votre courtier, avec des lignes en portefeuille dont vous ne connaissez pas nécessairement le montant investi historique ? Le formulaire d'ajout est pensé exactement pour ce cas :

- Sélectionnez votre ETF dans la liste, puis renseignez directement la **valeur totale de la ligne** à l'instant T.
- Aucun montant investi n'est requis : la position est créée en « état des lieux », avec sa valeur actuelle.
- Les KPIs de gain/perte affichent alors « — » avec la mention *état des lieux* tant que les montants investis ne sont pas renseignés.

L'important est de pouvoir **commencer à suivre la valeur dès aujourd'hui** sans devoir reconstituer tout l'historique fiscal.

### Suivre la valeur — les valorisations

C'est **l'action clé de l'app** : elle alimente le graphique d'évolution.

1. Enveloppe → **Ajouter une valorisation** (ou sur une position précise).
2. Renseigner : date + valeur actuelle.
3. Une valorisation par date : en re-saisir une à la même date remplace l'ancienne.

**Rythme conseillé** : une fois par mois (ex. le 1er du mois), 30 secondes suffisent. Chaque point de la courbe vient d'une valorisation réelle — l'app n'invente jamais de valeur entre deux points.

## 4. Le graphique d'évolution

Sur chaque enveloppe (et en global sur le dashboard) :

- **Courbe** : valeur (€) en fonction du temps.
- **Sélecteur de période** : 6 mois / 1 an / Tout.
- **Survol** : tooltip date + valeur + variation depuis le début de la période.
- **Ligne de référence** : total investi, pour visualiser d'un coup d'œil le gain cumulé.

États particuliers :
- Aucune valorisation → message « Ajoutez une première valorisation pour voir la courbe ».
- Une seule valorisation → point unique + invitation à en ajouter d'autres.

## 5. Dashboard — la vue d'ensemble

- **Total investi** et **valeur actuelle** du patrimoine suivi, avec la variation sur la période.
- **Répartition par enveloppe**.
- **Cartes par enveloppe** : nom, type, valeur, mini-variation ; un clic ouvre l'enveloppe.

## 6. Questions fréquentes

**Dois-je connecter ma banque ?** Non. CompoundWealth est volontairement manuel : aucune synchronisation, aucune donnée bancaire.

**Que se passe-t-il si je me trompe sur un montant ?** Éditez la position ou la valorisation ; l'historique se recalcule.

**Puis-je supprimer une enveloppe ?** Oui, avec confirmation ; elle est archivée et reste consultable, l'historique n'est jamais perdu silencieusement.

**L'app me dit-elle quoi acheter ?** Non. CompoundWealth mesure et montre ; il ne recommande rien et n'exécute aucun ordre.

**Mes données sont-elles sécurisées ?** Vos données sont chiffrées en transit et le mot de passe est stocké haché. Vous pouvez supprimer votre compte et toutes vos données à tout moment (réglages → Danger zone).
