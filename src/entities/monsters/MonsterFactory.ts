import { Scene, Vector3 } from "@babylonjs/core";
import type { BaseMonster, MonsterTuning } from "./BaseMonster";
import { BasicMonster } from "./BasicMonster";
import { BossMonster } from "./BossMonster";
import { FastMonster } from "./FastMonster";
import { ShooterMonster } from "./ShooterMonster";

export type MonsterTypeId = "basic" | "fast" | "shooter" | "boss";

/*
 * Factory d'instanciation des monstres.
 * Le but est de construire les monstres depuis une configuration de niveau
 * (type + position + overrides de stats).
 */
export class MonsterFactory {
    private readonly scene: Scene;

    public constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(
        type: MonsterTypeId,
        spawnPosition: Vector3,
        tuning: MonsterTuning = {}
    ): BaseMonster {
        switch (type) {
            case "basic":
                return new BasicMonster(this.scene, spawnPosition, tuning);
            case "fast":
                return new FastMonster(this.scene, spawnPosition, tuning);
            case "shooter":
                return new ShooterMonster(this.scene, spawnPosition, tuning);
            case "boss":
                return new BossMonster(this.scene, spawnPosition, tuning);
        }
    }
}
