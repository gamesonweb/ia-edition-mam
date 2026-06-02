# Games On Web - IA Édition - MAM

Jeu de plateforme 3D en **Babylon.js** et **TypeScript**. Le joueur doit atteindre la fin du niveau le plus vite possible, tout en évitant les monstres et en utilisant les éléments du décor.

## Information

* Le jeu est fait pour être joué au clavier et surtout à la souris, notamment à cause des mouvements de la caméra.
* Jouable en AZERTY et en QWERTY.

## Membres de l'équipe

- Maxime JOURDANNEY
- Anaïs POUGET
- Mathieu ROSSEL

## Présentation de l'équipe

Nous sommes tous les trois des étudiants en licence MIASHS à Biot, qui étions l'année dernière en deuxième année de BUT Informatique. Notre groupe est composé de Mathieu Rossel, Anaïs Pouget et Maxime Jourdanney.

## Liens importants

**Hébergement (sur serveur dédié) :** https://jeuxwebl3miage.kayuu.fr/games/gow-game/

**Vidéo gameplay :** https://youtu.be/lngMgwn3fJk?t=139

**... TODO**


## thèmes IA

Le thème « IA » du projet est incarné par les bots (monstres) du jeu, qui agissent de manière autonome et prennent des décisions locales en temps réel. Les comportements sont implémentés par des règles et des automates d'états simples, il n'y a pas d'apprentissage automatique, ce qui permet des réactions rapides et déterministes pendant le jeu. Il patrouille, poursuive le joueur, tir, attaque.

## Stack technique

- **Babylon.js** pour le rendu 3D et la scène de jeu
- **TypeScript** en mode strict
- **Vite** pour le développement et le build
- **cannon-es** pour la physique

## Fonctionnalités principales

- Déplacement et saut du joueur
- Caméra troisième personne
- Types de sol avec effets spécifiques
- Monstres et comportements simples
- HUD avec chronomètre
- Menus principaux et pause
- Système de niveaux basé sur une architecture déclarative

## Structure du projet

```text
src/
├── core/         # Boucle de jeu, gestion des entrées, scène
├── entities/     # Joueur, monstres, items
├── environment/  # Sols, portes, interactions du décor
├── levels/       # Chargement et définition des niveaux
├── ui/           # Menus et HUD
└── utils/        # Utilitaires généraux
```

## Décisions de conception

* Utiliser une structure modulaire pour séparer les responsabilités : `core`, `entities`, `environment`, `levels`, `ui` et `utils`.
* Créer des classes abstraites pour factoriser le comportement commun entre des entités similaires.
* Créer un `SceneManager` pour isoler la gestion des scènes Babylon et éviter que la logique du jeu ne soit trop dépendante du moteur graphique.
* Se concentrer sur un chronomètre de performance plutôt que sur un système de points complexe afin de prioriser le gameplay.

## Difficultés rencontrées, challenges techniques et ce dont on est fiers

Les principales difficultés rencontrées concernent surtout la découverte du fonctionnement de Babylon.js et la manière dont l'architecture allait être conçue. Ce qui a été particulièrement compliqué et nous a pris du temps est la gestion des collisions. Par exemple, pour les nuages mobiles, il y avait un conflit avec le système de gravité et de détection du sol : soit le joueur glissait, soit il restait collé à la plateforme de manière incorrecte. De plus, des erreurs de détection apparaissaient lors de la sortie du joueur du nuage.

Pour résoudre cela, nous avons mis en place un système de détachement temporaire après un saut (0,2 s), durant lequel le nuage est ignoré par le raycast. Nous avons également ajouté un ajustement manuel de la hauteur du joueur afin de stabiliser sa position et supprimer les micro-vibrations. Ces corrections ont permis d'obtenir des déplacements fluides et cohérents malgré des plateformes mobiles.

Ensuite, la caméra a été notre plus gros challenge. Nous voulions qu'elle reste agréable et confortable, sinon le joueur ne voit pas bien et le jeu devient pénible. Nous avons choisi une caméra qui suit le joueur sans se coller brutalement à lui. Nous avons limité ses angles pour éviter qu'elle ne regarde trop haut ou trop bas. Nous avons ralenti ses mouvements et mis un petit « temps mort » après une rotation manuelle, pour qu'elle ne reparte pas instantanément. Enfin, nous avons fait en sorte que la caméra se recentre progressivement derrière le joueur, sans à-coups. Nous obtenons ainsi une caméra plus douce et plus stable, ce qui rend le jeu plus plaisant à jouer. Cela a été obtenu après beaucoup de modifications et d'ajustements.


## Installation

```bash
npm install
```

## Lancer le projet en développement

```bash
npm run dev
```

Puis ouvrir l’URL affichée par Vite dans le terminal.

## Build de production

```bash
npm run build
```

La commande exécute TypeScript puis génère le build Vite dans le dossier `dist/`.

## Prévisualiser le build

```bash
npm run preview
```

## Notes

- Le projet utilise une configuration Vite avec une base de production sous `/games/gow-game/`.
- Les détails de gameplay et l’architecture cible sont décrits dans `REQUIREMENTS.md`.

