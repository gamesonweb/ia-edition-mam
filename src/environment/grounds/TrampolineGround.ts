import { Color3, Scene, Vector3 } from "@babylonjs/core";
import {
    BaseGround,
    DEFAULT_GROUND_THICKNESS,
    type GroundSurfaceOptions
} from "../BaseGround";
import { Player } from "../../entities/player/Player.ts";

export class TrampolineGround extends BaseGround {
    private readonly bounceStrength = 14;

    public constructor(scene: Scene, options: GroundSurfaceOptions = {}) {
        super(scene);
        this.createGroundSurface(
            "trampolineGround",
            options.position ?? new Vector3(24, 0, 0),
            new Color3(0.9, 0.18, 0.5),
            options.width ?? 12,
            options.depth ?? 12,
            options.alpha ?? 1,
            options.thickness ?? DEFAULT_GROUND_THICKNESS
        );
    }

    public override onPlayerEnter(player: Player): void {
        player.bounce(this.bounceStrength);
    }
}
