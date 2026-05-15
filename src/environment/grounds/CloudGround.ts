import { Color3, Scene, Vector3 } from "@babylonjs/core";
import {
    BaseGround,
    DEFAULT_GROUND_THICKNESS,
    type GroundSurfaceOptions
} from "../BaseGround";
import { Player } from "../../entities/player/Player.ts";

export interface CloudGroundOptions extends GroundSurfaceOptions {
    travelAmplitude?: Vector3;
    oscillationSpeed?: number;
    zOscillationSpeedMultiplier?: number;
}

export class CloudGround extends BaseGround {
    private readonly basePosition: Vector3;
    private readonly travelAmplitude: Vector3;
    private readonly oscillationSpeed: number;
    private readonly zOscillationSpeedMultiplier: number;
    private readonly movementVelocity = Vector3.Zero();
    private elapsedTime = 0;
    private previousPosition: Vector3;

    public constructor(scene: Scene, options: CloudGroundOptions = {}) {
        super(scene);
        this.basePosition = options.position ?? new Vector3(12, 0, 12);
        this.travelAmplitude = options.travelAmplitude ?? new Vector3(2.5, 0, 1.4);
        this.oscillationSpeed = options.oscillationSpeed ?? 2;
        this.zOscillationSpeedMultiplier = options.zOscillationSpeedMultiplier ?? 0.8;
        this.previousPosition = this.basePosition.clone();
        const ground = this.createGroundSurface(
            "cloudGround",
            this.basePosition,
            new Color3(0.93, 0.96, 1),
            options.width ?? 12,
            options.depth ?? 12,
            options.alpha ?? 0.92,
            options.thickness ?? DEFAULT_GROUND_THICKNESS
        );
        this.previousPosition.copyFrom(ground.position);
    }

    public override update(deltaTime: number): void {
        this.elapsedTime += deltaTime;

        const nextPosition = new Vector3(
            this.basePosition.x + Math.sin(this.elapsedTime * this.oscillationSpeed) * this.travelAmplitude.x,
            this.basePosition.y,
            this.basePosition.z + Math.cos(this.elapsedTime * this.oscillationSpeed * this.zOscillationSpeedMultiplier) * this.travelAmplitude.z
        );
        const delta = nextPosition.subtract(this.previousPosition);
        this.movementVelocity.copyFrom(
            delta.scale(1 / Math.max(deltaTime, 0.0001))
        );

        const mesh = this.meshes[0];
        mesh.position.copyFrom(nextPosition);
        mesh.physicsImpostor?.forceUpdate();
        this.previousPosition.copyFrom(nextPosition);
    }

    public override onPlayerStay(player: Player, deltaTime: number): void {
        if (!player.canBeCarriedByMovingGround()) {
            return;
        }

        player.setGroundVelocity(this.movementVelocity);

        // si le joueur est bien sur le nuage, appliquer un décalage direct garanti (pour éviter tout slipping)
        if (deltaTime > 0) {
            const offset = this.movementVelocity.scale(deltaTime);
            player.mesh.position.addInPlace(offset);
        }
    }
}
