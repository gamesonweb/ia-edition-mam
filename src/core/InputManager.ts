export class InputManager {
    private readonly keyState = new Map<string, boolean>();

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        this.keyState.set(event.code, true);
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        this.keyState.set(event.code, false);
    };

    public constructor() {
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
    }

    public isKeyDown(code: string): boolean {
        return this.keyState.get(code) === true;
    }

    public clearKeyState(): void {
        this.keyState.clear();
    }

    public dispose(): void {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        this.clearKeyState();
    }
}
