/*
 * Gère le menu de paramètres du jeu.
 * Pour cette itération, l'écran reste volontairement minimal (placeholder).
 */

export class SettingsMenu {
    private readonly root: HTMLDivElement;
    private readonly backButton: HTMLButtonElement;
    private onBack: () => void = () => {
        // no-op par défaut
    };

    public constructor() {
        this.root = document.createElement("div");
        this.root.className = "ui-layer ui-layer--centered ui-hidden";

        const panel = document.createElement("section");
        panel.className = "ui-panel";

        const title = document.createElement("h2");
        title.className = "ui-title ui-title--secondary";
        title.textContent = "Paramètres";

        const subtitle = document.createElement("p");
        subtitle.className = "ui-subtitle";
        subtitle.textContent = "Configuration à venir";

        this.backButton = document.createElement("button");
        this.backButton.type = "button";
        this.backButton.className = "ui-button";
        this.backButton.textContent = "Retour";
        this.backButton.addEventListener("click", () => {
            this.onBack();
        });

        panel.append(title, subtitle, this.backButton);
        this.root.append(panel);
        document.body.appendChild(this.root);
    }

    public show(onBack: () => void): void {
        this.onBack = onBack;
        this.root.classList.remove("ui-hidden");
        this.backButton.focus();
    }

    public hide(): void {
        this.root.classList.add("ui-hidden");
    }

    public dispose(): void {
        this.root.remove();
    }
}
