import { Scene, Vector3 } from "@babylonjs/core";
import { Door } from "../environment/Door";
import { GroundFactory } from "../environment/GroundFactory";
import type { BaseGround } from "../environment/BaseGround";
import { MonsterFactory } from "../entities/monsters/MonsterFactory";
import type { BaseMonster } from "../entities/monsters/BaseMonster";
import { ItemFactory } from "../entities/items/ItemFactory";
import type { BaseItem } from "../entities/items/BaseItem";
import type {
    ItemSpawnDefinition,
    LevelCoordinate,
    LevelDefinition,
    LevelLayoutDefinition,
    LevelPlacement,
    MonsterSpawnDefinition
} from "./LevelTypes";

/*
 * Factory de composition d'un niveau.
 * Convertit un layout déclaratif (sols + spawns) en instances runtime.
 */
export class LevelFactory {
    private readonly scene: Scene;
    private readonly groundFactory: GroundFactory;
    private readonly monsterFactory: MonsterFactory;
    private readonly itemFactory: ItemFactory;

    public constructor(scene: Scene) {
        this.scene = scene;
        this.groundFactory = new GroundFactory(scene);
        this.monsterFactory = new MonsterFactory(scene);
        this.itemFactory = new ItemFactory(scene);
    }

    public create(layout: LevelLayoutDefinition): LevelDefinition {
        const groundsById = new Map<string, BaseGround>();
        const grounds: BaseGround[] = [];

        for (const groundDefinition of layout.grounds) {
            const ground = this.groundFactory.create(
                groundDefinition.type,
                groundDefinition.options ?? {}
            );
            grounds.push(ground);
            groundsById.set(groundDefinition.id, ground);
        }

        const playerSpawn = this.createPlayerSpawn(layout, groundsById);

        return {
            grounds,
            doors: this.createDoors(layout.doorCount),
            monsters: this.createMonsters(layout.monsters ?? [], groundsById),
            items: this.createItems(layout.items ?? [], groundsById),
            playerSpawn
        };
    }

    private createPlayerSpawn(
        layout: LevelLayoutDefinition,
        groundsById: ReadonlyMap<string, BaseGround>
    ): { position: LevelCoordinate; yaw: number } {
        const spawnLayout = layout.playerSpawn;
        const spawnPosition = spawnLayout
            ? this.resolvePlacement(spawnLayout.placement, groundsById, 1)
            : new Vector3(0, 1, 0);

        return {
            position: {
                x: spawnPosition.x,
                y: spawnPosition.y,
                z: spawnPosition.z
            },
            yaw: spawnLayout?.yaw ?? Math.PI
        };
    }

    private createDoors(doorCount?: number): Door[] {
        const count = this.normalizeCount(doorCount, 0);
        const doors: Door[] = [];

        for (let index = 0; index < count; index += 1) {
            doors.push(new Door(this.scene));
        }

        return doors;
    }

    private createMonsters(
        definitions: MonsterSpawnDefinition[],
        groundsById: ReadonlyMap<string, BaseGround>
    ): BaseMonster[] {
        const monsters: BaseMonster[] = [];

        for (const definition of definitions) {
            const positions = this.createSpawnPositions(
                definition.placement,
                definition.count,
                definition.spacing,
                groundsById,
                1
            );
            for (const position of positions) {
                monsters.push(
                    this.monsterFactory.create(
                        definition.type,
                        position,
                        definition.tuning ?? {}
                    )
                );
            }
        }

        return monsters;
    }

    private createItems(
        definitions: ItemSpawnDefinition[],
        groundsById: ReadonlyMap<string, BaseGround>
    ): BaseItem[] {
        const items: BaseItem[] = [];

        for (const definition of definitions) {
            const positions = this.createSpawnPositions(
                definition.placement,
                definition.count,
                definition.spacing,
                groundsById,
                1
            );
            for (const position of positions) {
                items.push(
                    this.itemFactory.create(
                        definition.type,
                        position,
                        definition.options ?? {}
                    )
                );
            }
        }

        return items;
    }

    private createSpawnPositions(
        placement: LevelPlacement,
        count: number | undefined,
        spacing: LevelCoordinate | undefined,
        groundsById: ReadonlyMap<string, BaseGround>,
        defaultHeight: number
    ): Vector3[] {
        const seriesCount = this.normalizeCount(count, 1);
        const basePosition = this.resolvePlacement(
            placement,
            groundsById,
            defaultHeight
        );
        const spacingVector = this.toVector3(
            spacing ?? { x: 0, y: 0, z: 0 },
            0
        );

        const positions: Vector3[] = [];
        for (let index = 0; index < seriesCount; index += 1) {
            const offset = spacingVector.scale(index);
            positions.push(basePosition.add(offset));
        }

        return positions;
    }

    private resolvePlacement(
        placement: LevelPlacement,
        groundsById: ReadonlyMap<string, BaseGround>,
        defaultHeight: number
    ): Vector3 {
        if (placement.mode === "absolute") {
            return this.toVector3(placement.position, defaultHeight);
        }

        const ground = groundsById.get(placement.groundId);
        if (!ground) {
            throw new Error(
                `Ground '${placement.groundId}' introuvable pour un spawn de niveau.`
            );
        }

        const offset = placement.offset ?? { x: 0, z: 0 };
        return ground.getAnchorPosition(
            offset.x,
            offset.z,
            offset.y ?? defaultHeight
        );
    }

    private toVector3(coordinate: LevelCoordinate, defaultY: number): Vector3 {
        return new Vector3(coordinate.x, coordinate.y ?? defaultY, coordinate.z);
    }

    private normalizeCount(value: number | undefined, fallback: number): number {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            return fallback;
        }

        return Math.max(0, Math.floor(value));
    }
}
