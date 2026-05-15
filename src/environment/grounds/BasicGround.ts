import { Color3, Scene, Vector3 } from "@babylonjs/core";
import {
    BaseGround,
    DEFAULT_GROUND_THICKNESS,
    type GroundSurfaceOptions
} from "../BaseGround";

export class BasicGround extends BaseGround {
    public constructor(scene: Scene, options: GroundSurfaceOptions = {}) {
        super(scene);
        this.createGroundSurface(
            "basicGround",
            options.position ?? new Vector3(0, 0, 0),
            new Color3(0.45, 0.4, 0.35),
            options.width ?? 12,
            options.depth ?? 12,
            options.alpha ?? 1,
            options.thickness ?? DEFAULT_GROUND_THICKNESS
        );
    }
}
