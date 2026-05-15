import "@babylonjs/core/Physics/physicsEngineComponent";
import {
    ArcRotateCamera,
    Engine,
    HemisphericLight,
    Scene,
    Vector3
} from "@babylonjs/core";
import type { AbstractMesh, Camera } from "@babylonjs/core";
import { CannonJSPlugin } from "@babylonjs/core/Physics/Plugins/cannonJSPlugin";
import * as CANNON from "cannon-es";
import type { BaseGround } from "../environment/BaseGround";
import { LevelLoader } from "../levels/LevelLoader";
import type { BaseMonster } from "../entities/monsters/BaseMonster";
import type { BaseItem } from "../entities/items/BaseItem";
import { normalizeAngle } from "../utils/angleUtils";


// définit la base de mouvement de la cam pour les entités en fonction de l'orientation de la cam
export interface CameraMovementBasis {
    forward: Vector3;
    right: Vector3;
}

export interface PlayerSpawnTransform {
    position: Vector3;
    yaw: number;
}


/*
 * Classe de gestion de la scène, de la caméra et des éléments de base comme le sol.
 * S'occupe aussi de configurer la physique et fournir une référence aux meshes du sol pour les autres entités.
 */

export class SceneManager {
    public readonly scene: Scene;                       // instance de la scène Babylon (lumières, caméras, meshes, etc.)
    public readonly groundMeshes: AbstractMesh[] = [];  // liste des meshes du sol (utilisés pour collisions et détection de sol par le joueur)
    public readonly grounds: BaseGround[] = [];
    public readonly monsters: BaseMonster[] = [];
    public readonly items: BaseItem[] = [];
    private readonly canvas: HTMLCanvasElement;         // ref au canvas HTML pour attacher les contrôles de la cam
    private readonly camera: ArcRotateCamera;           // caméra principale du jeu (suit le joueur)
    private readonly cameraFollowSharpness = 6;     // niveau suivi de la cam
    private readonly manualOrbitCooldownDuration = 0.2;
    private readonly voidFallThresholdY: number;
    private readonly playerSpawn: PlayerSpawnTransform;
    private manualOrbitCooldown = 0;

    public constructor(engine: Engine, canvas: HTMLCanvasElement, levelId: number) {
        this.canvas = canvas;

        // créer la scène
        this.scene = new Scene(engine);

        // configurer la physique avec Cannon.js (gravité)
        // valeur plus forte pour un retour au sol plus rapide (= saut plus rapide, moins de flottement)
        const gravity = new Vector3(0, -10, 0);
        const physicsPlugin = new CannonJSPlugin(true, 10, CANNON);
        this.scene.enablePhysics(gravity, physicsPlugin);

        // ajouter une lumière pour éclairer la scène (hémisphérique)
        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // configurer la caméra (ArcRotateCamera pour suivre le joueur)
        this.camera = new ArcRotateCamera(
            "camera",
            Math.PI / 2,                    // angle horizontal initial
            Math.PI / 3,                    // angle vertical initial (environ 60 degrés)
            8,                      // distance initiale de la cible
            new Vector3(0, 2, 0), // 2 de hauteur
            this.scene
        );

        // Important: garantir explicitement une caméra active avant tout rendu.
        this.scene.activeCamera = this.camera;
        this.camera.attachControl(canvas, false);
        this.applyInvertedArrowMapping(); // config les touches fléchées pour contrôler la cam (inversé)

        this.camera.lowerBetaLimit = 0.35;           // limite de vision haut
        this.camera.upperBetaLimit = 1.35;           // limite de vision bas
        this.camera.inertia = 0.8;
        this.camera.panningSensibility = 0;
        this.camera.wheelDeltaPercentage = 0.01;
        this.camera.radius = 8;
        this.camera.lowerRadiusLimit = 4;
        this.camera.upperRadiusLimit = 14;

        const levelLoader = new LevelLoader(this.scene);
        const level = levelLoader.loadLevel(levelId);
        this.grounds.push(...level.grounds);
        this.monsters.push(...level.monsters);
        this.items.push(...level.items);
        for (const ground of this.grounds) {
            this.groundMeshes.push(...ground.getGroundMeshes());
        }

        this.playerSpawn = {
            position: new Vector3(
                level.playerSpawn.position.x,
                level.playerSpawn.position.y ?? 1,
                level.playerSpawn.position.z
            ),
            yaw: level.playerSpawn.yaw
        };

        this.voidFallThresholdY = this.computeVoidFallThresholdY();
    }

    public getPlayerSpawn(): PlayerSpawnTransform {
        return {
            position: this.playerSpawn.position.clone(),
            yaw: this.playerSpawn.yaw
        };
    }

    private applyInvertedArrowMapping(): void {
        this.camera.keysLeft = [39];   // ArrowRight
        this.camera.keysRight = [37];  // ArrowLeft
        this.camera.keysUp = [40];     // ArrowDown
        this.camera.keysDown = [38];   // ArrowUp
    }

    // définit la cible de la caméra (joueur)
    public setPlayerTarget(target: AbstractMesh): void {
        this.scene.activeCamera = this.camera;
        this.camera.lockedTarget = target;
    }

    // active ou désactive les contrôles de la caméra (util pour désactiver la cam pendant le menu)
    public setCameraControlEnabled(enabled: boolean): void {
        this.scene.activeCamera = this.camera;

        if (enabled) {
            this.camera.attachControl(this.canvas, false);
            this.applyInvertedArrowMapping();
            return;
        }

        this.camera.detachControl();
    }

    // update la rotation de la cam pour suivre le joueur (à la 3e personne)
    public updateCameraBehindPlayer(
        playerForward: Vector3,
        deltaTime: number,
        shouldRecenter: boolean
    ): void {
        const isOrbitingHorizontally = this.isCameraOrbitingHorizontally();
        if (isOrbitingHorizontally) {
            this.manualOrbitCooldown = this.manualOrbitCooldownDuration;
        } else {
            this.manualOrbitCooldown = Math.max(0, this.manualOrbitCooldown - deltaTime);
        }

        if (!shouldRecenter) {
            return;
        }
        if (isOrbitingHorizontally || this.manualOrbitCooldown > 0) {
            return;
        }

        const flatForward = playerForward.clone();
        flatForward.y = 0;

        if (flatForward.lengthSquared() < 0.0001) {
            return;
        }

        flatForward.normalize();
        const desiredAlpha = Math.atan2(-flatForward.z, -flatForward.x);
        const alphaDelta = normalizeAngle(desiredAlpha - this.camera.alpha);
        const interpolationFactor = 1 - Math.exp(-this.cameraFollowSharpness * deltaTime);

        this.camera.alpha += alphaDelta * interpolationFactor;
    }

    // check si la cam est en train d'être tournée manuellement (en se basant sur l'inertie de la cam)
    // pour différencier le suivi automatique et la rotation manuelle de la cam (éviter conflits)
    public isCameraOrbitingHorizontally(): boolean {
        return Math.abs(this.camera.inertialAlphaOffset) > 0.00005;
    }

    // calcule la base de mouvement pour les entités en fonction de l'orientation de la cam (forward et right)
    public getMovementBasis(): CameraMovementBasis {
        const forward = this.camera
            .getForwardRay()
            .direction
            .clone();
        forward.y = 0;

        if (forward.lengthSquared() < 0.0001) {
            forward.set(0, 0, 1);
        } else {
            forward.normalize();
        }

        const right = Vector3.Cross(Vector3.Up(), forward).normalize();

        return { forward, right };
    }

    public getVoidFallThresholdY(): number {
        return this.voidFallThresholdY;
    }

    public ensureActiveCamera(): boolean {
        if (this.scene.isDisposed) {
            return false;
        }

        const activeCameras = this.scene.activeCameras;
        if (activeCameras && activeCameras.length > 0) {
            const validActiveCameras: Camera[] = [];
            let hasInvalidCamera = false;

            for (const camera of activeCameras) {
                if (camera && !camera.isDisposed()) {
                    validActiveCameras.push(camera);
                } else {
                    hasInvalidCamera = true;
                }
            }

            if (hasInvalidCamera) {
                this.scene.activeCameras =
                    validActiveCameras.length > 0 ? validActiveCameras : null;
            }
        }

        const currentActiveCamera = this.scene.activeCamera;
        if (currentActiveCamera && !currentActiveCamera.isDisposed()) {
            return true;
        }

        const fallbackCamera = this.getFallbackCamera();
        if (!fallbackCamera) {
            return false;
        }

        this.scene.activeCamera = fallbackCamera;
        return true;
    }

    private computeVoidFallThresholdY(): number {
        if (this.groundMeshes.length === 0) {
            return -12;
        }

        let minimumY = Number.POSITIVE_INFINITY;
        for (const mesh of this.groundMeshes) {
            mesh.computeWorldMatrix(true);
            const meshMinY = mesh.getBoundingInfo().boundingBox.minimumWorld.y;
            if (!Number.isFinite(meshMinY)) {
                continue;
            }

            if (meshMinY < minimumY) {
                minimumY = meshMinY;
            }
        }

        if (!Number.isFinite(minimumY)) {
            return -12;
        }

        return minimumY - 10;
    }

    private getFallbackCamera(): Camera | null {
        if (!this.camera.isDisposed()) {
            return this.camera;
        }

        for (const sceneCamera of this.scene.cameras) {
            if (!sceneCamera.isDisposed()) {
                return sceneCamera;
            }
        }

        return null;
    }

    // nettoie les ressources utilisées par la scène (meshes, matériaux, physique, etc.)
    public dispose(): void {
        this.scene.dispose();
    }
}
