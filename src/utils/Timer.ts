
/*
 * Classe utilitaire pour gérer un timer simple
 * Utilisé pour le chronomètre, les délais ou les cooldowns dans le jeu.
 * Le timer peut être démarré, arrêté, réinitialisé et mis à jour avec un delta de temps.
 */

export class Timer {
    private elapsedSeconds = 0;
    private running = false;

    public start(): void {
        this.running = true;
    }

    public stop(): void {
        this.running = false;
    }

    public reset(): void {
        this.elapsedSeconds = 0;
    }

    public update(deltaSeconds: number): void {
        if (!this.running) {
            return;
        }

        this.elapsedSeconds += deltaSeconds;
    }

    // obtenir le temps écoulé en secondes depuis le démarrage du timer
    public getElapsedSeconds(): number {
        return this.elapsedSeconds;
    }
}
