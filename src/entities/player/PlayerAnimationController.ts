import {
    AnimationGroup,
    Bone,
    Mesh,
    TransformNode,
    Vector3
} from "@babylonjs/core";
import type {
    AbstractMesh,
    ISceneLoaderAsyncResult,
    Observer,
    Scene,
    Skeleton,
    TransformNode as TransformNodeType
} from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";

// états pr la mise à jour des animations, transmis par Player à chaque frame
interface AnimationUpdateState {
    isGrounded: boolean;
    isMoving: boolean;
    justJumped: boolean;
    justLanded: boolean;
}

// callbacks pr notifier Player de certains changements d'état liés aux animations
// -> util pour bloquer les déplacement quand joueur à terre
interface PlayerAnimationControllerCallbacks {
    onHitSequenceStateChange?: (isActive: boolean) => void;
}

// clés des animations utilisées pr le personnage du joueur
type CharacterAnimationKey =
    | "idle"                // normal
    | "sprint"              // avancer
    | "jumpStart"           // saut début
    | "jumpLoop"            // saut en l'air
    | "jumpLand"            // atterrissage
    | "hitKnockback"        // réaction au coup (ennemi ou chute)
    | "recover";            // récup après coup (se relève du sol)

const LOOPED_ANIMATIONS = new Set<CharacterAnimationKey>(["idle", "sprint", "jumpLoop"]);

/*
 * Contrôleur visuel du joueur.
 * Charge le mannequin + retarget des animation groups UAL1/UAL2, puis pilote
 * les transitions d'animations en fonction des états transmis par Player.
 */
export class PlayerAnimationController {
    private readonly scene: Scene;
    private readonly hostMesh: Mesh;
    private readonly groups: Partial<Record<CharacterAnimationKey, AnimationGroup>> = {};
    private readonly callbacks: PlayerAnimationControllerCallbacks;

    private visualRoot: TransformNode | null = null;
    private currentGroup: AnimationGroup | null = null;
    private currentEndObserver: Observer<AnimationGroup> | null = null;
    private playbackToken = 0;

    private isReady = false;
    private isHitSequenceActive = false;
    private latestIsGrounded = true;
    private latestIsMoving = false;
    private quicksandSinkLevel = 0;
    private baseVisualOffsetY = 0;

    public constructor(
        scene: Scene,
        hostMesh: Mesh,
        callbacks: PlayerAnimationControllerCallbacks = {}
    ) {
        this.scene = scene;
        this.hostMesh = hostMesh;
        this.callbacks = callbacks;
    }

    // charge le mannequin et les animations
    public async initialize(): Promise<void> {
        try {
            const charactersRoot = `${import.meta.env.BASE_URL}assets/characters/`;

            // files
            const [mannequin, ual1, ual2] = await Promise.all([
                SceneLoader.ImportMeshAsync("", charactersRoot, "Mannequin_F.glb", this.scene),
                SceneLoader.ImportMeshAsync("", charactersRoot, "UAL1_Standard.glb", this.scene),
                SceneLoader.ImportMeshAsync("", charactersRoot, "UAL2_Standard.glb", this.scene)
            ]);

            this.attachMannequinMeshes(mannequin);

            const mannequinSkeleton = mannequin.skeletons[0] ?? null;
            const targetIndex = this.buildTargetIndex(
                mannequin.meshes,
                mannequin.transformNodes,
                mannequinSkeleton
            );

            this.disableReferenceAsset(ual1);
            this.disableReferenceAsset(ual2);

            this.groups.idle = this.cloneAnimationGroup(
                ual1.animationGroups,
                ["Idle_Loop"],
                targetIndex,
                mannequinSkeleton
            );
            this.groups.sprint = this.cloneAnimationGroup(
                ual1.animationGroups,
                ["Sprint_Loop"],
                targetIndex,
                mannequinSkeleton
            );
            this.groups.jumpStart = this.cloneAnimationGroup(
                ual1.animationGroups,
                ["Jump_Satart", "Jump_Start"],
                targetIndex,
                mannequinSkeleton
            );
            this.groups.jumpLoop = this.cloneAnimationGroup(
                ual1.animationGroups,
                ["Jump_Loop"],
                targetIndex,
                mannequinSkeleton
            );
            this.groups.jumpLand = this.cloneAnimationGroup(
                ual1.animationGroups,
                ["Jump_Land"],
                targetIndex,
                mannequinSkeleton
            );
            this.groups.hitKnockback = this.cloneAnimationGroup(
                ual2.animationGroups,
                ["Hit_Knockback"],
                targetIndex,
                mannequinSkeleton
            );
            this.groups.recover = this.cloneAnimationGroup(
                ual2.animationGroups,
                ["LayToldle", "LayToIdle"],
                targetIndex,
                mannequinSkeleton
            );

            this.isReady = true;
            this.playLocomotion();
        } catch (error) {
            console.error("Impossible de charger le personnage 3D du joueur.", error);
        }
    }

    // met à jour l'animation jouée en fct de l'état transmis par Player
    public update(state: AnimationUpdateState): void {
        this.latestIsGrounded = state.isGrounded;
        this.latestIsMoving = state.isMoving;

        if (!this.isReady || this.isHitSequenceActive) {
            return;
        }

        if (state.justJumped) {
            this.playJumpStart();
            return;
        }

        if (state.justLanded) {
            this.playJumpLand();
            return;
        }

        if (!state.isGrounded) {
            this.playLoopAnimation("jumpLoop");
            return;
        }

        this.playLocomotion();
    }

    // animation réaction à un projectl ou touché enneme
    public playHitReaction(): void {
        if (!this.isReady) {
            return;
        }

        const hitGroup = this.groups.hitKnockback;
        const recoverGroup = this.groups.recover;
        if (!hitGroup || !recoverGroup) {
            return;
        }

        this.setHitSequenceActive(true);

        this.playOneShotAnimation("hitKnockback", () => {
            this.playOneShotAnimation("recover", () => {
                this.setHitSequenceActive(false);
                this.playLocomotion();
            });
        });
    }

    // repasser le perso en posture normal
    public resetToLocomotion(): void {
        if (!this.isReady) {
            return;
        }

        this.setHitSequenceActive(false);
        this.playLocomotion(true);
    }

    public setQuicksandSinkLevel(level: number): void {
        this.quicksandSinkLevel = Math.max(0, Math.min(1.2, level));
        this.applyVisualOffsets();
    }

    // indique si le controller est prêt à jouer des animations (mannequin + anims chargés)
    // utile pour Player pr savoir si on peut faire des appels à playHitReaction ou update
    private setHitSequenceActive(isActive: boolean): void {
        if (this.isHitSequenceActive === isActive) {
            return;
        }

        this.isHitSequenceActive = isActive;
        this.callbacks.onHitSequenceStateChange?.(isActive);
    }

    // attache les meshes du mannequin à la hiérarchie du hostMesh,
    // puis ajuste l'échelle et position du mannequin pr qu'il corresponde à la taille du joueur
    private attachMannequinMeshes(result: ISceneLoaderAsyncResult): void {
        const visualRoot = new TransformNode("playerVisualRoot", this.scene);
        visualRoot.parent = this.hostMesh;

        for (const transformNode of result.transformNodes) {
            if (!transformNode.parent) {
                transformNode.parent = visualRoot;
            }
        }

        for (const mesh of result.meshes) {
            if (!mesh.parent) {
                mesh.parent = visualRoot;
            }

            mesh.isPickable = false;
            mesh.checkCollisions = false;
        }

        this.visualRoot = visualRoot;
        this.fitMannequinToPlayerBody(result.meshes);
        this.applyVisualOffsets();
    }

    // ajuste l'échelle et la position du mannequin pr qu'il corresponde à la taille du joueur (2 unités de haut)
    private fitMannequinToPlayerBody(meshes: AbstractMesh[]): void {
        if (!this.visualRoot) {
            return;
        }

        const renderMeshes = meshes.filter((mesh) => mesh.getTotalVertices() > 0);
        const initialBounds = this.computeWorldBounds(renderMeshes);
        if (!initialBounds) {
            return;
        }

        const sourceHeight = initialBounds.max.y - initialBounds.min.y;
        if (sourceHeight <= 0.0001) {
            return;
        }

        const targetHeight = 2;
        const uniformScale = targetHeight / sourceHeight;
        this.visualRoot.scaling.setAll(uniformScale);

        const fittedBounds = this.computeWorldBounds(renderMeshes);
        if (!fittedBounds) {
            return;
        }

        const hostBottomY = this.hostMesh.position.y - 1;
        const offsetY = hostBottomY - fittedBounds.min.y;
        this.baseVisualOffsetY += offsetY;
        this.applyVisualOffsets();
    }

    private applyVisualOffsets(): void {
        if (!this.visualRoot) {
            return;
        }

        // En sable mouvant, on fait descendre légèrement le mannequin
        // pour donner l'impression qu'il s'enfonce dans le sol.
        this.visualRoot.position.y = this.baseVisualOffsetY - this.quicksandSinkLevel * 0.9;
    }

    // calcule les bounds englobants de tous les meshes fournis, en tenant compte de leur transformation mondiale
    // utile pr ajuster la taille et position du mannequin après l'avoir attaché au hostMesh
    private computeWorldBounds(meshes: AbstractMesh[]): { min: Vector3; max: Vector3 } | null {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;

        let hasValidBounds = false;

        for (const mesh of meshes) {
            if (mesh.isDisposed()) {
                continue;
            }

            mesh.computeWorldMatrix(true);
            const bounds = mesh.getBoundingInfo().boundingBox;
            const minimum = bounds.minimumWorld;
            const maximum = bounds.maximumWorld;

            if (!Number.isFinite(minimum.x) || !Number.isFinite(maximum.x)) {
                continue;
            }

            minX = Math.min(minX, minimum.x);
            minY = Math.min(minY, minimum.y);
            minZ = Math.min(minZ, minimum.z);
            maxX = Math.max(maxX, maximum.x);
            maxY = Math.max(maxY, maximum.y);
            maxZ = Math.max(maxZ, maximum.z);
            hasValidBounds = true;
        }

        if (!hasValidBounds) {
            return null;
        }

        return {
            min: new Vector3(minX, minY, minZ),
            max: new Vector3(maxX, maxY, maxZ)
        };
    }

    // désactive tous les meshes et transformNodes d'un asset importé, ainsi que les animations associées
    // utilisé pr les assets d'animation (UAL1/UAL2) qu'on importe juste pr retarget les animations, sans vouloir afficher les mannequins de ces assets
    private disableReferenceAsset(result: ISceneLoaderAsyncResult): void {
        for (const transformNode of result.transformNodes) {
            transformNode.setEnabled(false);
        }

        for (const mesh of result.meshes) {
            mesh.setEnabled(false);
            mesh.isPickable = false;
        }

        for (const group of result.animationGroups) {
            group.stop();
        }
    }

    // construit un index de tous les meshes, transformNodes et bones d'un asset, accessible par nom
    private buildTargetIndex(
        meshes: AbstractMesh[],
        transformNodes: TransformNodeType[],
        skeleton: Skeleton | null
    ): Map<string, unknown> {
        const index = new Map<string, unknown>();

        for (const mesh of meshes) {
            if (!index.has(mesh.name)) {
                index.set(mesh.name, mesh);
            }
        }

        for (const transformNode of transformNodes) {
            if (!index.has(transformNode.name)) {
                index.set(transformNode.name, transformNode);
            }
        }

        for (const bone of skeleton?.bones ?? []) {
            if (!index.has(bone.name)) {
                index.set(bone.name, bone);
            }
        }

        return index;
    }

    // clone un animation group d'un asset source (UAL1/UAL2) en retargetant ses cibles vers les meshes, transformNodes et bones du mannequin du joueur
    // -> pr éviter de jouer les animations directement sur les assets source = meilleure perf
    private cloneAnimationGroup(
        sourceGroups: AnimationGroup[],
        sourceNames: string[],
        targetIndex: Map<string, unknown>,
        targetSkeleton: Skeleton | null
    ): AnimationGroup | undefined {
        const sourceGroup = this.findGroupByName(sourceGroups, sourceNames);
        if (!sourceGroup) {
            return undefined;
        }

        const clonedGroup = sourceGroup.clone(
            `player_${sourceGroup.name}`,
            (oldTarget) => this.convertAnimationTarget(oldTarget, targetIndex, targetSkeleton),
            true
        );

        clonedGroup.stop();
        clonedGroup.reset();

        return clonedGroup;
    }

    // trouve un animation group dans une liste, en essayant plusieurs noms possibles
    // (utile pr gérer les variations de nommage entre les assets UAL1 et UAL2)
    private findGroupByName(groups: AnimationGroup[], names: string[]): AnimationGroup | undefined {
        const lowerMap = new Map<string, AnimationGroup>();
        for (const group of groups) {
            lowerMap.set(group.name.toLowerCase(), group);
        }

        for (const name of names) {
            const group = lowerMap.get(name.toLowerCase());
            if (group) {
                return group;
            }
        }

        return undefined;
    }

    // convertit la cible d'une animation group source (mesh, transformNode ou bone) en la cible correspondante
    // du mannequin du joueur, en se basant sur le nom -> pr retarget les anim des assets UAL1/UAL2 vers le mannequin
    private convertAnimationTarget(
        oldTarget: unknown,
        targetIndex: Map<string, unknown>,
        targetSkeleton: Skeleton | null
    ): unknown {
        if (oldTarget instanceof Bone) {
            return targetSkeleton?.bones.find((bone) => bone.name === oldTarget.name) ?? null;
        }

        if (
            typeof oldTarget === "object"
            && oldTarget !== null
            && "name" in oldTarget
            && typeof oldTarget.name === "string"
        ) {
            return targetIndex.get(oldTarget.name) ?? null;
        }

        return null;
    }

    // jouer l'animation de locomotion (idle ou sprint) en fonction de l'état du joueur (au sol et en mouvement ou pas)
    private playLocomotion(forceRestart = false): void {
        if (this.latestIsGrounded && this.latestIsMoving) {
            this.playLoopAnimation("sprint", forceRestart);
            return;
        }

        this.playLoopAnimation("idle", forceRestart);
    }

    // jouer l'animation de début de saut, puis enchaîner sur le saut en l'air ou la locomotion
    // selon si le joueur est déjà en l'air ou pas
    private playJumpStart(): void {
        if (!this.playOneShotAnimation("jumpStart", () => {
            if (this.isHitSequenceActive) {
                return;
            }

            if (!this.latestIsGrounded) {
                this.playLoopAnimation("jumpLoop", true);
                return;
            }

            this.playLocomotion(true);
        })) {
            this.playLoopAnimation("jumpLoop");
        }
    }

    // jouer l'animation d'atterrissage de saut, puis enchaîner sur la locomotion
    private playJumpLand(): void {
        if (!this.playOneShotAnimation("jumpLand", () => {
            if (this.isHitSequenceActive) {
                return;
            }

            this.playLocomotion(true);
        })) {
            this.playLocomotion();
        }
    }

    // jouer une animation de type loop (idle, sprint, jumpLoop),
    // en évitant de la redémarrer si elle est déjà en cours, sauf si forceRestart = true
    private playLoopAnimation(key: CharacterAnimationKey, forceRestart = false): void {
        const group = this.groups[key];
        if (!group) {
            return;
        }

        const shouldRestart =
            forceRestart
            || this.currentGroup !== group
            || !group.isPlaying
            || !group.loopAnimation;

        if (!shouldRestart) {
            return;
        }

        this.startGroup(group, true);
    }

    //
    private playOneShotAnimation(key: CharacterAnimationKey, onEnd?: () => void): boolean {
        const group = this.groups[key];
        if (!group) {
            return false;
        }

        this.startGroup(group, false, onEnd);
        return true;
    }

    // pr jouer une animation, en gérant correctement les transitions et les callbacks de fin d'animation
    private startGroup(group: AnimationGroup, loop: boolean, onEnd?: () => void): void {
        this.playbackToken += 1;
        const token = this.playbackToken;

        this.clearCurrentObserver();
        this.currentGroup?.stop();

        this.currentGroup = group;
        group.stop();
        group.reset();
        group.loopAnimation = loop;

        if (!loop && onEnd) {
            this.currentEndObserver = group.onAnimationGroupEndObservable.add(() => {
                if (this.playbackToken !== token) {
                    return;
                }

                this.clearCurrentObserver();
                onEnd();
            });
        }

        const loopValue = LOOPED_ANIMATIONS.has(this.getKeyForGroup(group)) && loop;
        group.start(loopValue, 1.0, group.from, group.to, false);
    }

    // nettoie les observers de fin d'animation
    private clearCurrentObserver(): void {
        if (!this.currentGroup || !this.currentEndObserver) {
            this.currentEndObserver = null;
            return;
        }

        this.currentGroup.onAnimationGroupEndObservable.remove(this.currentEndObserver);
        this.currentEndObserver = null;
    }

    // association inverse pr retrouver la clé d'une animation à partir de son group,
    // utile qd plusieurs clés pointent vers le même group
    private getKeyForGroup(group: AnimationGroup): CharacterAnimationKey {
        if (this.groups.idle === group) {
            return "idle";
        }

        if (this.groups.sprint === group) {
            return "sprint";
        }

        if (this.groups.jumpStart === group) {
            return "jumpStart";
        }

        if (this.groups.jumpLoop === group) {
            return "jumpLoop";
        }

        if (this.groups.jumpLand === group) {
            return "jumpLand";
        }

        if (this.groups.hitKnockback === group) {
            return "hitKnockback";
        }

        return "recover";
    }
}
