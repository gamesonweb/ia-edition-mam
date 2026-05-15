import { Color3, Scene, Vector3 } from "@babylonjs/core";
import { BaseMonster, type MonsterTuning } from "./BaseMonster";

export class BossMonster extends BaseMonster {
    public constructor(
        scene: Scene,
        spawnPosition = new Vector3(0, 1, 0),
        tuning: MonsterTuning = {}
    ) {
        super(scene, {
            name: "bossMonster",
            position: spawnPosition,
            color: new Color3(0.68, 0.11, 0.11),
            speed: tuning.speed ?? 1,
            damage: tuning.damage ?? 3,
            hp: tuning.hp ?? Number.MAX_SAFE_INTEGER,
            size: tuning.size ?? 2,
            isStatic: tuning.isStatic ?? false,
            patrolRadius: tuning.patrolRadius ?? 2.8,
            detectionRadius: tuning.detectionRadius ?? 9
        });
    }

    public override update(playerPosition: Vector3, deltaSeconds: number): void {
        this.applyStandardBehaviour(playerPosition, deltaSeconds);
    }
}
