import type { BaseGround, GroundSurfaceOptions } from "../environment/BaseGround";
import type { Door } from "../environment/Door";
import type { GroundTypeId } from "../environment/GroundFactory";
import type { CloudGroundOptions } from "../environment/grounds/CloudGround";
import type { BaseMonster, MonsterTuning } from "../entities/monsters/BaseMonster";
import type { MonsterTypeId } from "../entities/monsters/MonsterFactory";
import type { BaseItem } from "../entities/items/BaseItem";
import type { ItemTypeId, ItemSpawnOptionsByType } from "../entities/items/ItemFactory";

export interface LevelCoordinate {
    x: number;
    y?: number;
    z: number;
}

export interface AbsolutePlacement {
    mode: "absolute";
    position: LevelCoordinate;
}

export interface GroundPlacement {
    mode: "ground";
    groundId: string;
    offset?: LevelCoordinate;
}

export type LevelPlacement = AbsolutePlacement | GroundPlacement;

export interface SpawnSeriesDefinition {
    count?: number;
    spacing?: LevelCoordinate;
}

export type GroundDefinition =
    | {
          id: string;
          type: "cloud";
          options?: CloudGroundOptions;
      }
    | {
          id: string;
          type: Exclude<GroundTypeId, "cloud">;
          options?: GroundSurfaceOptions;
      };

export interface MonsterSpawnDefinition extends SpawnSeriesDefinition {
    type: MonsterTypeId;
    placement: LevelPlacement;
    tuning?: MonsterTuning;
}

export interface ItemSpawnDefinition extends SpawnSeriesDefinition {
    type: ItemTypeId;
    placement: LevelPlacement;
    options?: ItemSpawnOptionsByType;
}

export interface LevelLayoutDefinition {
    grounds: GroundDefinition[];
    doorCount?: number;
    monsters?: MonsterSpawnDefinition[];
    items?: ItemSpawnDefinition[];
    playerSpawn?: {
        placement: LevelPlacement;
        yaw?: number;
    };
}

export interface LevelDefinition {
    grounds: BaseGround[];
    doors: Door[];
    monsters: BaseMonster[];
    items: BaseItem[];
    playerSpawn: {
        position: LevelCoordinate;
        yaw: number;
    };
}
