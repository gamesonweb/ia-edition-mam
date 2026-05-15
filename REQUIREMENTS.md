# Jeu de Plateforme 3D (Babylon.js + TypeScript)

> Ce document décrit l'architecture souhaitée, les règles métier, les conventions de code et les priorités de développement.
> Il doit impérativement être maintenu par l'équipe projet (mise à jour, rajout, etc).

---

## 1. Vue d'ensemble du projet

**Genre :** Jeu de plateforme 3D à la troisième personne
**Stack :** [Babylon.js](https://www.babylonjs.com/) + TypeScript
**Objectif de jeu :** Le joueur doit atteindre la zone d'arrivée de chaque niveau le plus rapidement possible (chronomètre actif) tout en évitant les monstres et en interagissant avec les mécaniques de l'environnement (portes, items, types de sol).

> **Note :** Un système de points peut être introduit ultérieurement. Pour l'instant, le chronomètre est la métrique principale de performance.

---

## 2. Structure du projet

```
src/
├── core/                  # Moteur de jeu, états UI, boucle principale
│   ├── Game.ts
│   ├── SceneManager.ts
│   └── InputManager.ts
├── entities/              # Entités du jeu (joueur, monstres, items)
│   ├── player/
│   │   ├── Player.ts
│   │   └── PlayerAnimationController.ts
│   ├── monsters/
│   │   ├── BaseMonster.ts
│   │   ├── BasicMonster.ts
│   │   ├── ShooterMonster.ts
│   │   ├── FastMonster.ts
│   │   ├── BossMonster.ts
│   │   └── MonsterFactory.ts
│   └── items/
│       ├── BaseItem.ts
│       ├── Key.ts
│       └── ItemFactory.ts
├── environment/           # Types de sol et interactions environnementales
│   ├── BaseGround.ts
│   ├── GroundFactory.ts
│   ├── grounds/
│   │   ├── BasicGround.ts
│   │   ├── GrassGround.ts
│   │   ├── SandGround.ts
│   │   ├── QuicksandGround.ts
│   │   ├── CaveGround.ts
│   │   ├── CloudGround.ts
│   │   └── TrampolineGround.ts
│   └── Door.ts
├── levels/                # Chargement + layout déclaratif des niveaux
│   ├── LevelCatalog.ts
│   ├── LevelLoader.ts
│   ├── LevelFactory.ts
│   ├── LevelTypes.ts
│   ├── Level1Easy.ts
│   ├── Level2Medium.ts
│   └── Level3Hard.ts
├── ui/                    # Interface utilisateur (menus, HUD)
│   ├── MainMenu.ts
│   ├── HUD.ts
│   ├── PauseMenu.ts
│   └── SettingsMenu.ts
├── utils/                 # Utilitaires généraux
│   ├── Timer.ts
│   └── angleUtils.ts
└── main.ts                # Point d'entrée
```

---

## 3. Conventions de code

- **Langage :** TypeScript strict (`"strict": true` dans `tsconfig.json`)
- **Nommage :**
  - Classes : `PascalCase`
  - Méthodes / variables : `camelCase`
  - Constantes globales : `UPPER_SNAKE_CASE`
  - Fichiers : `PascalCase.ts` pour les classes, `camelCase.ts` pour les utilitaires
- **Héritage :** Utiliser des classes abstraites pour les entités partageant un comportement commun (`BaseMonster`, `BaseGround`)
- **Babylon.js :** Toujours passer la scène (`Scene`) en paramètre du constructeur des entités
- **Pas de `any` :** Typer explicitement toutes les variables et retours de fonction
- **Commentaires :** En français (langue du projet)

---

## 4. Entités du jeu

### 4.1 Joueur (`Player`)

| Stat       | Valeur actuelle |
|------------|-----------------|
| Vies (session de jeu) | 3 |
| Vitesse de déplacement | 5.5 |
| Impulsion de saut | 6.0 |

**Contrôles :**
- Déplacement dans toutes les directions (ZQSD / WASD)
- Saut (barre espace)
- Flèches clavier : rotation de caméra (mapping actuellement inversé)
- Pas d'attaque directe (le joueur interagit avec l'environnement, ramasse des items/clés)

**Règles :**
- Si les vies de session atteignent 0 → game over, retour au menu principal
- Les monstres retirent des vies au contact (gestion des projectiles à finaliser)
- Le joueur peut être ralenti ou bloqué selon le type de sol

---

### 4.2 Monstres

Tous les monstres héritent de `BaseMonster` qui expose :
- `speed: number`
- `damage: number`
- `hp: number` (infini = très grand entier ou flag `immortal`)
- `size: number` (multiplicateur d'échelle)
- `canJump: boolean` (toujours `false`)
- `isStatic: boolean`
- `update(playerPosition: Vector3): void` — logique de déplacement/détection

**Tableau des monstres :**

| Nom      | Vitesse | Dégâts | Taille | PV     | Arme       | Nombre     |
|----------|---------|--------|--------|--------|------------|------------|
| Basique  | 0.5     | 1      | Petit  | ∞      | Contact    | Beaucoup   |
| Tireur   | 0       | 2      | 1      | ∞      | Flèches    | 1–3        |
| Rapide   | 1.25    | 1      | Petit  | ∞      | Contact    | 1–3        |
| Boss     | 1       | 3      | Grand (×2) | ∞  | Contact    | 1 par niveau |

**Comportement IA (simple) :**
- Chaque monstre patrouille dans sa zone définie (zone attribuée à la création du niveau)
- Si le joueur entre dans la zone → le monstre détecte et suit le joueur
- Si le joueur sort de la zone → le monstre retourne à sa position initiale
- Le monstre ne peut pas sauter
- Le Tireur reste statique et tire des flèches en direction du joueur à intervalles réguliers

---

### 4.3 Items

#### Clé (`Key`)
- Objet ramassable posé dans le niveau
- Permet d'ouvrir une porte associée
- Visuellement identifiable
- Une clé = une porte (mapping 1:1 ou 1:N selon le niveau)

### 4.4 Animation du joueur

- Le rendu joueur s'appuie sur un contrôleur d'animations 3D dédié (`PlayerAnimationController`)
- États principaux gérés : idle, sprint, saut (départ/air/atterrissage), hit reaction, recover
- Cette couche reste visuelle : la logique gameplay continue d'utiliser le collider/mesh physique du joueur

---

## 5. Types de sol (`GroundType`)

Tous les sols héritent de `BaseGround` qui expose :
- `onPlayerEnter(player: Player): void`
- `onPlayerStay(player: Player): void`
- `onPlayerExit(player: Player): void`

| Type          | Effet sur le joueur |
|---------------|---------------------|
| Basique       | Aucun effet |
| Herbe         | Aucun effet |
| Sable         | Vitesse réduite (multiplicateur actuel : ×0.5) + saut réduit |
| Sable mouvant | Vitesse fortement réduite (×0.3) + saut fortement réduit + enfoncement progressif menant à la mort |
| Grotte        | Saut désactivé (`canJump = false`) |
| Nuage         | Surface mobile (translation oscillatoire) |
| Trampoline    | Rebond vertical automatique à l'entrée |

> Les valeurs numériques actuelles restent ajustables pendant les phases de test gameplay.

---

## 6. Mécaniques de jeu

### 6.1 Système de portes

- Une porte peut être verrouillée par :
  - **Une clé** : le joueur doit posséder la clé correspondante dans son inventaire
  - **Un code** : un code numérique ou alphanumérique affiché quelque part dans le niveau (panneau, texture, objet)
- Interaction déclenchée par proximité + touche d'action (ex. `E`)
- La porte s'ouvre visuellement (animation)

### 6.2 Chronomètre

- Démarre dès que le joueur commence à jouer
- Affiché en permanence dans le HUD
- Sauvegardé à la fin de chaque niveau (meilleur temps)
- Utilisé pour les 3 niveaux de difficulté (easy / medium / hard)

---

## 7. Niveaux de difficulté

| Difficulté | Description |
|------------|-------------|
| Facile     | Peu de monstres, types de sol simples, portes avec clés uniquement |
| Moyen      | Monstres variés, sables mouvants, portes avec codes |
| Difficile  | Boss présent, nuages, sable mouvant en grande quantité, combinaison de mécaniques |

> Les niveaux sont chargés via `LevelLoader`.
> La définition du contenu de niveau suit actuellement une architecture déclarative TypeScript (placements absolus/ancrés sur sol + séries de spawns).

---

## 8. Interface utilisateur (UI)

### Menu principal
- **Jouer** → Lance le niveau 1 (difficulté sélectionnée)
- **Reprendre** → Continue une partie en cours (si sauvegarde de session)
- **Choisir un niveau** → Sélection du niveau et de la difficulté
- **Paramètres** → Volume, résolution, contrôles

### HUD (en jeu)
- Chronomètre (haut centre)
- Points de vie (cœurs ou barre, haut gauche)
- Inventaire clé(s) (bas gauche)

### Menu pause
- Accessible via `Échap`
- Options : Reprendre, Recommencer, Paramètres, Quitter

---

## 9. Gestion de la scène Babylon.js

- Utiliser **`HavokPlugin`** ou **`CannonJSPlugin`** pour la physique
- La caméra suit le joueur en mode **troisième personne** (`ArcRotateCamera` ou caméra custom)
- Le suivi caméra inclut un auto-recentrage derrière le joueur avec gestion anti-conflit pendant la rotation manuelle
- Le moteur de rendu doit cibler **60 FPS**
- Utiliser des **`AbstractMesh`** pour les collisions
- Séparer clairement la logique de jeu (TypeScript pur) de la partie rendu (Babylon.js)

---

## 10. Priorités de développement (dans l'ordre)

- [x] **Scène de base** : moteur Babylon.js fonctionnel, physique activée, sol basique
- [x] **Joueur** : déplacement, saut, collisions
- [x] **Camera** : suivi du joueur
- [x] **Types de sol** : implémentation des effets (incluant trampoline)
- [x] **Monstres** : Basique en premier, puis les autres
- [x] **Logique du jeu** : victoire, défaite, interactions, chute etc. Implementer un moteur de jeu !
- [ ] **Items & portes** : clé + porte simple
- [x] **HUD & chronomètre**
- [x] **Menus** : principal, pause, sélection de niveau
- [ ] **Niveaux** : level design des 3 niveaux
- [ ] **Polish** : sons, effets visuels, animations

---

## 11. Points ouverts / à décider

- [ ] Système de points : introduire ou non en complément du chrono ?
- [ ] Déplacement continu des monstres : au lieu de faire retourner à leur position initiale, les monstres pourraient "patrouiller", peut-être que certains types de monstres restent statiques et d'autres patrouillent ?
- [ ] Modèles 3D : assets custom ou primitives Babylon.js (boîtes, sphères) pour le prototype ?
- [ ] Sauvegarde : localStorage puis backend Express ?
- [ ] 6e type de monstre : à définir ?
- [ ] Valeurs exactes de gameplay (facteur de ralentissement du sable, délai sable mouvant, portée de détection des monstres) → à calibrer en test

---

*Document maintenu par l'équipe projet. Toute modification structurelle (ajout d'entité, changement d'architecture) doit être répercutée ici avant d'être implémentée.*