import { Vector3 } from "@babylonjs/core";
import type { LevelLayoutDefinition } from "./LevelTypes";

/*
 * Niveau 2 - Moyen.
 * Variante plus dense avec plus d'ennemis et une route aérienne plus longue.
 */
export const level2MediumLayout: LevelLayoutDefinition = {
    grounds: [
        { id: "spawn", type: "grass", options: { position: new Vector3(0, 0, 0), width: 12, depth: 12 } },
        { id: "lane1", type: "sand", options: { position: new Vector3(0, 0, -16), width: 12, depth: 12 } },
        { id: "lane2", type: "trampoline", options: { position: new Vector3(-10, 0, -31), width: 10, depth: 10 } },
        { id: "lane3", type: "trampoline", options: { position: new Vector3(10, 0, -31), width: 10, depth: 10 } },
        { id: "mid1", type: "grass", options: { position: new Vector3(0, 4, -48), width: 12, depth: 12 } },
        { id: "cloud1", type: "cloud", options: { position: new Vector3(-5, 5, -62), width: 7, depth: 7, travelAmplitude: new Vector3(3, 0, 0), oscillationSpeed: 1.8, zOscillationSpeedMultiplier: 1.0 } },
        { id: "cloud2", type: "cloud", options: { position: new Vector3(1, 5, -72), width: 7, depth: 7, travelAmplitude: new Vector3(0, 0, 3), oscillationSpeed: 1.8, zOscillationSpeedMultiplier: 1.0 } },
        { id: "cloud3", type: "cloud", options: { position: new Vector3(-6, 7, -84), width: 6, depth: 6, travelAmplitude: new Vector3(5, 0, 0), oscillationSpeed: 2.4, zOscillationSpeedMultiplier: 1.35 } },
        { id: "mid2", type: "grass", options: { position: new Vector3(0, 8, -98), width: 14, depth: 12 } },
        { id: "final", type: "grass", options: { position: new Vector3(0, 8, -118), width: 20, depth: 14} }
    ],
    doorCount: 1,
    playerSpawn: {
        placement: {
            mode: "ground",
            groundId: "spawn",
            offset: { x: 0, y: 1, z: 3 }
        },
        yaw: Math.PI
    },
    monsters: [
        {
            type: "basic",
            placement: {
                mode: "ground",
                groundId: "lane1",
                offset: { x: -3, y: 1, z: 0 }
            },
            count: 4,
            spacing: { x: 2.5, z: 0 }
        },
        {
            type: "shooter",
            placement: {
                mode: "ground",
                groundId: "mid1",
                offset: { x: -3, y: 1, z: 0 }
            },
            count: 2,
            spacing: { x: 6, z: 0 }
        },
        {
            type: "basic",
            placement: {
                mode: "ground",
                groundId: "mid2",
                offset: { x: -4, y: 1, z: 0 }
            },
            count: 3,
            spacing: { x: 4, z: 0 }
        },
        {
            type: "boss",
            placement: {
                mode: "ground",
                groundId: "final",
                offset: { x: 0, y: 1, z: -1 }
            }
        }
    ],
    items: [
        {
            type: "key",
            placement: {
                mode: "ground",
                groundId: "final",
                offset: { x: 0, y: 1.2, z: 2 }
            },
            options: {
                key: {
                    keyId: "level-2-key",
                    canInteractWithPlayer: true
                }
            }
        }
    ]
};
