import { Vector3 } from "@babylonjs/core";
import type { LevelLayoutDefinition } from "./LevelTypes";

/*
 * Niveau 1 - Facile.
 * Ancienne test map, renommée et conservée comme premier vrai niveau du jeu.
 */
export const level1EasyLayout: LevelLayoutDefinition = {
    grounds: [
        { id: "id1", type: "grass", options: { position: new Vector3(0, 0, 0), width: 12, depth: 12 } },
        { id: "id2", type: "grass", options: { position: new Vector3(0, 0, -17), width: 12, depth: 12 } },
        { id: "id3", type: "sand", options: { position: new Vector3(0, 0, -30), width: 12, depth: 13 } },
        { id: "id4", type: "trampoline", options: { position: new Vector3(-10, 0, -45), width: 12, depth: 12 } },
        { id: "id5", type: "quicksand", options: { position: new Vector3(10, 0, -45), width: 12, depth: 12 } },
        { id: "id41", type: "grass", options: { position: new Vector3(-10, 5, -58), width: 12, depth: 12 } },
        { id: "id42", type: "grass", options: { position: new Vector3(-10, 5, -72), width: 12, depth: 12 } },
        { id: "id43", type: "grass", options: { position: new Vector3(-10, 5, -89), width: 12, depth: 12 } },
        { id: "id51", type: "cloud", options: { position: new Vector3(8, 0, -55), width: 6, depth: 6, travelAmplitude: new Vector3(4.5, 0, 0), oscillationSpeed: 1.6, zOscillationSpeedMultiplier: 0.7 } },
        { id: "id52", type: "cloud", options: { position: new Vector3(14, 0, -64), width: 6, depth: 6, travelAmplitude: new Vector3(5.5, 0, 0), oscillationSpeed: 2.1, zOscillationSpeedMultiplier: 1.15 } },
        { id: "id53", type: "cloud", options: { position: new Vector3(7, 0, -73), width: 6, depth: 6, travelAmplitude: new Vector3(4.8, 0, 0), oscillationSpeed: 1.8, zOscillationSpeedMultiplier: 0.9 } },
        { id: "id54", type: "cloud", options: { position: new Vector3(13, 0, -82), width: 6, depth: 6, travelAmplitude: new Vector3(5.2, 0, 0), oscillationSpeed: 2.3, zOscillationSpeedMultiplier: 1.35 } },
        { id: "id55", type: "sand", options: { position: new Vector3(13, 0, -91.5), width: 6, depth: 13 } },
        { id: "id6", type: "grass", options: { position: new Vector3(0, 0, -104), width: 34, depth: 12 } }
    ],
    doorCount: 1,
    playerSpawn: {
        placement: {
            mode: "ground",
            groundId: "id1",
            offset: { x: 0, y: 1, z: 4 }
        },
        yaw: Math.PI
    },
    monsters: [
        {
            type: "basic",
            placement: {
                mode: "ground",
                groundId: "id2",
                offset: { x: -3, y: 1, z: 0 }
            },
            count: 3,
            spacing: { x: 3, z: 0 }
        },
        {
            type: "shooter",
            placement: {
                mode: "ground",
                groundId: "id42",
                offset: { x: -2, y: 1, z: 0 }
            },
            count: 2,
            spacing: { x: 4, z: 0 }
        },
        {
            type: "boss",
            placement: {
                mode: "ground",
                groundId: "id43",
                offset: { x: 0, y: 1, z: 0 }
            }
        }
    ],
    items: [
        {
            type: "key",
            placement: {
                mode: "ground",
                groundId: "id6",
                offset: { x: 0, y: 1.2, z: 0 }
            },
            options: {
                key: {
                    keyId: "level-1-key",
                    canInteractWithPlayer: true
                }
            }
        }
    ]
};
