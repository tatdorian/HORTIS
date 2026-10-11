# Ortie — le verger solo

Jeu de cartes solo en 9 cartes, jouable dans le navigateur et installable comme une application sur iPhone, Android et ordinateur. Vous agrandissez un verger en superposant des cartes d'agrumes : chaque arbre posé sur un arbre de la même essence fait pousser des fruits.

Adaptation numérique du jeu de cartes *Hortis* (Mark Tuck, Origames). Les 18 cartes Verger et les 18 Recettes ont été relevées sur un exemplaire du jeu.

## Lancer en local

```bash
npm start          # http://localhost:3000 (variable PORT pour changer de port)
npm test           # tests du moteur de règles et des parties à distance
```

Le projet n'a aucune dépendance : un petit serveur Node (`server.js`) sert les fichiers statiques de `public/` et gère les parties à distance (`rooms.js`, adresses `/api/…`).

## Installer l'application (iOS, Android, PC)

Ortie est une application web installable (PWA). Le bouton **Télécharger**, en haut de l'écran, l'installe :

- **Android, Windows, macOS, Linux (Chrome, Edge…)** : la fenêtre d'installation du système s'ouvre directement.
- **iPhone / iPad** : le bouton affiche la marche à suivre (Partager → « Sur l'écran d'accueil »). Apple n'autorise pas d'autre méthode.
- **Safari sur Mac, Firefox** : le bouton affiche les étapes adaptées.

Une fois installée, Ortie s'ouvre en plein écran depuis l'écran d'accueil ou le menu Démarrer, et fonctionne **hors connexion** grâce au service worker (`public/sw.js`).

**Mises à jour fiables.** Les fichiers du jeu sont chargés avec leur numéro de version (`style.css?v=1.26`, `app.js?v=1.26`…). Une nouvelle page ne peut donc jamais utiliser un ancien style ou un ancien code resté en cache, que ce soit sur le téléphone, dans l'appli installée ou chez l'hébergeur. **À chaque nouvelle version, changer le numéro à trois endroits** : `APP_VERSION` dans `app.js`, `VERSION` dans `sw.js` et les `?v=` de `index.html` (sept fichiers, dont `sound.js`, `online.js` et `achievements.js`). Un test (`npm test`) vérifie qu'ils sont identiques. Le serveur revalide les fichiers par empreinte de contenu (ETag), pas par date. Si le jeu ne démarre pas, l'appli vide son cache et se recharge toute seule, une seule fois. L'option « Vider le cache et recharger » existe aussi dans le menu Ortie → Paramètres. L'installation exige que le site soit servi en **https** (c'est le cas sur Railway, Coolify, etc.).

## Déploiement avec Nixpacks

Nixpacks détecte le projet Node grâce à `package.json`, et `nixpacks.toml` fixe Node 20 et la commande de démarrage (`node server.js`). Le serveur écoute sur `$PORT` (par défaut 3000) et répond sur `/healthz` pour le contrôle de santé.

Les parties à distance ont besoin de ce serveur Node (un simple hébergement de fichiers statiques ne suffit pas). Les salons sont gardés en mémoire : il faut **une seule instance**, et un redéploiement ou un redémarrage termine les parties à distance en cours (chaque joueur garde alors son verger et continue seul). Le flux en direct utilise les Server-Sent Events, compatibles avec Railway, Coolify (Traefik) ou nginx.

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
  - Chaque carte Recette affiche sa progression en direct (« 3/5 dés orange en jeu », « plus grand groupe : 2/3 dés », « la clairière n° 5 : 3/4 dés autour · il manque un dé à droite »…) et passe à « réussie » ou « ratée » dès que le résultat est définitif. En fin de partie, chaque recette ratée indique pourquoi.
  - Sur téléphone, une **barre Recettes** reste en haut du plateau pendant la partie : une pastille par recette, avec son illustration et sa progression (« 3/5 », ✔ réussie, ✘ ratée, ×2 pour les recettes qui doublent un fruit). Un toucher sur la barre ouvre les deux cartes complètes par-dessus le plateau ; ✕, un nouveau toucher sur la barre ou un toucher ailleurs les referme (ce toucher ne déplace pas la carte en main). Quand une recette est réussie, un message et un petit son l'annoncent et sa pastille clignote. Sur ordinateur, les recettes sont dans le panneau de droite, juste sous le score.
  - **Panier de fruits** : la Brouette compte comme un panier, puisqu'elle remplace un Panier recouvert.
- **Mode compétitif** : le même numéro de partie donne les mêmes cartes, dans le même ordre (lien partageable `?partie=1234&recettes=7,5`).

## Menu (logo en haut à gauche)

Le menu est rangé en sections séparées : **Jouer** (partie solo, à deux, à distance), **Achievements**, **Apparence** (Personnaliser), **Réglages** (Paramètres) et **Aide** (règles, installation).

- **Partie solo** et **Jouer à deux** : à deux, sur le même appareil, les joueurs reçoivent les mêmes 9 cartes et construisent chacun leur verger à tour de rôle (un écran « À … de jouer » invite à se passer l'appareil). Le meilleur score gagne, puis le plus de dés en jeu en cas d'égalité, comme dans la règle multijoueur du jeu. À la fin, la pastille du joueur en haut du plateau permet de regarder chaque verger.
- **Jouer à distance** : chacun joue sur son propre téléphone.
  - Un joueur choisit **Créer** (avec ou sans Recettes) et reçoit un **code à 4 caractères** (ex. `D8PE`). Le bouton « Envoyer le lien d'invitation » le partage (SMS, WhatsApp…) ; le lien `…/?rejoindre=D8PE` ouvre directement la bonne fenêtre.
  - L'autre choisit **Rejoindre** et tape le code (ou touche « 📋 Coller » : le code est retrouvé dans le message ou le lien copié). La partie démarre aussitôt sur les deux appareils.
  - **Le lien ouvre l'appli installée en priorité.**
    - Android, ordinateur : le manifeste (`handle_links`, `launch_handler`) demande d'ouvrir les liens du site dans l'appli. Si elle tourne déjà, elle est simplement mise au premier plan et ouvre « Rejoindre », sans perdre la partie en cours (`launchQueue`).
    - Si le navigateur ouvre quand même le lien sur un Android où l'appli est installée, un bouton « Ouvrir dans l'appli » la lance.
    - iPhone : Apple ne laisse aucun lien ouvrir une appli de l'écran d'accueil. La page propose donc « Copier le code », puis Jouer à distance → Rejoindre → Coller dans l'appli.
  - Mêmes 9 cartes pour les deux, chacun pose ses cartes **à son rythme**, sans attendre l'autre. En haut du plateau, la pastille de l'adversaire montre en direct sa carte, son score et s'il est en ligne (point vert).
  - Une fois son verger terminé, on peut toucher la pastille pour suivre le verger de l'autre en direct. Quand les deux ont fini, le résultat s'affiche chez les deux joueurs ; « Revanche » relance une manche avec de nouvelles cartes, « Rejouer ces cartes » avec les mêmes.
  - On peut fermer l'appli ou recharger la page : la partie reprend où elle en était. Le serveur vérifie chaque coup avec le moteur de règles. Une nouvelle partie solo ou à deux quitte la partie à distance (l'adversaire le voit).
- **Achievements** : 58 défis à réussir, en bronze, argent, or et un platine (« Maître d'Ortie », tous les autres réunis). Ils sont rangés par thème : premiers pas, belles récoltes, recettes, assiduité, à plusieurs, secrets (12 achievements cachés). Certains sont très durs : 90 fruits (et 100 en secret), 4 dés à 6 ou 5 Paniers en même temps, objectif atteint 5 parties d'affilée, 5 victoires à distance d'affilée, 250 parties, 10 000 fruits, 30 jours de jeu…
  - **Récompenses** : 18 objets exclusifs de Personnaliser se gagnent avec les achievements. Ce sont 5 fonds (Damier, Feuille d'or, Aurore boréale, Velours royal, Cosmos), 5 designs de cartes (Braises, Givre, Verger doré, Arc-en-ciel, Diamant), 4 styles de dés (Bois, Cristal, Or massif, Obsidienne) et 4 couleurs d'interface (Émeraude, Royal, Minuit, Diamant). Avant d'être gagnés, ils apparaissent avec un 🔒 ; un toucher indique l'achievement à réussir. Gagnés, ils portent un 🏆. La liste des achievements indique la récompense de chacun.
  - La liste montre les achievements réussis (avec leur date), ceux qui restent à faire (avec une barre de progression pour les compteurs : « 4 / 10 parties »…) et les **secrets**, cachés (« ??? ») tant qu'ils ne sont pas réussis. Filtres : Tous, Réussis, À faire, Secrets. Total de points et statistiques (parties, meilleur score, moyenne, fruits récoltés, recettes, paniers, jours de jeu, parties à deux et à distance).
  - Dès qu'un achievement est réussi, une **fenêtre surgissante** l'annonce sur l'écran principal, avec un petit son (même par-dessus la fenêtre de fin de partie) ; plusieurs achievements obtenus d'un coup sont annoncés ensemble. Un toucher dessus ouvre la liste. La fin de partie récapitule aussi les nouveaux achievements, et un point doré sur le logo signale ceux qu'on n'a pas encore regardés.
  - Les compteurs ne comptent qu'une fois par partie. Tout est gardé sur l'appareil (`public/achievements.js`, testé dans `test/achievements.test.js`).
- **Personnaliser**, rangé en quatre onglets (Général, Terrain, Cartes, Dés) pour éviter de longs défilements, avec les boutons « 🎲 Au hasard » (combinaison surprise) et « ↺ Par défaut » :
  - **Thème** : automatique (comme le téléphone), clair ou sombre.
  - **Couleurs de l'interface** : Verger, Océan, Prune, Framboise, Cacao (titres, boutons, score ; adaptées au thème sombre).
  - **Fond du terrain** : chêne clair, noyer, tapis bleu, lin, ardoise, tomettes, pelouse, marbre, sable, nuit étoilée, velours.
  - **Design des cartes** : classique, printemps, automne, nuit, cerisier, lavande, tropical, vintage, hiver.
  - **Style des dés** : classique, chiffres (le nombre au lieu des points), pastel, contour, bonbon. La couleur du fruit reste toujours reconnaissable.
- **Paramètres** :
  - **Son** : musique douce et effets sonores, chacun désactivable, avec son propre volume.
  - **Application** : « Vider le cache et recharger », numéro de version.
- Les choix sont gardés sur l'appareil. Dans toutes les fenêtres, les boutons du bas (Terminé, Valider…) restent visibles : pas besoin de descendre pour valider.

## Son

Tout le son est synthétisé dans le navigateur (`public/sound.js`, Web Audio) : aucun fichier audio, il fonctionne hors connexion et ne pose aucune question de droits.

- **Musique** : petite boucle de verger générative en do majeur pentatonique, à environ 84 bpm. Elle mêle une nappe, une basse, une mélodie de marimba et un léger bruissement de feuillage, et ne se répète jamais à l'identique. Elle se met en pause quand l'appli passe en arrière-plan et baisse pendant les fanfares.
- **Effets** :
  - choisir, tourner et poser une carte (« toc » de bois) ;
  - les dés (la note monte avec la valeur), le Panier et la Brouette (roue et fanfare) ;
  - l'Écureuil, une pose impossible, une recette réussie, un achievement ;
  - le changement de joueur, la victoire et la fin de partie.
- Les navigateurs n'autorisent le son qu'après un premier toucher : la musique démarre au premier geste.
- **Règles du jeu** et **Installer l'appli**.

Le jeton **Brouette** prend la couleur du fruit qui l'a remplie (orange, jaune ou vert), avec une brouette en bois bien lisible.

## Aides de jeu

- Choisir une carte ne la pose pas : elle apparaît là où l'on touche ou survole le verger, ou là où on la fait glisser. On la tourne, puis on la pose.
- On peut aussi faire glisser une carte de la main directement sur le plateau.
- Sur téléphone, **deux touchers rapides** sur la carte (sur le plateau ou dans la main) la tournent d'un quart de tour. Un toucher simple ailleurs sur le plateau y déplace la carte.
- Les gestes au doigt utilisent les évènements tactiles natifs (fiables sur Safari iOS). Le zoom au double toucher, le pincement et le rebond de la page sont bloqués. La barre du bas a une hauteur fixe, pour que le plateau ne change jamais de taille pendant un geste.
- Les règles s'ouvrent depuis le menu Ortie (logo en haut à gauche), ou avec la touche « ? » sur ordinateur. Le numéro de version s'affiche dans le menu, les règles et le panneau Détails. Une appli installée se met à jour automatiquement à l'ouverture.
- Les textes de la barre du bas tiennent toujours sur une ligne : la police rétrécit si besoin, pour que l'écran ne change jamais de taille.
- Le bouton **Télécharger** disparaît quand l'appli est installée. Sur Chrome, Edge et Android, il n'apparaît que si le navigateur propose vraiment l'installation. Sur iPhone et Safari, qui ne permettent pas de le détecter, le bouton « Elle est déjà installée » du guide le masque ; un lien « installer l'appli » reste dans les règles.
- Sur téléphone, l'écran est fixe comme une application : le plateau ne bouge jamais pendant qu'on déplace une carte. Le score et la réserve s'affichent en haut ; un toucher ouvre le panneau « Détails » (score, recettes, réserve).
- Chaque case recouverte affiche le dé obtenu, ou une croix rouge si la pose est interdite. Le nombre de fruits gagnés s'affiche sur la carte et sur le bouton **Poser**.
- **Pas d'annulation** : une carte posée reste posée (sinon on pourrait poser, regarder le score, annuler et réessayer ailleurs). La partie est sauvegardée automatiquement.

## Points à vérifier

- Les cartes Recette ont été associées aux cartes Verger en supposant que chaque carte a été retournée sur place entre les deux photos. Cela n'influe que sur les cartes retirées de la pioche en mode Recettes.
- Le livret officiel n'a pas pu être consulté. Quelques cas limites suivent l'interprétation la plus courante : aucun dé quand un arbre recouvre une clairière vide, et la Brouette compte pour son fruit.
