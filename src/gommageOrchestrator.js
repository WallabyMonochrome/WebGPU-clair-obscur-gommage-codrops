//gommageOrchestrator.js

import * as THREE from "three/webgpu";
import MSDFText from "./msdfText.js";
export default class GommageOrchestrator {
    constructor() {
    }

    async initialize(scene) {
        const MSDFTextEntity = new MSDFText();
        const msdfText = await MSDFTextEntity.initialize("WebGPU Gommage Effect", new THREE.Vector3(0, 0, 0));
        scene.add(msdfText);
    }
}