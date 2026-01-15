//gommageOrchestrator.js

import * as THREE from "three/webgpu";
import MSDFText from "./msdfText.js";
import { uniform } from "three/tsl";
import DustParticles from "./dustParticles.js";
import Debug, { DEBUG_FOLDERS } from "./debug.js";
import gsap from "gsap";

export default class GommageOrchestrator {
    #uProgress = uniform(0.0);

    #MSDFTextEntity = null;
    #DustParticlesEntity = null;

    #dustInterval = 0.125;
    #gommageTween = null;
    #spawnDustTween = null;

    constructor() {
    }

    async initialize(scene) {
        const { perlinTexture, dustParticleTexture, fontAtlasTexture } = await this.loadTextures();

        const debugFolder = Debug.getInstance().getFolder(DEBUG_FOLDERS.MSDF_TEXT);
        this.#MSDFTextEntity = new MSDFText();
        const msdfText = await this.#MSDFTextEntity.initialize("WebGPU Gommage Effect", new THREE.Vector3(0, 0, 0), this.#uProgress, perlinTexture, fontAtlasTexture);
        scene.add(msdfText);

        this.#DustParticlesEntity = new DustParticles();
        const dustParticles = await this.#DustParticlesEntity.initialize(perlinTexture, dustParticleTexture);
        scene.add(dustParticles);

        const GommageButton = debugFolder.addButton({
            title: "GOMMAGE",
        });
        const ResetButton = debugFolder.addButton({
            title: "RESET",
        });
        const DustButton = debugFolder.addButton({
            title: "DUST",
        });
        GommageButton.on("click", () => {
            this.triggerGommage();
        });
        ResetButton.on("click", () => {
            this.resetGommage();
        });
        DustButton.on("click", () => {
            const randomPosition = this.#MSDFTextEntity.getRandomPositionInMesh();
            this.#DustParticlesEntity.spawnDust(randomPosition);
        });
    }

    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();

        const dustParticleTexture = await textureLoader.loadAsync("/textures/dustParticle.png");
        dustParticleTexture.colorSpace = THREE.NoColorSpace;
        dustParticleTexture.minFilter = THREE.LinearFilter;
        dustParticleTexture.magFilter = THREE.LinearFilter;
        dustParticleTexture.generateMipmaps = false;

        const perlinTexture = await textureLoader.loadAsync("/textures/perlin.webp");
        perlinTexture.colorSpace = THREE.NoColorSpace;
        perlinTexture.minFilter = THREE.LinearFilter;
        perlinTexture.magFilter = THREE.LinearFilter;
        perlinTexture.wrapS = THREE.RepeatWrapping;
        perlinTexture.wrapT = THREE.RepeatWrapping;
        perlinTexture.generateMipmaps = false;

        const fontAtlasTexture = await textureLoader.loadAsync("/fonts/Cinzel/Cinzel.png");
        fontAtlasTexture.colorSpace = THREE.NoColorSpace;
        fontAtlasTexture.minFilter = THREE.LinearFilter;
        fontAtlasTexture.magFilter = THREE.LinearFilter;
        fontAtlasTexture.wrapS = THREE.ClampToEdgeWrapping;
        fontAtlasTexture.wrapT = THREE.ClampToEdgeWrapping;
        fontAtlasTexture.generateMipmaps = false;

        return { perlinTexture, dustParticleTexture, fontAtlasTexture };
    }

    triggerGommage() {
        // Don't start if already running
        if (this.#gommageTween || this.#spawnDustTween) return;

        this.#spawnDustTween = gsap.to({}, {
            duration: this.#dustInterval,
            repeat: -1,
            onRepeat: () => {
                const p = this.#MSDFTextEntity.getRandomPositionInMesh();
                this.#DustParticlesEntity.spawnDust(p);
            },
        });

        this.#gommageTween = gsap.to(this.#uProgress, {
            value: 1,
            duration: 5,
            ease: "linear",
            onComplete: () => {
                this.#spawnDustTween?.kill();
                this.#spawnDustTween = null;
                this.#gommageTween = null;
            },
        });
    }

    resetGommage() {
        this.#gommageTween?.kill();
        this.#spawnDustTween?.kill();

        this.#gommageTween = null;
        this.#spawnDustTween = null;

        this.#uProgress.value = 0;
    }
}