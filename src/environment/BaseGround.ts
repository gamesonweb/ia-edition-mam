import {
    Color3,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Player } from "../entities/player/Player.ts";

/*
 * Classe de base pour les types de sol, gère les interactions avec le joueur (entrée, séjour, sortie).
 * Les types de sol spécifiques étendent cette classe et implémentent les comportements spécifiques.
 */

export interface GroundMeshMetadata {
    ground: BaseGround;
}

export interface GroundSurfaceOptions {
    position?: Vector3;
    width?: number;
    depth?: number;
    alpha?: number;
    thickness?: number;
}

export const DEFAULT_GROUND_THICKNESS = 0.6;

export abstract class BaseGround {
    protected readonly scene: Scene;
    protected readonly meshes: AbstractMesh[] = [];

    protected constructor(scene: Scene) {
        this.scene = scene;
    }

    public getGroundMeshes(): AbstractMesh[] {
        return this.meshes;
    }

    public getAnchorPosition(
        offsetX = 0,
        offsetZ = 0,
        verticalOffset = 0
    ): Vector3 {
        const primaryMesh = this.meshes[0];
        if (!primaryMesh) {
            return new Vector3(offsetX, verticalOffset, offsetZ);
        }

        const center = primaryMesh.getAbsolutePosition();
        const topY = center.y + primaryMesh.getBoundingInfo().boundingBox.extendSizeWorld.y;

        return new Vector3(center.x + offsetX, topY + verticalOffset, center.z + offsetZ);
    }

    public onPlayerEnter(player: Player): void {
        void player;
    }

    public onPlayerStay(player: Player, deltaTime: number): void {
        void player;
        void deltaTime;
    }

    public onPlayerExit(player: Player): void {
        void player;
    }

    public update(deltaTime: number): void {
        void deltaTime;
    }

    public getTopY(): number {
        const mesh = this.meshes[0];
        if (!mesh) {
            return 0;
        }

        return mesh.getBoundingInfo().boundingBox.maximumWorld.y;
    }

    protected createGroundSurface(
        name: string,
        position: Vector3,
        color: Color3,
        width = 12,
        depth = 12,
        alpha = 1,
        thickness = DEFAULT_GROUND_THICKNESS
    ): Mesh {
        const ground = MeshBuilder.CreateBox(
            name,
            { width, depth, height: thickness },
            this.scene
        );
        ground.position = new Vector3(
            position.x,
            position.y - thickness / 2,
            position.z
        );

        const material = new StandardMaterial(`${name}Material`, this.scene);
        material.diffuseColor = color;
        material.alpha = alpha;

        ground.material = material;
        ground.isPickable = true;
        ground.physicsImpostor = new PhysicsImpostor(
            ground,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, friction: 0.9, restitution: 0.1 },
            this.scene
        );

        ground.metadata = { ground: this } satisfies GroundMeshMetadata;
        this.meshes.push(ground);

        return ground;
    }
}
