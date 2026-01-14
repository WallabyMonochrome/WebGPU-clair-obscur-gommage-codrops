//gommageOrchestrator.js

import * as THREE from "three/webgpu";
import MSDFText from "./msdfText.js";
import { uniform } from "three/tsl";
import Debug, { DEBUG_FOLDERS } from "./debug.js";
import gsap from "gsap";

export default class GommageOrchestrator {
    #uProgress = uniform(0.0);
    constructor() {
    }

    async initialize(scene) {
        const debugFolder = Debug.getInstance().getFolder(DEBUG_FOLDERS.MSDF_TEXT);
        const MSDFTextEntity = new MSDFText();
        const msdfText = await MSDFTextEntity.initialize("WebGPU Gommage Effect", new THREE.Vector3(0, 0, 0), this.#uProgress);
        scene.add(msdfText);
        const GommageButton = debugFolder.addButton({
            title: "GOMMAGE",
        });
        const ResetButton = debugFolder.addButton({
            title: "RESET",
        });
        GommageButton.on("click", () => {
            this.triggerGommage();
        });
        ResetButton.on("click", () => {
            this.resetGommage();
        });
    }

    triggerGommage() {
        gsap.to(this.#uProgress, {
            value: 1,
            duration: 4,
            ease: "linear",
        });
    }

    resetGommage() {
       this.#uProgress.value = 0;
    }
}