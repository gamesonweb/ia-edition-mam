import {
    Color3,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";
import { BaseMonster, type MonsterTuning } from "./BaseMonster";

export class ShooterMonster extends BaseMonster {
    private readonly projectiles: ShooterProjectile[] = [];
    private readonly projectileMaterial: StandardMaterial;
    private readonly fireInterval = 3;
    private readonly projectileSpeed = 8;
    private readonly projectileLifetime = 3;
    private readonly projectileDamage = 1;
    private fireCooldown = 0;

    public constructor(
        scene: Scene,
        spawnPosition = new Vector3(0, 1, 0),
        tuning: MonsterTuning = {}
    ) {
        super(scene, {
            name: "shooterMonster",
            position: spawnPosition,
            color: new Color3(0.2, 0.47, 0.95),
            speed: tuning.speed ?? 0,
            damage: tuning.damage ?? 2,
            hp: tuning.hp ?? Number.MAX_SAFE_INTEGER,
            size: tuning.size ?? 1,
            isStatic: tuning.isStatic ?? true,
            patrolRadius: tuning.patrolRadius ?? 0,
            detectionRadius: tuning.detectionRadius ?? 12
        });

        this.projectileMaterial = new StandardMaterial("shooterProjectileMaterial", scene);
        this.projectileMaterial.diffuseColor = new Color3(0.98, 0.87, 0.22);
        this.projectileMaterial.emissiveColor = new Color3(0.55, 0.42, 0.08);
    }

    public override update(playerPosition: Vector3, deltaSeconds: number): void {
        this.updateProjectiles(deltaSeconds);

        this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
        if (!this.isPlayerInsideDetectionZone(playerPosition)) {
            return;
        }

        this.faceTarget(playerPosition);
        if (this.fireCooldown > 0) {
            return;
        }

        this.fireCooldown = this.fireInterval;
        this.fireProjectile(playerPosition);
    }

    private fireProjectile(playerPosition: Vector3): void {
        const direction = playerPosition.subtract(this.mesh.position);
        direction.y = 0;
        if (direction.lengthSquared() < 0.0001) {
            return;
        }
        direction.normalize();

        const projectile = MeshBuilder.CreateSphere(
            "shooterProjectile",
            { diameter: 0.25, segments: 6 },
            this.scene
        );
        projectile.position = this.mesh.position.add(new Vector3(0, this.size * 0.45, 0));
        projectile.material = this.projectileMaterial;
        projectile.isPickable = false;

        this.projectiles.push({
            mesh: projectile,
            direction,
            remainingLifetime: this.projectileLifetime
        });
    }

    private updateProjectiles(deltaSeconds: number): void {
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.projectiles[index];
            projectile.mesh.position.addInPlace(
                projectile.direction.scale(this.projectileSpeed * deltaSeconds)
            );
            projectile.remainingLifetime -= deltaSeconds;

            if (projectile.remainingLifetime <= 0) {
                projectile.mesh.dispose();
                this.projectiles.splice(index, 1);
            }
        }
    }

    public processProjectiles(playerMesh: Mesh): number {
        let totalDamage = 0;
        for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = this.projectiles[index];
            if (projectile.mesh.intersectsMesh(playerMesh, false)) {
                totalDamage += this.projectileDamage;
                projectile.mesh.dispose();
                this.projectiles.splice(index, 1);
            }
        }
        return totalDamage;
    }
}

interface ShooterProjectile {
    mesh: Mesh;
    direction: Vector3;
    remainingLifetime: number;
}
