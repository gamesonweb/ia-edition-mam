import { Scene, Vector3 } from "@babylonjs/core";
import type { BaseItem } from "./BaseItem";
import { Key, type KeyOptions } from "./Key";

export type ItemTypeId = "key";

export interface ItemSpawnOptionsByType {
    key?: Omit<KeyOptions, "position">;
}

/*
 * Factory d'instanciation des items de niveau.
 * Chaque item est créé à partir d'un type et d'une position.
 */
export class ItemFactory {
    private readonly scene: Scene;

    public constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(
        type: ItemTypeId,
        spawnPosition: Vector3,
        options: ItemSpawnOptionsByType = {}
    ): BaseItem {
        switch (type) {
            case "key":
                return new Key(this.scene, {
                    position: spawnPosition,
                    ...options.key
                });
        }
    }
}
