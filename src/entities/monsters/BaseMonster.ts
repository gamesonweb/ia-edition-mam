import {
    Color3,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";

/*
 * Classe de base pour les monstres.
 * Définit les propriétés communes à tous les monstres.
 * Méthode update abstraite doit être implémentée par chaque type de monstre.
 */

export interface MonsterTuning {
    speed?: number;
    damage?: number;
    hp?: number;
    size?: number;
    isStatic?: boolean;
    patrolRadius?: number;
    detectionRadius?: number;
}

export abstract class BaseMonster {
    public speed = 0;
    public damage = 0;
    public hp = Number.MAX_SAFE_INTEGER;
    public size = 1;
    public isStatic = false;
    public readonly mesh: Mesh;

    protected readonly scene: Scene;
    protected readonly spawnPosition: Vector3;
    private damageCooldownRemaining = 0;

    private readonly patrolRadius: number;
    private readonly detectionRadius: number;
    private readonly groundY: number;
    private patrolDirection = 1;
    private state: "patrol" | "chase" | "return" = "patrol";

    protected constructor(scene: Scene, config: MonsterConfig) {
        this.scene = scene;
        this.speed = config.speed;
        this.damage = config.damage;
        this.hp = config.hp;
        this.size = config.size;
        this.isStatic = config.isStatic;

        this.spawnPosition = config.position.clone();
        this.patrolRadius = config.patrolRadius;
        this.detectionRadius = config.detectionRadius;
        this.groundY = this.spawnPosition.y;

        this.mesh = MeshBuilder.CreateCylinder(
            config.name,
            { diameter: 0.95, height: 1.8, tessellation: 10 },
            this.scene
        );
        this.mesh.scaling.setAll(this.size);
        this.mesh.position.copyFrom(this.spawnPosition);
        this.mesh.isPickable = false;

        const material = new StandardMaterial(`${config.name}Material`, this.scene);
        material.diffuseColor = config.color;
        material.emissiveColor = config.color.scale(0.15);
        this.mesh.material = material;
    }

    public abstract update(playerPosition: Vector3, deltaSeconds: number): void;

    public processProjectiles(_playerMesh: Mesh): number {
        return 0;
    }

    protected applyStandardBehaviour(playerPosition: Vector3, deltaSeconds: number): void {
        this.updateState(playerPosition);

        switch (this.state) {
            case "chase":
                this.moveTowards(playerPosition, deltaSeconds);
                break;
            case "return":
                this.moveTowards(this.spawnPosition, deltaSeconds);
                break;
            case "patrol":
                this.patrol(deltaSeconds);
                break;
        }

        this.updateDamageCooldown(deltaSeconds);
        this.mesh.position.y = this.groundY;
    }

    protected isPlayerInsideDetectionZone(playerPosition: Vector3): boolean {
        const flatToPlayer = playerPosition.subtract(this.spawnPosition);
        flatToPlayer.y = 0;

        return flatToPlayer.lengthSquared() <= this.detectionRadius * this.detectionRadius;
    }

    protected faceTarget(targetPosition: Vector3): void {
        const toTarget = targetPosition.subtract(this.mesh.position);
        toTarget.y = 0;
        if (toTarget.lengthSquared() < 0.0001) {
            return;
        }

        this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    }

    private updateState(playerPosition: Vector3): void {
        if (this.isPlayerInsideDetectionZone(playerPosition)) {
            this.state = "chase";
            return;
        }

        const toSpawn = this.mesh.position.subtract(this.spawnPosition);
        toSpawn.y = 0;

        this.state = toSpawn.lengthSquared() > 0.04 ? "return" : "patrol";
    }

    private patrol(deltaSeconds: number): void {
        if (this.isStatic || this.speed <= 0 || this.patrolRadius <= 0) {
            return;
        }

        const minX = this.spawnPosition.x - this.patrolRadius;
        const maxX = this.spawnPosition.x + this.patrolRadius;
        const nextX = this.mesh.position.x + this.patrolDirection * this.speed * deltaSeconds;

        if (nextX <= minX) {
            this.mesh.position.x = minX;
            this.patrolDirection = 1;
            return;
        }

        if (nextX >= maxX) {
            this.mesh.position.x = maxX;
            this.patrolDirection = -1;
            return;
        }

        this.mesh.position.x = nextX;
    }

    private moveTowards(targetPosition: Vector3, deltaSeconds: number): void {
        if (this.isStatic || this.speed <= 0) {
            return;
        }

        const toTarget = targetPosition.subtract(this.mesh.position);
        toTarget.y = 0;
        const distance = toTarget.length();
        if (distance < 0.0001) {
            return;
        }

        const maxStep = this.speed * deltaSeconds;
        if (distance <= maxStep) {
            this.mesh.position.x = targetPosition.x;
            this.mesh.position.z = targetPosition.z;
        } else {
            toTarget.scaleInPlace(maxStep / distance);
            this.mesh.position.addInPlace(toTarget);
        }

        this.faceTarget(targetPosition);
    }

    public canDamagePlayer(): boolean {
        return this.damageCooldownRemaining <= 0;
    }

    public applyDamageCooldown(duration: number): void {
        this.damageCooldownRemaining = Math.max(this.damageCooldownRemaining, duration);
    }

    public applyKnockback(direction: Vector3, strength: number): void {
        if (direction.lengthSquared() < 0.0001) {
            return;
        }

        const knockback = direction.normalize().scale(strength);
        this.mesh.position.addInPlace(knockback);
        this.mesh.position.y = this.groundY;
    }

    private updateDamageCooldown(deltaSeconds: number): void {
        this.damageCooldownRemaining = Math.max(0, this.damageCooldownRemaining - deltaSeconds);
    }
}

interface MonsterConfig {
    name: string;
    position: Vector3;
    color: Color3;
    speed: number;
    damage: number;
    size: number;
    hp: number;
    isStatic: boolean;
    patrolRadius: number;
    detectionRadius: number;
}
