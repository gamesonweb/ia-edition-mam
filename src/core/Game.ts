import { Engine } from "@babylonjs/core";
import type { Observer, Scene } from "@babylonjs/core";
import { Player } from "../entities/player/Player.ts";
import type { BaseMonster } from "../entities/monsters/BaseMonster";
import type { BaseItem } from "../entities/items/BaseItem";
import { Key } from "../entities/items/Key";
import { InputManager } from "./InputManager";
import { SceneManager } from "./SceneManager";
import { MainMenu } from "../ui/MainMenu";
import { PauseMenu } from "../ui/PauseMenu";
import { SettingsMenu } from "../ui/SettingsMenu";
import { HUD } from "../ui/HUD";
import { EndMenu } from "../ui/EndMenu";
import type { EndMenuConfig } from "../ui/EndMenu";
import { IntroOverlay } from "../ui/IntroOverlay";
import { Timer } from "../utils/Timer";
import {
    DEFAULT_LEVEL_ID,
    getLevelLabel,
    LEVEL_CATALOG,
    getNextLevelId
} from "../levels/LevelCatalog";

// sert à regrouper les éléments d'une session de jeu active (niveau chargé, scène, joueur, ennemis, items, etc.)
// facilite la gestion du cycle de vie + transitions entre les états du jeu
interface GameSession {
    levelId: number;
    sceneManager: SceneManager;
    player: Player;
    monsters: BaseMonster[];
    items: BaseItem[];
    beforeRenderObserver: Observer<Scene> | null;
    maxLives: number;
    remainingLives: number;
    respawnImmunityRemaining: number;
    voidFallThresholdY: number;
}

// machine à états pour les différentes UI et transitions
type UiState =
    | "mainMenu"
    | "intro"
    | "playing"
    | "paused"
    | "settingsMain"
    | "settingsPause"
    | "settingsGameOver"
    | "settingsLevelComplete"
    | "gameOver"
    | "levelComplete";

/*
 * Classe principale du jeu, responsable de la boucle de rendu,
 * du cycle de vie des sessions et de la navigation UI.
 */
export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly engine: Engine;                    // moteur de rendu Babylon.js
    private readonly inputManager: InputManager;        // gestionnaire d'entrées (capture et gestion des entrées clavier)

    private readonly mainMenu: MainMenu;
    private readonly pauseMenu: PauseMenu;
    private readonly settingsMenu: SettingsMenu;
    private readonly endMenu: EndMenu;
    private readonly introOverlay: IntroOverlay;

    private readonly hud: HUD;
    private readonly timer = new Timer();
    private readonly defaultPlayerLives = 3;
    private readonly respawnImmunityDuration = 1.2;
    private readonly sessionStartImmunityDuration = 0.6;
    private readonly maxGameplayDeltaSeconds = 0.1;

    private session: GameSession | null = null;             // session de jeu active (null si pas de niveau chargé)
    private uiState: UiState = "mainMenu";                  // état par défaut au lancement
    private selectedLevelId = DEFAULT_LEVEL_ID;
    private isRenderLoopRunning = false;
    private lastGameplayTimestampMs: number | null = null;
    private currentEndMenuConfig: EndMenuConfig | null = null;
    private readonly introTexts = [
        "Au secours... J’ai perdu ma famille. Ils sont tout au bout de ce chemin, mais il y a des monstres, des trous, et j’ai trop peur de tomber. Peux-tu aller chercher papa et maman pour moi ?",
        "Bienvenue. Votre objectif est de traverser les trois niveaux et de retrouver les parents de cette petite créature invisible. Pour accéder au niveau suivant, récupérez l’anneau qui se trouve au bout du chemin."
    ];
    private introTextIndex = 0;

    public constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.engine = new Engine(canvas, true);
        this.inputManager = new InputManager();

        this.mainMenu = new MainMenu(LEVEL_CATALOG, this.selectedLevelId, {
            onPlay: this.startSelectedLevel,
            onResume: this.resumeFromMainMenu,
            onOpenSettings: this.openSettingsFromMain,
            onSelectLevel: this.selectLevel
        });

        this.pauseMenu = new PauseMenu({
            onResume: this.resumeFromPause,
            onRestart: this.restartCurrentLevel,
            onOpenSettings: this.openSettingsFromPause,
            onQuitToMainMenu: this.quitToMainMenu
        });

        this.settingsMenu = new SettingsMenu();
        this.endMenu = new EndMenu();
        this.introOverlay = new IntroOverlay();
        this.hud = new HUD();
        this.hud.setTimer(0);
        this.hud.setLevelLabel(getLevelLabel(this.selectedLevelId));
        this.hud.setLives(this.defaultPlayerLives, this.defaultPlayerLives);
    }


    /* ######### GESTION DE LA BOUCLE DE RENDU ET DES ÉTATS ######### */

    // démarre la boucle de rendu Babylon
    private startRenderLoop(): void {
        if (this.isRenderLoopRunning) {
            return;
        }

        this.engine.runRenderLoop(() => {
            const session = this.session;
            if (!session) {
                return;
            }

            if (!session.sceneManager.ensureActiveCamera()) {
                return;
            }

            try {
                session.sceneManager.scene.render();
            } catch (error) {
                if (error instanceof Error && error.message === "No camera defined") {
                    return;
                }

                throw error;
            }
        });
        this.isRenderLoopRunning = true;
    }

    // arrête la boucle de rendu Babylon
    private stopRenderLoop(): void {
        if (!this.isRenderLoopRunning) {
            return;
        }

        this.engine.stopRenderLoop();
        this.isRenderLoopRunning = false;
        this.lastGameplayTimestampMs = null;
    }

    // gère le redimensionnement pour le moteur
    private readonly onResize = (): void => {
        this.engine.resize();
    };

    // démarre le jeu en affichant (menu principal) + attache écouteurs
    public start(): void {
        this.showMainMenu();
        window.addEventListener("resize", this.onResize);
        window.addEventListener("keydown", this.onGlobalKeyDown);
    }

    // clean les ressources, détache les écouteurs et arrête la boucle de rendu
    public dispose(): void {
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("keydown", this.onGlobalKeyDown);

        this.stopRenderLoop();
        this.disposeSession();

        this.mainMenu.dispose();
        this.pauseMenu.dispose();
        this.settingsMenu.dispose();
        this.endMenu.dispose();
        this.introOverlay.dispose();
        this.hud.dispose();

        this.inputManager.dispose();
        this.engine.dispose();
    }


    /* ######### GESTION DES TRANSITIONS (UI) ######### */

    private readonly startSelectedLevel = (): void => {
        this.startNewGame(DEFAULT_LEVEL_ID, true);
    };

    private readonly resumeFromMainMenu = (): void => {
        if (!this.session) {
            return;
        }

        this.resumeGameplay();
    };

    private readonly resumeFromPause = (): void => {
        if (this.uiState !== "paused") {
            return;
        }

        this.resumeGameplay();
    };

    private readonly restartCurrentLevel = (): void => {
        const levelToRestart = this.session?.levelId ?? this.selectedLevelId;
        this.startNewGame(levelToRestart);
    };

    private readonly quitToMainMenu = (): void => {
        this.returnToMainMenu(false);
    };

    private readonly openSettingsFromMain = (): void => {
        this.uiState = "settingsMain";
        this.mainMenu.hide();
        this.pauseMenu.hide();
        this.settingsMenu.show(this.closeSettingsFromMain);
    };

    private readonly openSettingsFromPause = (): void => {
        if (this.uiState !== "paused") {
            return;
        }

        this.uiState = "settingsPause";
        this.pauseMenu.hide();
        this.settingsMenu.show(this.closeSettingsFromPause);
    };

    private readonly closeSettingsFromMain = (): void => {
        if (this.uiState !== "settingsMain") {
            return;
        }

        this.settingsMenu.hide();
        this.showMainMenu();
    };

    private readonly closeSettingsFromPause = (): void => {
        if (this.uiState !== "settingsPause") {
            return;
        }

        this.settingsMenu.hide();
        this.uiState = "paused";
        this.pauseMenu.show();
    };

    private readonly openSettingsFromGameOver = (): void => {
        if (this.uiState !== "gameOver") {
            return;
        }

        this.uiState = "settingsGameOver";
        this.endMenu.hide();
        this.settingsMenu.show(this.closeSettingsFromGameOver);
    };

    private readonly openSettingsFromLevelComplete = (): void => {
        if (this.uiState !== "levelComplete") {
            return;
        }

        this.uiState = "settingsLevelComplete";
        this.endMenu.hide();
        this.settingsMenu.show(this.closeSettingsFromLevelComplete);
    };

    private readonly closeSettingsFromGameOver = (): void => {
        if (this.uiState !== "settingsGameOver") {
            return;
        }

        this.settingsMenu.hide();
        this.uiState = "gameOver";

        if (this.currentEndMenuConfig) {
            this.endMenu.show(this.currentEndMenuConfig);
        }
    };

    private readonly closeSettingsFromLevelComplete = (): void => {
        if (this.uiState !== "settingsLevelComplete") {
            return;
        }

        this.settingsMenu.hide();
        this.uiState = "levelComplete";

        if (this.currentEndMenuConfig) {
            this.endMenu.show(this.currentEndMenuConfig);
        }
    };

    /* ###### GESTION DE LA SESSION DE JEU (load, update, clean) ###### */

    private readonly selectLevel = (levelId: number): void => {
        this.selectedLevelId = levelId;
        this.mainMenu.setSelectedLevel(levelId);
        this.hud.setLevelLabel(getLevelLabel(levelId));
    };

    private startNewGame(levelId: number, shouldShowIntro = false): void {
        this.selectedLevelId = levelId;
        this.mainMenu.setSelectedLevel(levelId);

        this.stopRenderLoop();
        this.disposeSession();
        this.session = this.createSession(levelId);

        this.timer.reset();
        this.hud.setTimer(0);
        this.hud.setLevelLabel(getLevelLabel(levelId));
        this.hud.setLives(this.session.remainingLives, this.session.maxLives);

        if (shouldShowIntro) {
            this.enterIntroState();
            return;
        }

        this.timer.start();
        this.enterPlayingState();
    }

    private createSession(levelId: number): GameSession {
        const sceneManager = new SceneManager(this.engine, this.canvas, levelId);
        const playerSpawn = sceneManager.getPlayerSpawn();
        const player = new Player(
            sceneManager.scene,
            this.inputManager,
            sceneManager.groundMeshes,
            playerSpawn
        );

        sceneManager.setPlayerTarget(player.mesh);
        sceneManager.setCameraControlEnabled(false);

        const session: GameSession = {
            levelId,
            sceneManager,
            player,
            monsters: sceneManager.monsters,
            items: sceneManager.items,
            beforeRenderObserver: null,
            maxLives: this.defaultPlayerLives,
            remainingLives: this.defaultPlayerLives,
            respawnImmunityRemaining: this.sessionStartImmunityDuration,
            voidFallThresholdY: sceneManager.getVoidFallThresholdY()
        };

        const monsters = sceneManager.monsters;
        const items = sceneManager.items;
        const beforeRenderObserver = sceneManager.scene.onBeforeRenderObservable.add(() => {
            if (this.uiState !== "playing") {
                return;
            }

            const deltaSeconds = this.computeGameplayDeltaSeconds();
            if (deltaSeconds <= 0) {
                return;
            }

            session.respawnImmunityRemaining = Math.max(
                0,
                session.respawnImmunityRemaining - deltaSeconds
            );

            this.timer.update(deltaSeconds);
            this.hud.setTimer(this.timer.getElapsedSeconds());

            for (const ground of sceneManager.grounds) {
                ground.update(deltaSeconds);
            }

            const movementBasis = sceneManager.getMovementBasis();
            const isCameraOrbitingHorizontally =
                sceneManager.isCameraOrbitingHorizontally();

            player.update(
                deltaSeconds,
                movementBasis,
                isCameraOrbitingHorizontally
            );

            if (session.respawnImmunityRemaining <= 0) {
                if (player.consumePendingHazardDeath()) {
                    this.applyLifeLoss(session, 1, true);
                    return;
                }

                if (
                    Number.isFinite(session.voidFallThresholdY)
                    && player.isBelowYThreshold(session.voidFallThresholdY)
                ) {
                    this.applyLifeLoss(session, 1, true);
                    return;
                }
            }

            for (const monster of monsters) {
                monster.update(player.mesh.position, deltaSeconds);

                const projectileDamage = monster.processProjectiles(player.mesh);
                if (projectileDamage > 0 && session.respawnImmunityRemaining <= 0) {
                    const shouldContinue = this.applyLifeLoss(
                        session,
                        projectileDamage,
                        false,
                        true
                    );
                    if (!shouldContinue) {
                        return;
                    }
                }

                if (!monster.mesh.isDisposed() && monster.mesh.intersectsMesh(player.mesh, false)) {
                    if (monster.canDamagePlayer()) {
                        if (session.respawnImmunityRemaining <= 0) {
                            const shouldContinue = this.applyLifeLoss(
                                session,
                                monster.damage,
                                false,
                                true
                            );
                            if (!shouldContinue) {
                                return;
                            }
                        }

                        const knockbackDirection = monster.mesh.position.subtract(player.mesh.position);
                        knockbackDirection.y = 0;
                        monster.applyKnockback(knockbackDirection, 3);
                        monster.applyDamageCooldown(2);
                    }
                }
            }

            for (const item of items) {
                item.update(deltaSeconds);
            }

            for (const item of items) {
                if (!(item instanceof Key) || !item.canInteractWithPlayer || item.mesh.isDisposed()) {
                    continue;
                }

                if (item.mesh.intersectsMesh(player.mesh, false)) {
                    item.mesh.dispose();
                    this.handleLevelComplete(session);
                    return;
                }
            }

            sceneManager.updateCameraBehindPlayer(
                player.getForwardDirection(),
                deltaSeconds,
                player.shouldAutoRecenterCamera()
            );
        });

        if (!beforeRenderObserver) {
            throw new Error("Impossible d'enregistrer l'observer de rendu.");
        }

        session.beforeRenderObserver = beforeRenderObserver;
        return session;
    }

    private applyLifeLoss(
        session: GameSession,
        damage: number,
        shouldRespawnOnSurvive: boolean,
        triggerHitReaction = false
    ): boolean {
        if (this.session !== session || this.uiState !== "playing") {
            return false;
        }

        const normalizedDamage = Math.max(1, Math.floor(damage));
        session.remainingLives = Math.max(0, session.remainingLives - normalizedDamage);
        this.hud.setLives(session.remainingLives, session.maxLives);

        if (session.remainingLives <= 0) {
            this.handleGameOver();
            return false;
        }

        if (triggerHitReaction) {
            session.player.playHitReaction();
        }

        if (shouldRespawnOnSurvive) {
            session.player.respawnAtSpawnPoint();
            session.respawnImmunityRemaining = this.respawnImmunityDuration;
        }

        return true;
    }

    private handleGameOver(): void {
        if (!this.session) {
            return;
        }

        this.uiState = "gameOver";
        this.timer.stop();
        this.stopRenderLoop();
        this.session.sceneManager.setCameraControlEnabled(false);
        this.pauseMenu.hide();
        this.settingsMenu.hide();
        document.body.classList.add("game-paused");
        this.inputManager.clearKeyState();
        const config: EndMenuConfig = {
            title: "Game Over",
            message: "Le joueur a perdu toutes ses vies.",
            actions: [
                {
                    label: "Rejouer le niveau",
                    onClick: this.restartCurrentLevel
                },
                {
                    label: "Paramètres",
                    onClick: this.openSettingsFromGameOver,
                    variant: "secondary"
                },
                {
                    label: "Retour au menu",
                    onClick: this.quitToMainMenu,
                    variant: "secondary"
                }
            ]
        };

        this.currentEndMenuConfig = config;
        this.endMenu.show(config);
    }

    private handleLevelComplete(session: GameSession): void {
        if (this.session !== session || this.uiState !== "playing") {
            return;
        }

        const nextLevelId = getNextLevelId(session.levelId);
        const finalTime = this.timer.getElapsedSeconds();

        this.uiState = "levelComplete";
        this.timer.stop();
        this.stopRenderLoop();
        session.sceneManager.setCameraControlEnabled(false);
        this.pauseMenu.hide();
        this.settingsMenu.hide();
        document.body.classList.add("game-paused");
        this.inputManager.clearKeyState();

        const config: EndMenuConfig = {
            title: "Niveau terminé",
            message: "La clé a été récupérée. Le niveau est terminé.",
            details: `Temps final : ${this.hud.formatTime(finalTime)}`,
            actions: nextLevelId !== null
                ? [
                    {
                        label: "Niveau suivant",
                        onClick: () => {
                            this.startNewGame(nextLevelId);
                        }
                    },
                    {
                        label: "Paramètres",
                        onClick: this.openSettingsFromLevelComplete,
                        variant: "secondary"
                    },
                    {
                        label: "Retour au menu",
                        onClick: this.quitToMainMenu,
                        variant: "secondary"
                    }
                ]
                : [
                    {
                        label: "Paramètres",
                        onClick: this.openSettingsFromLevelComplete,
                        variant: "secondary"
                    },
                    {
                        label: "Retour au menu",
                        onClick: this.quitToMainMenu
                    }
                ]
        };

        this.currentEndMenuConfig = config;
        this.endMenu.show(config);
    }

    private returnToMainMenu(disposeSession: boolean): void {
        if (this.session) {
            this.session.sceneManager.setCameraControlEnabled(false);
        }

        this.timer.stop();
        this.stopRenderLoop();
        this.pauseMenu.hide();
        this.settingsMenu.hide();
        this.endMenu.hide();
        this.hud.hide();
        this.currentEndMenuConfig = null;
        document.body.classList.remove("game-paused");
        this.inputManager.clearKeyState();

        if (disposeSession) {
            this.disposeSession();
        }

        this.showMainMenu();
    }

    private disposeSession(): void {
        if (!this.session) {
            return;
        }

        if (this.session.beforeRenderObserver) {
            this.session.sceneManager.scene.onBeforeRenderObservable.remove(
                this.session.beforeRenderObserver
            );
        }
        this.session.sceneManager.dispose();
        this.session = null;
    }

    private computeGameplayDeltaSeconds(): number {
        const now = performance.now();

        if (this.lastGameplayTimestampMs === null) {
            this.lastGameplayTimestampMs = now;
            return 0;
        }

        const rawDeltaSeconds = (now - this.lastGameplayTimestampMs) / 1000;
        this.lastGameplayTimestampMs = now;

        if (!Number.isFinite(rawDeltaSeconds) || rawDeltaSeconds < 0) {
            return 0;
        }

        return Math.min(rawDeltaSeconds, this.maxGameplayDeltaSeconds);
    }


    /* ######### UTILITAIRES DE TRANSITION ET GESTION DES ÉTATS UI ######### */

    // affiche le menu principal, avec options de reprise si une session est active
    private showMainMenu(): void {
        this.uiState = "mainMenu";
        this.mainMenu.setResumeAvailable(this.session !== null);
        this.mainMenu.show();
        this.pauseMenu.hide();
        this.settingsMenu.hide();
        this.endMenu.hide();
        this.introOverlay.hide();
        this.hud.hide();
    }

    private enterIntroState(): void {
        if (!this.session) {
            return;
        }

        this.uiState = "intro";
        this.introTextIndex = 0;
        document.body.classList.remove("game-paused");

        this.mainMenu.hide();
        this.pauseMenu.hide();
        this.settingsMenu.hide();
        this.endMenu.hide();
        this.hud.hide();
        this.session.sceneManager.setCameraControlEnabled(false);
        this.inputManager.clearKeyState();
        this.introOverlay.show(this.introTexts[this.introTextIndex], false);
        this.startRenderLoop();
    }

    // config l'affichage et les contrôles pour le mode "playing", et démarre la boucle de rendu
    // pour démarrer une partie OU pour reprendre après une pause
    private enterPlayingState(): void {
        if (!this.session) {
            return;
        }

        this.uiState = "playing";
        document.body.classList.remove("game-paused");

        this.mainMenu.hide();
        this.pauseMenu.hide();
        this.settingsMenu.hide();
        this.endMenu.hide();
        this.introOverlay.hide();
        this.hud.show();

        this.session.sceneManager.setCameraControlEnabled(true);

        // focus canvas pour entrées clavier dès le départ ou reprise
        if (this.canvas.tabIndex < 0) {
            this.canvas.tabIndex = 0;
        }
        this.canvas.focus();

        this.inputManager.clearKeyState();

        this.lastGameplayTimestampMs = performance.now();
        this.startRenderLoop();
    }

    private pauseGameplay(): void {
        if (this.uiState !== "playing" || !this.session) {
            return;
        }

        this.uiState = "paused";
        this.timer.stop();

        this.stopRenderLoop();
        this.session.sceneManager.setCameraControlEnabled(false);
        this.pauseMenu.show();
        this.inputManager.clearKeyState();

        document.body.classList.add("game-paused");
    }

    private resumeGameplay(): void {
        if (!this.session) {
            return;
        }

        this.timer.start();
        this.enterPlayingState();
    }

    private advanceIntro(): void {
        if (this.uiState !== "intro") {
            return;
        }

        if (this.introTextIndex < this.introTexts.length - 1) {
            this.introTextIndex += 1;
            this.introOverlay.show(
                this.introTexts[this.introTextIndex],
                this.introTextIndex === this.introTexts.length - 1
            );
            return;
        }

        this.timer.start();
        this.enterPlayingState();
    }

    // gère la touche "Escape" pour les différentes transitions (pause, reprise, navigation dans les menus)
    private readonly onGlobalKeyDown = (event: KeyboardEvent): void => {
        if (event.repeat) {
            return;
        }

        if (event.code === "Space" && this.uiState === "intro") {
            event.preventDefault();
            this.advanceIntro();
            return;
        }

        if (event.code !== "Escape") {
            return;
        }

        event.preventDefault();

        switch (this.uiState) {
            case "playing":
                this.pauseGameplay();
                return;
            case "paused":
                this.resumeGameplay();
                return;
            case "settingsPause":
                this.closeSettingsFromPause();
                return;
            case "settingsGameOver":
                this.closeSettingsFromGameOver();
                return;
            case "settingsLevelComplete":
                this.closeSettingsFromLevelComplete();
                return;
            case "settingsMain":
                this.closeSettingsFromMain();
                return;
            case "intro":
            case "mainMenu":
            case "gameOver":
            case "levelComplete":
                return;
        }
    };
}
