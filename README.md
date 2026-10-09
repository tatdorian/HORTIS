# Ortie — le verger solo

Jeu de cartes solo en 9 cartes, jouable dans le navigateur et installable comme une application sur iPhone, Android et ordinateur. Vous agrandissez un verger en superposant des cartes d'agrumes : chaque arbre posé sur un arbre de la même essence fait pousser des fruits.

Adaptation numérique du jeu de cartes *Hortis* (Mark Tuck, Origames). Les 18 cartes Verger et les 18 Recettes ont été relevées sur un exemplaire du jeu.

## Lancer en local

```bash
npm start          # http://localhost:3000 (variable PORT pour changer de port)
npm test           # tests du moteur de règles
```

Le projet n'a aucune dépendance : un petit serveur Node (`server.js`) sert les fichiers statiques de `public/`.

## Installer l'application (iOS, Android, PC)

Ortie est une application web installable (PWA). Le bouton **Télécharger**, en haut de l'écran, l'installe :

- **Android, Windows, macOS, Linux (Chrome, Edge…)** : la fenêtre d'installation du système s'ouvre directement.
- **iPhone / iPad** : le bouton affiche la marche à suivre (Partager → « Sur l'écran d'accueil »). Apple n'autorise pas d'autre méthode.
- **Safari sur Mac, Firefox** : le bouton affiche les étapes adaptées.

Une fois installée, Ortie s'ouvre en plein écran depuis l'écran d'accueil ou le menu Démarrer, et fonctionne **hors connexion** grâce au service worker (`public/sw.js`). L'installation exige que le site soit servi en **https** (c'est le cas sur Railway, Coolify, etc.).

## Déploiement avec Nixpacks

Nixpacks détecte le projet Node grâce à `package.json`, et `nixpacks.toml` fixe Node 20 et la commande de démarrage (`node server.js`). Le serveur écoute sur `$PORT` (par défaut 3000) et répond sur `/healthz` pour le contrôle de santé.

```bash
nixpacks build . --name ortie
docker run -p 3000:3000 -e PORT=3000 ortie
```

## Règles

- 18 cartes Verger de 3 × 2 cases : 5 arbres (orangers, citronniers jaunes, citronniers verts ; 1 ou 2 fruits) et 1 clairière portant le numéro de la carte. Une partie en utilise 9.
- Mise en place : 1 carte de départ, 2 cartes en main, 6 cartes en pioche. La réserve contient 5 dés par couleur, la Brouette et l'Écureuil.
- Tour : poser une carte (tournée de 90° ou 180° si besoin, alignée sur la grille, en recouvrant au moins une case), placer les dés, piocher.
- Un arbre posé sur un arbre de la même essence reçoit un dé égal au total des fruits des deux arbres (ou à la valeur du dé recouvert + ses fruits). Au-delà de 6 : face **Panier** (10). Un Panier recouvert par la même essence devient la **Brouette** (15).
- **Clairières** : elles recouvrent n'importe quoi et emportent le dé sans changer sa valeur. Une clairière vide accepte n'importe quel arbre. Un dé resté sur une clairière en fin de partie ne rapporte rien.
- **Écureuil** (une fois par partie) : il permet de recouvrir une autre essence. Le dé recouvert retourne à la réserve et l'arbre ne peut plus être recouvert.
- Fin de partie : après la 9e carte, ou plus tôt si aucune carte ne peut être posée.
- **Recettes** (au verso des cartes) : deux Recettes donnent l'objectif de score (somme de leurs nombres) et un bonus si leur condition est remplie. Les cartes utilisées comme Recettes sont retirées de la pioche.
- **Mode compétitif** : le même numéro de partie donne les mêmes cartes, dans le même ordre (lien partageable `?partie=1234&recettes=7,5`).

## Aides de jeu

- La carte choisie apparaît directement à la meilleure position. Il suffit de la déplacer (souris ou doigt), de la tourner, puis de la poser.
- On peut aussi faire glisser une carte de la main directement sur le plateau.
- Sur téléphone, **deux touchers rapides** sur la carte (sur le plateau ou dans la main) la tournent d'un quart de tour. Un toucher simple ailleurs sur le plateau y déplace la carte.
- Sur téléphone, l'écran est fixe comme une application : le plateau ne bouge jamais pendant qu'on déplace une carte. Le score et la réserve s'affichent en haut ; un toucher ouvre le panneau « Détails » (score, réserve, recettes).
- Chaque case recouverte affiche le dé obtenu, ou une croix rouge si la pose est interdite. Le nombre de fruits gagnés s'affiche sur la carte et sur le bouton **Poser**.
- **Conseil** (💡) propose le coup qui rapporte le plus de fruits ce tour-ci.
- **Annuler** revient sur le dernier coup. La partie est sauvegardée automatiquement.

## Points à vérifier

- Les cartes Recette ont été associées aux cartes Verger en supposant que chaque carte a été retournée sur place entre les deux photos. Cela n'influe que sur les cartes retirées de la pioche en mode Recettes.
- Le livret officiel n'a pas pu être consulté. Quelques cas limites suivent l'interprétation la plus courante : aucun dé quand un arbre recouvre une clairière vide, et la Brouette compte pour son fruit.
