import {
    Color3,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";
import { BaseItem } from "./BaseItem";

export interface KeyOptions {
    position?: Vector3;
    keyId?: string;
    canInteractWithPlayer?: boolean;
}

export class Key extends BaseItem {
    public readonly mesh: Mesh;
    public readonly keyId: string;
    public readonly canInteractWithPlayer: boolean;
    private readonly baseY: number;
    private readonly bobAmplitude = 0.12;
    private readonly bobSpeed = 2.2;
    private elapsedTime = 0;

    public constructor(scene: Scene, options: KeyOptions = {}) {
        super();

        this.keyId = options.keyId ?? "default-key";
        this.canInteractWithPlayer = options.canInteractWithPlayer ?? true;

        const position = options.position ?? new Vector3(0, 1, 0);
        this.mesh = MeshBuilder.CreateTorus(
            `key-${this.keyId}`,
            { diameter: 0.55, thickness: 0.12, tessellation: 18 },
            scene
        );
        this.mesh.position.copyFrom(position);
        this.mesh.isPickable = true;

        const material = new StandardMaterial(`keyMaterial-${this.keyId}`, scene);
        material.diffuseColor = new Color3(0.96, 0.82, 0.18);
        material.emissiveColor = new Color3(0.26, 0.18, 0.04);
        this.mesh.material = material;

        this.baseY = this.mesh.position.y;
    }

    public override update(deltaTime: number): void {
        this.elapsedTime += deltaTime;
        this.mesh.position.y = this.baseY + Math.sin(this.elapsedTime * this.bobSpeed) * this.bobAmplitude;
        this.mesh.rotation.y += deltaTime * 1.4;
    }
}
