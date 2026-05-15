import "./main.css";
import { Game } from "./core/Game";

// on récupère le canvas de rendu dans le DOM
const canvas = document.getElementById("renderCanvas");

if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas de rendu introuvable");
}

// si présent, on initialise le jeu et on lance
const game = new Game(canvas);
game.start();
