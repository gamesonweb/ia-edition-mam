import type { LevelCatalogEntry } from "../levels/LevelCatalog";

export interface MainMenuCallbacks {
    onPlay: () => void;
    onResume: () => void;
    onOpenSettings: () => void;
    onSelectLevel: (levelId: number) => void;
}

/*
 * Gère le menu principal et l'écran de sélection de niveau.
 */
export class MainMenu {
    private readonly root: HTMLDivElement;
    private readonly mainPanel: HTMLElement;
    private readonly levelSelectionPanel: HTMLElement;
    private readonly resumeButton: HTMLButtonElement;
    private readonly selectedLevelText: HTMLParagraphElement;
    private readonly levelButtons = new Map<number, HTMLButtonElement>();
    private readonly levels: ReadonlyArray<LevelCatalogEntry>;
    private selectedLevelId: number;

    public constructor(
        levels: ReadonlyArray<LevelCatalogEntry>,
        initialLevelId: number,
        callbacks: MainMenuCallbacks
    ) {
        this.levels = levels;
        this.selectedLevelId = initialLevelId;

        this.root = document.createElement("div");
        this.root.className = "ui-layer ui-layer--centered";

        this.mainPanel = document.createElement("section");
        this.mainPanel.className = "ui-panel";

        const title = document.createElement("h1");
        title.className = "ui-title";
        title.textContent = "GoW - Prototype";

        this.selectedLevelText = document.createElement("p");
        this.selectedLevelText.className = "ui-subtitle";

        const actions = document.createElement("div");
        actions.className = "ui-actions";

        const playButton = this.createButton("Nouvelle Partie", callbacks.onPlay);
        this.resumeButton = this.createButton("Reprendre", callbacks.onResume);
        const levelSelectButton = this.createButton("Choisir un niveau", () => {
            this.showLevelSelection();
        });
        const settingsButton = this.createButton("Paramètres", callbacks.onOpenSettings);

        actions.append(playButton, this.resumeButton, levelSelectButton, settingsButton);

        this.mainPanel.append(title, this.selectedLevelText, actions);

        this.levelSelectionPanel = document.createElement("section");
        this.levelSelectionPanel.className = "ui-panel ui-panel--hidden";

        const levelSelectionTitle = document.createElement("h2");
        levelSelectionTitle.className = "ui-title ui-title--secondary";
        levelSelectionTitle.textContent = "Sélection de niveau";

        const levelList = document.createElement("div");
        levelList.className = "ui-level-list";

        for (const level of levels) {
            const levelButton = document.createElement("button");
            levelButton.type = "button";
            levelButton.className = "ui-level-button";
            levelButton.innerHTML = `<span class=\"ui-level-title\">${level.label}</span><span class=\"ui-level-description\">${level.description}</span>`;
            levelButton.addEventListener("click", () => {
                this.setSelectedLevel(level.id);
                callbacks.onSelectLevel(level.id);
                this.showMainPanel();
            });
            levelList.append(levelButton);
            this.levelButtons.set(level.id, levelButton);
        }

        const backButton = this.createButton("Retour", () => {
            this.showMainPanel();
        });

        this.levelSelectionPanel.append(levelSelectionTitle, levelList, backButton);

        this.root.append(this.mainPanel, this.levelSelectionPanel);
        document.body.appendChild(this.root);

        this.setResumeAvailable(false);
        this.setSelectedLevel(initialLevelId);
    }

    public show(): void {
        this.root.classList.remove("ui-hidden");
        this.showMainPanel();
    }

    public hide(): void {
        this.root.classList.add("ui-hidden");
    }

    public setResumeAvailable(isAvailable: boolean): void {
        this.resumeButton.disabled = !isAvailable;
    }

    public setSelectedLevel(levelId: number): void {
        this.selectedLevelId = levelId;

        for (const [id, button] of this.levelButtons) {
            const isSelected = id === levelId;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", isSelected ? "true" : "false");
        }

        const selectedLevel = this.levels.find((level) => level.id === this.selectedLevelId);
        this.selectedLevelText.textContent = selectedLevel
            ? `Niveau sélectionné : ${selectedLevel.label}`
            : "Niveau sélectionné : inconnu";
    }

    public dispose(): void {
        this.root.remove();
    }

    private showLevelSelection(): void {
        this.mainPanel.classList.add("ui-panel--hidden");
        this.levelSelectionPanel.classList.remove("ui-panel--hidden");
    }

    private showMainPanel(): void {
        this.levelSelectionPanel.classList.add("ui-panel--hidden");
        this.mainPanel.classList.remove("ui-panel--hidden");
    }

    private createButton(label: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ui-button";
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }
}
