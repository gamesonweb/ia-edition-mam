# Games On Web - IA Édition - MAM

Jeu de plateforme 3D en **Babylon.js** et **TypeScript**. Le joueur doit atteindre la fin du niveau le plus vite possible, tout en évitant les monstres et en utilisant les éléments du décor.

## Membres de l'équipe

- Maxime JOURDANNEY
- Anaïs POUGET
- Mathieu ROSSEL

## Liens importants

**Hébergement (sur serveur dédié) :** https://jeuxwebl3miage.kayuu.fr/games/gow-game/

**Vidéo gameplay :** https://youtu.be/lngMgwn3fJk?t=139

**... TODO**

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

