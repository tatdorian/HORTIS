# Hortis — version web

Adaptation web du jeu de cartes solo **Hortis** (Mark Tuck, Origames) : vous agrandissez un verger en superposant 9 cartes d'agrumes, et chaque arbre posé sur un arbre de la même essence fait pousser des fruits.

## Lancer en local

```bash
npm start          # http://localhost:3000 (variable PORT pour changer de port)
npm test           # tests du moteur de règles
```

Le projet n'a aucune dépendance : un petit serveur Node (`server.js`) sert les fichiers statiques de `public/`.

## Déploiement avec Nixpacks

Nixpacks détecte le projet Node grâce à `package.json`, et `nixpacks.toml` fixe Node 20 et la commande de démarrage (`node server.js`). Le serveur écoute sur `$PORT` (par défaut 3000) et répond sur `/healthz` pour le contrôle de santé.

```bash
nixpacks build . --name hortis
docker run -p 3000:3000 -e PORT=3000 hortis
```

Railway, Coolify, Dokploy, etc. le déploient tel quel.

## Règles implémentées

- 18 cartes Verger de 2 × 3 cases : 5 arbres (orangers, citronniers, citronniers verts ; 1 ou 2 fruits) et 1 clairière. Une partie en utilise 9.
- Mise en place : 1 carte de départ, 2 cartes en main, 6 cartes en pioche. La réserve contient 5 dés par couleur, la Brouette et l'Écureuil.
- Tour : poser une carte (rotation libre de 90° / 180°, alignée sur la grille, en recouvrant au moins une case), placer les dés, piocher.
- Un arbre sur un arbre de la même essence reçoit un dé égal au total des fruits des deux arbres (ou à la valeur du dé recouvert + ses fruits). Au-delà de 6, le dé passe sur la face **Panier** (10). Un Panier recouvert par la même essence devient la **Brouette** (15).
- **Clairières** : elles recouvrent n'importe quoi et emportent le dé sans changer sa valeur. Une clairière vide accepte n'importe quel arbre. Un dé sur une clairière en fin de partie est perdu.
- **Écureuil** (une fois par partie) : il permet de recouvrir une autre essence. Le dé recouvert retourne à la réserve et l'arbre ne peut plus être recouvert.
- Réserve épuisée : aucun dé n'est placé.
- Fin de partie : après la 9e carte, ou plus tôt si aucune carte ne peut être posée.
- **Mode compétitif** : le numéro de partie (ou `?partie=1234` dans l'URL) donne à chaque joueur les mêmes cartes, dans le même ordre.
- **Recettes** (option) : deux cartes Recette donnent un objectif de score (somme des deux nombres) et un bonus si leur condition est remplie.

## Limites de fidélité

Le livret officiel n'était pas accessible pendant le développement. Les règles viennent de comptes rendus détaillés du jeu. Ce qui diffère du jeu physique :

- La disposition exacte des arbres sur les 18 cartes physiques est reconstituée : elle respecte la structure du jeu (5 arbres + 1 clairière, 3 essences équilibrées, arbres à 2 fruits) mais n'est pas un relevé des vraies cartes.
- Le texte des 18 Recettes et le tableau des titres de fin de partie sont des créations originales, dans l'esprit du jeu.

Les cartes sont définies dans `public/core.js` (`buildCards`, `RECIPES`). Pour reproduire exactement les vraies cartes, il suffit de remplacer ces données.

Les visuels (cartes, arbres, dés, Panier, Brouette, Écureuil) sont des illustrations SVG originales. Aucune image de l'éditeur n'est utilisée.
