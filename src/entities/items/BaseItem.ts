/*
 * Contrat minimal d'un item placé dans un niveau.
 * Les items peuvent implémenter leur logique d'animation ou interaction dans update.
 */
export abstract class BaseItem {
    public update(deltaTime: number): void {
        void deltaTime;
    }
}
