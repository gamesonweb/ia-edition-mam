import {
    Mesh,
    MeshBuilder,
    PhysicsImpostor,
    Quaternion,
    Ray,
    Scene,
    Vector3
} from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core";
import { InputManager } from "../../core/InputManager.ts";
import type { CameraMovementBasis, PlayerSpawnTransform } from "../../core/SceneManager.ts";
import type { BaseGround, GroundMeshMetadata } from "../../environment/BaseGround.ts";
import { CloudGround } from "../../environment/grounds/CloudGround.ts";
import { normalizeAngle } from "../../utils/angleUtils.ts";
import { PlayerAnimationController } from "./PlayerAnimationController.ts";

/*
 * Classe du joueur
 * Gère la création du mesh du joueur, mouvement, sauts et positionnement
 * Utilise la physique pour les collisions et les mouvements (réalisme)
 */

export class Player {
    public readonly mesh: Mesh;
    public readonly baseSpeed = 5.5;
    public readonly baseJumpSpeed = 6.0;
    private readonly movementSharpness = 20;
    private readonly rotationSpeed = 8;
    public movementSpeedMultiplier = 1;
    public jumpSpeedMultiplier = 1;
    public canJump = true;

    private readonly scene: Scene;
    private readonly input: InputManager;
    private readonly groundMeshes: Set<AbstractMesh>;
    private readonly animationController: PlayerAnimationController;
    private readonly groundCheckDistance = 1.2;
    private readonly fallRespawnY = -12;
    private readonly cloudDetachDuration = 0.2;
    private readonly wallAndCeilingCheckDistance = 0.7;
    private readonly spawnPosition = new Vector3(0, 1, 0);
    private spawnYaw = Math.PI;

    private isGrounded = false;
    private jumpCooldown = 0;
    private wasJumpKeyDown = false;
    private currentGround: BaseGround | null = null;
    private readonly groundVelocity = Vector3.Zero();
    private quicksandSinkLevel = 0;
    private isInQuicksand = false;
    private cloudDetachTimer = 0;
    private pendingHazardDeath = false;
    private hasForwardInput = false;
    private readonly lockedForwardBackAxis = new Vector3(0, 0, 1);
    private isForwardBackAxisLocked = false;
    private didJumpThisFrame = false;
    private isControlLocked = false;
    private currentYaw = Math.PI;

    public constructor(
        scene: Scene,
        input: InputManager,
        groundMeshes: AbstractMesh[],
        spawnTransform?: PlayerSpawnTransform
    ) {
        this.scene = scene;
        this.input = input;
        this.groundMeshes = new Set(groundMeshes);

        if (spawnTransform) {
            this.spawnPosition.copyFrom(spawnTransform.position);
            this.spawnYaw = spawnTransform.yaw;
            this.currentYaw = spawnTransform.yaw;
        }

        // Conserver le cube comme corps physique/collision pour ne pas impacter la logique gameplay.
        // Le rendu visible du joueur est attaché via PlayerAnimationController.
        this.mesh = MeshBuilder.CreateBox(
            "player",
            { width: 1, depth: 1, height: 2 },
            scene
        );
        this.mesh.position = this.spawnPosition.clone();
        this.mesh.isPickable = false;
        this.mesh.isVisible = false;
        this.mesh.physicsImpostor = new PhysicsImpostor(
            this.mesh,
            PhysicsImpostor.BoxImpostor,
            { mass: 1, friction: 0.8, restitution: 0 },
            scene
        );

        this.applySpawnTransform(true);

        this.animationController = new PlayerAnimationController(scene, this.mesh, {
            onHitSequenceStateChange: (isActive) => {
                this.setControlLocked(isActive);
            }
        });
        void this.animationController.initialize();
    }

    private isTouchingWallOrCeiling(): boolean {
        if (this.isGrounded) {
            return false;
        }

        const origin = this.mesh.position;
        const directions = [
            Vector3.Right(),
            Vector3.Left(),
            Vector3.Forward(),
            Vector3.Backward(),
            Vector3.Up()
        ];

        for (const direction of directions) {
            const ray = new Ray(origin, direction, this.wallAndCeilingCheckDistance);
            const pick = this.scene.pickWithRay(ray, (mesh) => this.groundMeshes.has(mesh));

            if (pick?.hit) {
                return true;
            }
        }

        return false;
    }

    private applyAntiWallStick(): void {
        const impostor = this.mesh.physicsImpostor;
        if (!impostor || this.isGrounded) {
            return;
        }

        if (!this.isTouchingWallOrCeiling()) {
            return;
        }

        const currentVelocity = impostor.getLinearVelocity() ?? Vector3.Zero();
        const forcedY = Math.min(currentVelocity.y, -3);
        impostor.setLinearVelocity(new Vector3(currentVelocity.x, forcedY, currentVelocity.z));
    }

    public update(
        deltaTime: number,
        movementBasis: CameraMovementBasis,
        isCameraOrbitingHorizontally: boolean
    ): void {
        const wasGrounded = this.isGrounded;
        this.didJumpThisFrame = false;
        this.jumpCooldown = Math.max(0, this.jumpCooldown - deltaTime);
        this.cloudDetachTimer = Math.max(0, this.cloudDetachTimer - deltaTime);

        this.resetGroundEffects();
        this.updateGroundedState();
        const justLanded = !wasGrounded && this.isGrounded;
        this.applyAntiWallStick();
        this.applyMovement(deltaTime, movementBasis, isCameraOrbitingHorizontally);
        this.applyGroundEffects(deltaTime);
        this.applyJump();
        this.keepUpright();
        this.updateVisualState(deltaTime);
        this.respawnIfFallenTooLow();

        this.animationController.update({
            isGrounded: this.isGrounded,
            isMoving: this.getHorizontalSpeed() > 0.35,
            justJumped: this.didJumpThisFrame,
            justLanded
        });
    }

    public getForwardDirection(): Vector3 {
        return new Vector3(Math.sin(this.currentYaw), 0, Math.cos(this.currentYaw));
    }

    public shouldAutoRecenterCamera(): boolean {
        return this.hasForwardInput;
    }

    private updateGroundedState(): void {
        const origin = this.mesh.position;
        const ray = new Ray(origin, Vector3.Down(), this.groundCheckDistance);
        const pick = this.scene.pickWithRay(ray, (mesh) => this.groundMeshes.has(mesh));
        let nextGround = pick?.hit ? this.getGroundFromMesh(pick?.pickedMesh ?? null) : null;

        // Après un saut depuis un nuage, on ignore temporairement le nuage
        // pour éviter qu'il ne rattache immédiatement le joueur.
        if (nextGround instanceof CloudGround && this.cloudDetachTimer > 0) {
            nextGround = null;
        }

        this.isGrounded = nextGround !== null;
        if (nextGround === this.currentGround) {
            return;
        }

        this.currentGround?.onPlayerExit(this);
        this.currentGround = nextGround;
        this.currentGround?.onPlayerEnter(this);
    }

    private applyGroundEffects(deltaTime: number): void {
        this.currentGround?.onPlayerStay(this, deltaTime);
    }

    private getGroundFromMesh(mesh: AbstractMesh | null): BaseGround | null {
        if (!mesh) {
            return null;
        }

        const metadata = mesh.metadata as GroundMeshMetadata | null;
        return metadata?.ground ?? null;
    }

    private resetGroundEffects(): void {
        this.movementSpeedMultiplier = 1;
        this.jumpSpeedMultiplier = 1;
        this.canJump = true;
        this.groundVelocity.setAll(0);
        this.isInQuicksand = false;
    }

    private applyMovement(
        deltaTime: number,
        movementBasis: CameraMovementBasis,
        isCameraOrbitingHorizontally: boolean
    ): void {
        const impostor = this.mesh.physicsImpostor;
        if (!impostor) {
            return;
        }

        if (this.isControlLocked) {
            this.hasForwardInput = false;
            this.isForwardBackAxisLocked = false;

            const currentVelocity = impostor.getLinearVelocity() ?? Vector3.Zero();
            impostor.setLinearVelocity(new Vector3(0, currentVelocity.y, 0));

            if (this.isGrounded && this.currentGround instanceof CloudGround) {
                this.mesh.position.y = this.currentGround.getTopY() + 1;
                impostor.setLinearVelocity(Vector3.Zero());
            }

            return;
        }

        const inputDirection = new Vector3(0, 0, 0);

        if (this.input.isKeyDown("KeyW") || this.input.isKeyDown("KeyZ")) {
            inputDirection.z += 1;
        }
        if (this.input.isKeyDown("KeyS")) {
            inputDirection.z -= 1;
        }
        if (this.input.isKeyDown("KeyA") || this.input.isKeyDown("KeyQ")) {
            inputDirection.x -= 1;
        }
        if (this.input.isKeyDown("KeyD")) {
            inputDirection.x += 1;
        }

        this.hasForwardInput = inputDirection.z > 0 && inputDirection.x === 0;
        const hasMovementInput = inputDirection.lengthSquared() > 0;
        const isPureForwardBackInput = inputDirection.x === 0 && inputDirection.z !== 0;

        const currentVelocity = impostor.getLinearVelocity() ?? Vector3.Zero();
        const currentHorizontalVelocity = new Vector3(currentVelocity.x, 0, currentVelocity.z);
        const targetHorizontalVelocity = Vector3.Zero();

        if (hasMovementInput) {
            inputDirection.normalize();

            const worldDirection = Vector3.Zero();

            if (isPureForwardBackInput && !isCameraOrbitingHorizontally) {
                if (!this.isForwardBackAxisLocked) {
                    this.lockedForwardBackAxis.copyFrom(movementBasis.forward);
                    if (this.lockedForwardBackAxis.lengthSquared() < 0.0001) {
                        this.lockedForwardBackAxis.set(0, 0, 1);
                    } else {
                        this.lockedForwardBackAxis.normalize();
                    }
                    this.isForwardBackAxisLocked = true;
                }

                worldDirection.copyFrom(
                    this.lockedForwardBackAxis.scale(Math.sign(inputDirection.z))
                );
            } else {
                this.isForwardBackAxisLocked = false;
                worldDirection.copyFrom(
                    movementBasis.right
                        .scale(inputDirection.x)
                        .add(movementBasis.forward.scale(inputDirection.z))
                );
            }

            if (worldDirection.lengthSquared() > 0.0001) {
                worldDirection.normalize();
                targetHorizontalVelocity.copyFrom(
                    worldDirection.scale(this.baseSpeed * this.movementSpeedMultiplier)
                );
                this.rotateToward(worldDirection, deltaTime);
            }
        } else {
            this.isForwardBackAxisLocked = false;
        }

        const interpolationFactor = 1 - Math.exp(-this.movementSharpness * deltaTime);
        const smoothedVelocity = Vector3.Lerp(
            currentHorizontalVelocity,
            targetHorizontalVelocity,
            interpolationFactor
        );

        const platformVelocity = this.shouldInheritGroundVelocity()
            ? this.groundVelocity
            : Vector3.Zero();
        const finalVelocity = new Vector3(
            smoothedVelocity.x + platformVelocity.x,
            currentVelocity.y,
            smoothedVelocity.z + platformVelocity.z
        );

        impostor.setLinearVelocity(finalVelocity);

        if (
            this.isGrounded &&
            this.currentGround instanceof CloudGround &&
            this.cloudDetachTimer === 0
        ) {
            this.mesh.position.y = this.currentGround.getTopY() + 1;
            impostor.setLinearVelocity(new Vector3(finalVelocity.x, 0, finalVelocity.z));
        }
    }

    private applyJump(): void {
        const jumpKeyDown = this.input.isKeyDown("Space");
        const impostor = this.mesh.physicsImpostor;

        if (this.isControlLocked) {
            this.wasJumpKeyDown = jumpKeyDown;
            return;
        }

        if (!impostor) {
            this.wasJumpKeyDown = jumpKeyDown;
            return;
        }

        if (
            jumpKeyDown &&
            !this.wasJumpKeyDown &&
            this.isGrounded &&
            this.canJump &&
            this.jumpCooldown === 0
        ) {
            const currentVelocity = impostor.getLinearVelocity() ?? Vector3.Zero();
            const horizontalVelocityWithoutGroundCarry =
                this.currentGround instanceof CloudGround
                    ? currentVelocity.subtract(this.groundVelocity)
                    : currentVelocity;

            impostor.setLinearVelocity(
                new Vector3(
                    horizontalVelocityWithoutGroundCarry.x,
                    this.baseJumpSpeed * this.jumpSpeedMultiplier,
                    horizontalVelocityWithoutGroundCarry.z
                )
            );

            if (this.currentGround instanceof CloudGround) {
                this.cloudDetachTimer = this.cloudDetachDuration;
                this.isGrounded = false;
                this.currentGround.onPlayerExit(this);
                this.currentGround = null;
                this.groundVelocity.setAll(0);
            }

            this.jumpCooldown = 0.15;
            this.didJumpThisFrame = true;
        }

        this.wasJumpKeyDown = jumpKeyDown;
    }

    private keepUpright(): void {
        if (!this.mesh.rotationQuaternion) {
            this.mesh.rotationQuaternion = Quaternion.Identity();
        }

        Quaternion.FromEulerAnglesToRef(0, this.currentYaw, 0, this.mesh.rotationQuaternion);
        this.mesh.physicsImpostor?.setAngularVelocity(Vector3.Zero());
    }

    private rotateToward(direction: Vector3, deltaTime: number): void {
        const targetYaw = Math.atan2(direction.x, direction.z);
        const deltaYaw = normalizeAngle(targetYaw - this.currentYaw);
        const maxStep = this.rotationSpeed * deltaTime;
        const clampedDelta = Math.max(-maxStep, Math.min(maxStep, deltaYaw));

        this.currentYaw += clampedDelta;
    }

    private updateVisualState(deltaTime: number): void {
        if (!this.isInQuicksand) {
            this.quicksandSinkLevel = Math.max(0, this.quicksandSinkLevel - deltaTime * 2);
        }

        const sinkScaleY = 1 - this.quicksandSinkLevel * 0.25;
        this.mesh.scaling.set(1, sinkScaleY, 1);
        this.animationController.setQuicksandSinkLevel(this.quicksandSinkLevel);
    }

    private getHorizontalSpeed(): number {
        const velocity = this.mesh.physicsImpostor?.getLinearVelocity();
        if (!velocity) {
            return 0;
        }

        return Math.hypot(velocity.x, velocity.z);
    }

    public setMovementSpeedMultiplier(multiplier: number): void {
        this.movementSpeedMultiplier = multiplier;
    }

    public setJumpEnabled(enabled: boolean): void {
        this.canJump = enabled;
    }

    public setJumpSpeedMultiplier(multiplier: number): void {
        this.jumpSpeedMultiplier = multiplier;
    }

    public setGroundVelocity(velocity: Vector3): void {
        if (this.cloudDetachTimer > 0) {
            return;
        }

        this.groundVelocity.copyFrom(velocity);
    }

    public canBeCarriedByMovingGround(): boolean {
        return this.cloudDetachTimer === 0;
    }

    public applyQuicksand(deltaTime: number, sinkRate: number, deathSinkLevel: number): void {
        this.isInQuicksand = true;
        this.quicksandSinkLevel = Math.min(1.2, this.quicksandSinkLevel + sinkRate * deltaTime);

        if (this.quicksandSinkLevel >= deathSinkLevel) {
            this.pendingHazardDeath = true;
        }
    }

    public consumePendingHazardDeath(): boolean {
        if (!this.pendingHazardDeath) {
            return false;
        }

        this.pendingHazardDeath = false;
        return true;
    }

    public isBelowYThreshold(thresholdY: number): boolean {
        return this.mesh.position.y < thresholdY;
    }

    public bounce(strength: number): void {
        const impostor = this.mesh.physicsImpostor;
        if (!impostor) {
            return;
        }

        const currentVelocity = impostor.getLinearVelocity() ?? Vector3.Zero();
        impostor.setLinearVelocity(
            new Vector3(currentVelocity.x, Math.max(currentVelocity.y, strength), currentVelocity.z)
        );
        this.jumpCooldown = 0.2;
    }

    private respawnIfFallenTooLow(): void {
        if (this.mesh.position.y <= this.fallRespawnY) {
            this.respawn();
        }
    }

    private respawn(): void {
        this.respawnAtSpawnPoint();
    }

    public playHitReaction(): void {
        this.animationController.playHitReaction();
    }

    private applySpawnTransform(resetPhysicsVelocity: boolean): void {
        this.mesh.position.copyFrom(this.spawnPosition);
        this.currentYaw = this.spawnYaw;
        this.keepUpright();

        if (!resetPhysicsVelocity) {
            return;
        }

        this.mesh.physicsImpostor?.setLinearVelocity(Vector3.Zero());
        this.mesh.physicsImpostor?.setAngularVelocity(Vector3.Zero());
    }

    private setControlLocked(locked: boolean): void {
        this.isControlLocked = locked;

        if (!locked) {
            return;
        }

        this.hasForwardInput = false;
        this.isForwardBackAxisLocked = false;
    }

    public respawnAtSpawnPoint(): void {
        this.currentGround?.onPlayerExit(this);
        this.currentGround = null;
        this.mesh.position.copyFrom(this.spawnPosition);
        this.mesh.scaling.setAll(1);
        this.quicksandSinkLevel = 0;
        this.isInQuicksand = false;
        this.cloudDetachTimer = 0;
        this.pendingHazardDeath = false;
        this.jumpCooldown = 0;
        this.isForwardBackAxisLocked = false;
        this.hasForwardInput = false;
        this.didJumpThisFrame = false;
        this.setControlLocked(false);

        this.applySpawnTransform(true);
        this.isGrounded = false;
        this.wasJumpKeyDown = false;
        this.animationController.setQuicksandSinkLevel(0);
        this.animationController.resetToLocomotion();
    }

    private shouldInheritGroundVelocity(): boolean {
        if (!this.isGrounded) {
            return false;
        }

        if (this.currentGround instanceof CloudGround) {
            return this.cloudDetachTimer === 0;
        }

        return true;
    }
}
