
import { Scene } from "@babylonjs/core";
import { LevelFactory } from "./LevelFactory";
import type { LevelDefinition } from "./LevelTypes";
import { isValidLevelId } from "./LevelCatalog";
import { level1EasyLayout } from "./Level1Easy";
import { level2MediumLayout } from "./Level2Medium";

/*
 * Classe responsable du chargement des niveaux de jeu.
 * Peut inclure des méthodes pour charger les données de niveau à partir de fichiers ou bd,
 * et pour initialiser les éléments du niveau (ennemis, objets, obstacles, etcà.
 */

export class LevelLoader {
    private readonly levelFactory: LevelFactory;

    public constructor(scene: Scene) {
        this.levelFactory = new LevelFactory(scene);
    }

    public loadLevel(levelId: number): LevelDefinition {
        if (!isValidLevelId(levelId)) {
            return this.levelFactory.create(level1EasyLayout);
        }

        switch (levelId) {
            case 0:
                return this.levelFactory.create(level1EasyLayout);
            case 1:
                return this.levelFactory.create(level2MediumLayout);
            default:
                return this.levelFactory.create(level2MediumLayout);
        }
    }
}
