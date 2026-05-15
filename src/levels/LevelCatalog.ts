
// utilisé pour définir les niveaux dispo dans le jeu, avec les métadonnées d'affichage (menu)
export interface LevelCatalogEntry {
    id: number;
    label: string;
    description: string;
}

/**
 * Catalogue des niveaux disponibles dans le jeu.
 * Utilisé pour afficher les options de sélection de niveau et pour valider les choix de l'utilisateur
 */

export const LEVEL_CATALOG: ReadonlyArray<LevelCatalogEntry> = [
    {
        id: 0,
        label: "Niveau 1 - Facile",
        description: "Parcours d'introduction (prototype)."
    },
    {
        id: 1,
        label: "Niveau 2 - Moyen",
        description: "Variante intermédiaire (placeholder temporaire)."
    },
    {
        id: 2,
        label: "Niveau 3 - Difficile",
        description: "Variante avancée (placeholder temporaire)."
    }
];

export const DEFAULT_LEVEL_ID = LEVEL_CATALOG[0].id;

export function isValidLevelId(levelId: number): boolean {
    return LEVEL_CATALOG.some((entry) => entry.id === levelId);
}

export function getLevelLabel(levelId: number): string {
    const level = LEVEL_CATALOG.find((entry) => entry.id === levelId);
    return level?.label ?? `Niveau ${levelId + 1}`;
}

export function getNextLevelId(levelId: number): number | null {
    const currentIndex = LEVEL_CATALOG.findIndex((entry) => entry.id === levelId);
    if (currentIndex < 0 || currentIndex >= LEVEL_CATALOG.length - 1) {
        return null;
    }

    return LEVEL_CATALOG[currentIndex + 1].id;
}
