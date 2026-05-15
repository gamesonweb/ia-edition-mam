import { Color3, Scene, Vector3 } from "@babylonjs/core";
import {
    BaseGround,
    DEFAULT_GROUND_THICKNESS,
    type GroundSurfaceOptions
} from "../BaseGround";

export class GrassGround extends BaseGround {
    public constructor(scene: Scene, options: GroundSurfaceOptions = {}) {
        super(scene);
        this.createGroundSurface(
            "grassGround",
            options.position ?? new Vector3(12, 0, 0),
            new Color3(0.24, 0.65, 0.26),
            options.width ?? 12,
            options.depth ?? 12,
            options.alpha ?? 1,
            options.thickness ?? DEFAULT_GROUND_THICKNESS
        );
    }
}
