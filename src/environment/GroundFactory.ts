import { Scene } from "@babylonjs/core";
import { BaseGround } from "./BaseGround";
import { BasicGround } from "./grounds/BasicGround";
import { CaveGround } from "./grounds/CaveGround";
import { CloudGround } from "./grounds/CloudGround";
import { GrassGround } from "./grounds/GrassGround";
import { QuicksandGround } from "./grounds/QuicksandGround";
import { SandGround } from "./grounds/SandGround";
import { TrampolineGround } from "./grounds/TrampolineGround";
import type { GroundSurfaceOptions } from "./BaseGround";
import type { CloudGroundOptions } from "./grounds/CloudGround";

export type GroundTypeId =
    | "basic"
    | "grass"
    | "sand"
    | "quicksand"
    | "cave"
    | "cloud"
    | "trampoline";

export type GroundOptions = GroundSurfaceOptions | CloudGroundOptions;

/*
 * Cette classe est une factory pour créer différents types de terrains.
 * Actuellement, ne crée que des terrains basiques, mais peut être étendue pour créer des terrains plus complexes.
 * Prend une instance de Scene en paramètre, utilisée pour créer les terrains dans la scène du jeu.
 */

export class GroundFactory {
    private readonly scene: Scene;

    public constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(type: GroundTypeId, options: GroundOptions = {}): BaseGround {
        switch (type) {
            case "basic":
                return new BasicGround(this.scene, options);
            case "grass":
                return new GrassGround(this.scene, options);
            case "sand":
                return new SandGround(this.scene, options);
            case "quicksand":
                return new QuicksandGround(this.scene, options);
            case "cave":
                return new CaveGround(this.scene, options);
            case "cloud":
                return new CloudGround(this.scene, options);
            case "trampoline":
                return new TrampolineGround(this.scene, options);
        }
    }

    public createBasic(): BasicGround {
        return new BasicGround(this.scene);
    }

    public createAll(): BaseGround[] {
        return [
            this.create("basic"),
            this.create("grass"),
            this.create("sand"),
            this.create("quicksand"),
            this.create("cave"),
            this.create("cloud"),
            this.create("trampoline")
        ];
    }
}
