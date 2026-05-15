export interface PauseMenuCallbacks {
    onResume: () => void;
    onRestart: () => void;
    onOpenSettings: () => void;
    onQuitToMainMenu: () => void;
}

/*
 * Gère l'affichage du menu de pause et ses actions.
 */
export class PauseMenu {
    private readonly root: HTMLDivElement;

    public constructor(callbacks: PauseMenuCallbacks) {
        this.root = document.createElement("div");
        this.root.className = "ui-layer ui-layer--pause ui-hidden";

        const panel = document.createElement("section");
        panel.className = "ui-panel";

        const title = document.createElement("h2");
        title.className = "ui-title ui-title--secondary";
        title.textContent = "Pause";

        const actions = document.createElement("div");
        actions.className = "ui-actions";

        actions.append(
            this.createButton("Reprendre", callbacks.onResume),
            this.createButton("Recommencer", callbacks.onRestart),
            this.createButton("Paramètres", callbacks.onOpenSettings),
            this.createButton("Quitter au menu", callbacks.onQuitToMainMenu)
        );

        panel.append(title, actions);
        this.root.append(panel);
        document.body.appendChild(this.root);
    }

    public show(): void {
        this.root.classList.remove("ui-hidden");
    }

    public hide(): void {
        this.root.classList.add("ui-hidden");
    }

    public dispose(): void {
        this.root.remove();
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
