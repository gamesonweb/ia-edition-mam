export class IntroOverlay {
    private readonly root: HTMLDivElement;
    private readonly textElement: HTMLParagraphElement;
    private readonly hintElement: HTMLParagraphElement;

    public constructor() {
        this.root = document.createElement("div");
        this.root.className = "ui-layer ui-layer--intro ui-hidden";

        const panel = document.createElement("section");
        panel.className = "ui-intro-box";

        this.textElement = document.createElement("p");
        this.textElement.className = "ui-intro-text";

        this.hintElement = document.createElement("p");
        this.hintElement.className = "ui-intro-hint";

        panel.append(this.textElement, this.hintElement);
        this.root.appendChild(panel);
        document.body.appendChild(this.root);
    }

    public show(text: string, isLastStep: boolean): void {
        this.textElement.textContent = text;
        this.hintElement.textContent = isLastStep
            ? "Espace pour commencer"
            : "Espace pour continuer";
        this.root.classList.remove("ui-hidden");
    }

    public hide(): void {
        this.root.classList.add("ui-hidden");
    }

    public dispose(): void {
        this.root.remove();
    }
}
