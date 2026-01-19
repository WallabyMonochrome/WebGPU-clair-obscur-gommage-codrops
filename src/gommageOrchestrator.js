//gommageOrchestrator.js

import * as THREE from "three/webgpu";
import MSDFText from "./msdfText.js";
import { uniform } from "three/tsl";
import DustParticles from "./dustParticles.js";
import PetalParticles from "./petalParticles.js";
import Debug, { DEBUG_FOLDERS } from "./debug.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import gsap from "gsap";

export default class GommageOrchestrator {
    #uProgress = uniform(0.0);

    #MSDFTextEntity = null;
    #DustParticlesEntity = null;
    #PetalParticlesEntity = null;

    #dustInterval = 0.125;
    #petalInterval = 0.05;
    #gommageTween = null;
    #spawnDustTween = null;
    #spawnPetalTween = null;

    constructor() {
    }

    async initialize(scene) {
        const { perlinTexture, dustParticleTexture, fontAtlasTexture } = await this.loadTextures();
        const petalGeometry = await this.loadPetalGeometry();
        
        const debugFolder = Debug.getInstance().getFolder(DEBUG_FOLDERS.MSDF_TEXT);
        this.#MSDFTextEntity = new MSDFText();
        const msdfText = await this.#MSDFTextEntity.initialize("WebGPU Gommage Effect", new THREE.Vector3(0, 0, 0), this.#uProgress, perlinTexture, fontAtlasTexture);
        scene.add(msdfText);

        this.#DustParticlesEntity = new DustParticles();
        const dustParticles = await this.#DustParticlesEntity.initialize(perlinTexture, dustParticleTexture);
        scene.add(dustParticles);

        this.#PetalParticlesEntity = new PetalParticles();
        const petalParticles = await this.#PetalParticlesEntity.initialize(perlinTexture, petalGeometry);
        scene.add(petalParticles);

        const GommageButton = debugFolder.addButton({
            title: "GOMMAGE",
        });
        const ResetButton = debugFolder.addButton({
            title: "RESET",
        });
        const DustButton = debugFolder.addButton({
            title: "DUST",
        });
        const PetalButton = debugFolder.addButton({
            title: "PETAL",
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
        PetalButton.on("click", () => {
            this.#PetalParticlesEntity.debugSpawnPetal();
        });

        // Use HTML buttons
        this.gommageButton = document.getElementById("gommage-button");
        this.gommageButton.addEventListener("click", () => {
            console.log("gommage button clicked");
            this.triggerGommage();
        });
    }

    async loadPetalGeometry() {
        const modelLoader = new GLTFLoader();
        const petalScene = await modelLoader.loadAsync("/models/petal.glb");
        const petalMesh = petalScene.scene.getObjectByName("PetalV2");
        return petalMesh.geometry;
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
        if (this.#gommageTween || this.#spawnDustTween || this.#spawnPetalTween) return;
        this.#uProgress.value = 0;

        // Disable button while effect is running
        this.gommageButton.disabled = true;
        this.gommageButton.classList.add("disabled");

        this.#spawnDustTween = gsap.to({}, {
            duration: this.#dustInterval,
            repeat: -1,
            onRepeat: () => {
                const p = this.#MSDFTextEntity.getRandomPositionInMesh();
                this.#DustParticlesEntity.spawnDust(p);
            },
        });

        this.#spawnPetalTween = gsap.to({}, {
            duration: this.#petalInterval,
            repeat: -1,
            onRepeat: () => {
                const p = this.#MSDFTextEntity.getRandomPositionInMesh();
                this.#PetalParticlesEntity.spawnPetal(p);
            },
        });

        this.#gommageTween = gsap.to(this.#uProgress, {
            value: 1,
            duration: 6,
            ease: "linear",
            onComplete: () => {
                this.#spawnDustTween?.kill();
                this.#spawnPetalTween?.kill();
                this.#spawnDustTween = null;
                this.#gommageTween = null;
                this.#spawnPetalTween = null;
                gsap.delayedCall(1, () => {
                    this.gommageButton.disabled = false;
                    this.gommageButton.classList.remove("disabled");
                });
            },
        });
    }

    resetGommage() {
        this.#gommageTween?.kill();
        this.#spawnDustTween?.kill();
        this.#spawnPetalTween?.kill();

        this.#gommageTween = null;
        this.#spawnDustTween = null;
        this.#spawnPetalTween = null;

        this.#uProgress.value = 0;
    }
}