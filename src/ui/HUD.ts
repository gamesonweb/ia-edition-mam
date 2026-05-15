/*
 * HUD en jeu: affiche les informations persistantes utiles au joueur.
 */

export class HUD {
    private readonly root: HTMLDivElement;
    private readonly livesContainer: HTMLDivElement;
    private readonly heartIcons: HTMLImageElement[] = [];
    private readonly timerValue: HTMLSpanElement;
    private readonly levelValue: HTMLSpanElement;

    public constructor() {
        this.root = document.createElement("div");
        this.root.className = "hud ui-hidden";

        const leftBlock = document.createElement("div");
        leftBlock.className = "hud-block hud-block--lives";
        const livesLabel = document.createElement("span");
        livesLabel.className = "hud-label";
        livesLabel.textContent = "Vies";
        this.livesContainer = document.createElement("div");
        this.livesContainer.className = "hud-hearts";
        leftBlock.append(livesLabel, this.livesContainer);
        this.ensureHeartCount(3);

        const centerBlock = document.createElement("div");
        centerBlock.className = "hud-block";
        const timerLabel = document.createElement("span");
        timerLabel.className = "hud-label";
        timerLabel.textContent = "Chrono";
        this.timerValue = document.createElement("span");
        this.timerValue.className = "hud-value";
        this.timerValue.textContent = "00:00.00";
        centerBlock.append(timerLabel, this.timerValue);

        const rightBlock = document.createElement("div");
        rightBlock.className = "hud-block";
        const levelLabel = document.createElement("span");
        levelLabel.className = "hud-label";
        levelLabel.textContent = "Niveau";
        this.levelValue = document.createElement("span");
        this.levelValue.className = "hud-value";
        this.levelValue.textContent = "-";
        const pauseHint = document.createElement("span");
        pauseHint.className = "hud-value";
        pauseHint.textContent = "ECHAP: pause";
        rightBlock.append(levelLabel, this.levelValue, pauseHint);

        this.root.append(leftBlock, centerBlock, rightBlock);
        document.body.appendChild(this.root);
    }

    public show(): void {
        this.root.classList.remove("ui-hidden");
    }

    public hide(): void {
        this.root.classList.add("ui-hidden");
    }

    public setLevelLabel(label: string): void {
        this.levelValue.textContent = label;
    }

    public setLives(currentLives: number, maxLives: number): void {
        const normalizedMaxLives = Math.max(1, Math.floor(maxLives));
        const normalizedCurrentLives = Math.max(
            0,
            Math.min(Math.floor(currentLives), normalizedMaxLives)
        );

        this.ensureHeartCount(normalizedMaxLives);
        this.livesContainer.setAttribute(
            "aria-label",
            `${normalizedCurrentLives} vie(s) sur ${normalizedMaxLives}`
        );

        for (let index = 0; index < this.heartIcons.length; index += 1) {
            const heart = this.heartIcons[index];
            const isActive = index < normalizedCurrentLives;
            heart.classList.toggle("hud-heart--empty", !isActive);
        }
    }

    public setTimer(elapsedSeconds: number): void {
        this.timerValue.textContent = this.formatTime(elapsedSeconds);
    }

    public formatTime(elapsedSeconds: number): string {
        const totalCentiseconds = Math.max(0, Math.floor(elapsedSeconds * 100));
        const minutes = Math.floor(totalCentiseconds / 6000);
        const seconds = Math.floor((totalCentiseconds % 6000) / 100);
        const centiseconds = totalCentiseconds % 100;

        return `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
    }

    public dispose(): void {
        this.root.remove();
    }

    private ensureHeartCount(maxLives: number): void {
        while (this.heartIcons.length < maxLives) {
            const heart = document.createElement("img");
            heart.className = "hud-heart";
            heart.src = `${import.meta.env.BASE_URL}assets/heart.png`;
            heart.alt = "";
            heart.setAttribute("aria-hidden", "true");
            this.heartIcons.push(heart);
            this.livesContainer.appendChild(heart);
        }

        while (this.heartIcons.length > maxLives) {
            const heart = this.heartIcons.pop();
            heart?.remove();
        }
    }
}
