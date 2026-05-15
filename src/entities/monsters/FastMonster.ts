import { Color3, Scene, Vector3 } from "@babylonjs/core";
import { BaseMonster, type MonsterTuning } from "./BaseMonster";

export class FastMonster extends BaseMonster {
    public constructor(
        scene: Scene,
        spawnPosition = new Vector3(0, 1, 0),
        tuning: MonsterTuning = {}
    ) {
        super(scene, {
            name: "fastMonster",
            position: spawnPosition,
            color: new Color3(0.96, 0.43, 0.17),
            speed: tuning.speed ?? 1.25,
            damage: tuning.damage ?? 1,
            hp: tuning.hp ?? Number.MAX_SAFE_INTEGER,
            size: tuning.size ?? 0.8,
            isStatic: tuning.isStatic ?? false,
            patrolRadius: tuning.patrolRadius ?? 3.2,
            detectionRadius: tuning.detectionRadius ?? 10
        });
    }

    public override update(playerPosition: Vector3, deltaSeconds: number): void {
        this.applyStandardBehaviour(playerPosition, deltaSeconds);
    }
}
