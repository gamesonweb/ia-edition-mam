import { Color3, Scene, Vector3 } from "@babylonjs/core";
import {
    BaseGround,
    DEFAULT_GROUND_THICKNESS,
    type GroundSurfaceOptions
} from "../BaseGround";
import { Player } from "../../entities/player/Player.ts";

export class QuicksandGround extends BaseGround {
    private readonly speedMultiplier = 0.3;
    private readonly jumpSpeedMultiplier = 0.2;
    private readonly sinkRate = 0.2;
    private readonly deathSinkLevel = 1;

    public constructor(scene: Scene, options: GroundSurfaceOptions = {}) {
        super(scene);
        this.createGroundSurface(
            "quicksandGround",
            options.position ?? new Vector3(0, 0, 12),
            new Color3(0.72, 0.56, 0.26),
            options.width ?? 12,
            options.depth ?? 12,
            options.alpha ?? 1,
            options.thickness ?? DEFAULT_GROUND_THICKNESS
        );
    }

    public override onPlayerStay(player: Player, deltaTime: number): void {
        player.setMovementSpeedMultiplier(this.speedMultiplier);
        player.setJumpSpeedMultiplier(this.jumpSpeedMultiplier);
        player.applyQuicksand(deltaTime, this.sinkRate, this.deathSinkLevel);
    }
}
