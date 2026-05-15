import {
    Color3,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import {
    BaseGround,
    DEFAULT_GROUND_THICKNESS,
    type GroundSurfaceOptions
} from "../BaseGround";
import { Player } from "../../entities/player/Player.ts";

export class CaveGround extends BaseGround {
    public constructor(scene: Scene, options: GroundSurfaceOptions = {}) {
        super(scene);
        const position = options.position ?? new Vector3(-12, 0, 12);
        const width = options.width ?? 12;
        const depth = options.depth ?? 12;
        const thickness = options.thickness ?? DEFAULT_GROUND_THICKNESS;

        this.createGroundSurface(
            "caveGround",
            position,
            new Color3(0.27, 0.27, 0.32),
            width,
            depth,
            options.alpha ?? 1,
            thickness
        );

        const ceiling = MeshBuilder.CreateBox(
            "caveCeiling",
            { width, depth, height: 400 },
            this.scene
        );
        ceiling.position = new Vector3(position.x, position.y + 2.6, position.z);

        const ceilingMaterial = new StandardMaterial("caveCeilingMaterial", this.scene);
        ceilingMaterial.diffuseColor = new Color3(0.16, 0.16, 0.2);
        ceiling.material = ceilingMaterial;
        ceiling.physicsImpostor = new PhysicsImpostor(
            ceiling,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, friction: 0.9, restitution: 0 },
            this.scene
        );
    }

    public override onPlayerStay(player: Player): void {
        player.setJumpEnabled(false);
    }
}
