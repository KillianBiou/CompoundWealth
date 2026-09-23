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

Pour un PEA, l'app affiche ensuite en permanence : **Versements : X / 150 000 €** — cliquez sur le badge pour ouvrir une petite modale et renseigner vos versements cumulés (avec texte explicatif) — et **Antériorité fiscale : X ans restants**.

### Importer un export bancaire

Plutôt que de tout saisir à la main, la page Enveloppes propose **Importer un export** :

1. Déposez le **CSV des transactions** de votre courtier (ex. Trade Republic : « Compte → Historique → Exporter »).
2. **Analysez** : le courtier est détecté automatiquement, rien n'est enregistré. L'aperçu liste les enveloppes détectées (PEA/CTO), leurs positions avec nombre de parts et montant investi, la valeur actuelle et le nombre de points d'historique reconstruits. Les lignes ignorées (dividendes, mouvements d'espèces) sont comptées et affichées.
3. **Importez** : les enveloppes sont créées automatiquement avec — le type (PEA ou CTO selon les lignes du fichier), la date d'ouverture (premier achat), les **versements cumulés** (total investi, alimentant le compteur Versements / 150 000 € du PEA), les positions avec parts, montant investi et prix unitaire (dernier prix connu du fichier, statique pour l'instant), et le graphique d'évolution reconstruit point par point depuis l'historique des achats.

> Le prix « actuel » d'une position est pour l'instant le dernier prix présent dans le fichier — une valeur statique. La connexion à des cours en temps réel viendra plus tard. Ajouter un nouvel export d'une autre banque ne demande que d'écrire un nouvel adaptateur au format du courtier.

## 3. Positions — la composition

### Ajouter une position

Dans l'enveloppe, en bas de la table des positions → **+ Ajouter une position** :

1. **Recherche par nom ou ISIN** dans le catalog des ETF éligibles au PEA (ex. `CW8`, `MSCI World`, `LU1681043599`). La liste affiche le ticker, la catégorie d'indice, le TER, le nom et l'ISIN de chaque ETF.
2. Saisissez le **nombre de parts**.
3. Renseignez la **date d'achat**.

L'application va chercher le **prix d'achat à cette date** (clôture du jour, source Yahoo Finance) et recrée l'historique quotidien de la ligne depuis la date d'achat : montant investi, valorisation jour par jour, plus-value — tout est calculé automatiquement.

Si l'ETF est déjà présent dans la liste, les parts sont **ajoutées à la ligne existante** (nouvel investissement daté, prix moyen recalculé) au lieu de créer un doublon.

### Suivre la valeur — le graphique d'évolution

Le graphique se construit **automatiquement** à partir des états des lieux de vos positions : chaque fois que vous ajoutez ou mettez à jour une position avec sa valeur actuelle, la courbe de l'enveloppe s'agrège tous les points.

- Plus besoin de saisir une valorisation d'enveloppe : la valeur de l'enveloppe est la somme des dernières valeurs connues de chaque position.
- Chaque point de la courbe vient d'une valeur réelle saisie — l'app n'invente jamais de valeur entre deux points.

## 4. Le graphique d'évolution

Sur chaque enveloppe (et en global sur le dashboard) :

- **Courbe** : valeur (€) en fonction du temps.
- **Sélecteur de période** : 6 mois / 1 an / Tout.
- **Survol** : tooltip date + valeur + variation depuis le début de la période.
- **Ligne de référence** : total investi, pour visualiser d'un coup d'œil le gain cumulé.

États particuliers :
- Aucune position valorisée → message invitant à ajouter une première position.
- Une seule valeur → point unique + invitation à suivre la valeur plus tard.

## 5. Dashboard — la vue d'ensemble

- **Total investi** et **valeur actuelle** du patrimoine suivi, avec la variation sur la période.
- **Répartition par enveloppe**.
- **Cartes par enveloppe** : nom, type, valeur, mini-variation ; un clic ouvre l'enveloppe.

## 6. Questions fréquentes

**Dois-je connecter ma banque ?** Non. CompoundWealth est volontairement manuel : aucune synchronisation, aucune donnée bancaire.

**Que se passe-t-il si je me trompe sur un montant ?** Supprimez et re-créez la position, ou corrigez les versements ; l'historique se recalcule.

**Puis-je supprimer une enveloppe ?** Oui, avec confirmation ; elle est archivée et reste consultable, l'historique n'est jamais perdu silencieusement.

**L'app me dit-elle quoi acheter ?** Non. CompoundWealth mesure et montre ; il ne recommande rien et n'exécute aucun ordre.

**Mes données sont-elles sécurisées ?** Vos données sont chiffrées en transit et le mot de passe est stocké haché. Vous pouvez supprimer votre compte et toutes vos données à tout moment (réglages → Danger zone).

## 7. Investissements réguliers — le DCA

### Planifier un investissement régulier

Dans l'enveloppe, sous la table des positions, la carte **« Investissements réguliers »** regroupe vos versements programmés :

- **Trois repères d'un coup d'œil** : 1 mois, 3 mois et 1 an — combien d'€ seront engagés et en combien de versements.
- **La table détaillée** : titre, montant max, périodicité (2 semaines, 1 mois, 2 mois, 3 mois) et prochaine échéance calculée automatiquement.
- **Parts entières (PEA)** : un PEA n'achète que des parts entières. Sur un budget de 1 500 € pour un ETF à 120 €, seuls 1 440 € sont dépensés (12 parts) — l'application affiche l'estimation `≈ 1 440 € · 12 parts` sous le montant max. Sur un CTO, les parts fractionnaires dépensent tout le budget.

**Créer un plan** — bouton **+ Planifier un investissement régulier** :

1. Mode **Plan périodique** : choisissez la périodicité et la date de départ (ex. le 2 octobre), puis ajoutez tous les titres avec leur montant maximal. Un clic sur une **suggestion grisée** (un ETF déjà détenu dans l'enveloppe) l'ajoute à la liste. À la confirmation, un DCA est créé pour chaque titre.
2. Mode **Titre unique** : pour un ETF précis — recherchez-le, saisissez le montant max, la périodicité et la date de départ.

**Gérer** : chaque ligne peut être **mise en pause / reprise** ou **supprimée** ; les KPI se recalculent immédiatement.

> Le DCA est une donnée de **planification** : rien n'est exécuté automatiquement à l'échéance, aucun achat n'est enregistré dans le patrimoine. Ces versements alimentent les calculs d'exposition et de projection à venir.
