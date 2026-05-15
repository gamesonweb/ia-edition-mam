export interface EndMenuAction {
    label: string;
    onClick: () => void;
    variant?: "primary" | "danger" | "secondary";
}

export interface EndMenuConfig {
    title: string;
    message: string;
    details?: string;
    actions: EndMenuAction[];
}

export class EndMenu {
    private readonly root: HTMLDivElement;
    private readonly panel: HTMLElement;
    private readonly titleElement: HTMLHeadingElement;
    private readonly messageElement: HTMLParagraphElement;
    private readonly detailsElement: HTMLParagraphElement;
    private readonly actionsElement: HTMLDivElement;

    public constructor() {
        this.root = document.createElement("div");
        this.root.className = "ui-layer ui-layer--pause ui-hidden";

        this.panel = document.createElement("section");
        this.panel.className = "ui-panel";

        this.titleElement = document.createElement("h2");
        this.titleElement.className = "ui-title";

        this.messageElement = document.createElement("p");
        this.messageElement.className = "ui-subtitle";

        this.detailsElement = document.createElement("p");
        this.detailsElement.className = "ui-end-details ui-hidden";

        this.actionsElement = document.createElement("div");
        this.actionsElement.className = "ui-actions";

        this.panel.append(
            this.titleElement,
            this.messageElement,
            this.detailsElement,
            this.actionsElement
        );
        this.root.appendChild(this.panel);
        document.body.appendChild(this.root);
    }

    public show(config: EndMenuConfig): void {
        this.titleElement.textContent = config.title;
        this.messageElement.textContent = config.message;

        if (config.details) {
            this.detailsElement.textContent = config.details;
            this.detailsElement.classList.remove("ui-hidden");
        } else {
            this.detailsElement.textContent = "";
            this.detailsElement.classList.add("ui-hidden");
        }

        this.actionsElement.replaceChildren();
        for (const action of config.actions) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ui-button";
            if (action.variant === "danger") {
                button.classList.add("ui-button--danger");
            }
            if (action.variant === "secondary") {
                button.classList.add("ui-button--secondary");
            }
            button.textContent = action.label;
            button.addEventListener("click", action.onClick);
            this.actionsElement.appendChild(button);
        }

        this.root.classList.remove("ui-hidden");
    }

    public hide(): void {
        this.root.classList.add("ui-hidden");
    }

    public dispose(): void {
        this.root.remove();
    }
}
