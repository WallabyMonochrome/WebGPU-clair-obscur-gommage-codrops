//msdfText.js

import * as THREE from "three/webgpu";
import { MSDFTextGeometry, MSDFTextNodeMaterial } from "three-msdf-text-utils";

export default class MSDFText {
    constructor() {
    }

    async initialize(text = "WebGPU Gommage Effect", position = new THREE.Vector3(0, 0, 0)) {
        // Load font data
        const response = await fetch("/fonts/Cinzel/Cinzel.json");
        const fontData = await response.json();

        // Load font atlas
        const textureLoader = new THREE.TextureLoader();
        const fontAtlasTexture = await textureLoader.loadAsync("/fonts/Cinzel/Cinzel.png");
        fontAtlasTexture.colorSpace = THREE.NoColorSpace;
        fontAtlasTexture.minFilter = THREE.LinearFilter;
        fontAtlasTexture.magFilter = THREE.LinearFilter;
        fontAtlasTexture.wrapS = THREE.ClampToEdgeWrapping;
        fontAtlasTexture.wrapT = THREE.ClampToEdgeWrapping;
        fontAtlasTexture.generateMipmaps = false;

        // Create text geometry
        const textGeometry = new MSDFTextGeometry({
            text,
            font: fontData,
            width: 1000,
            align: "center",
        });

        const textMaterial = new MSDFTextNodeMaterial({
            map: fontAtlasTexture,
        });

        // Adjust to remove visual artifacts
        textMaterial.alphaTest = 0.1;
        const mesh = new THREE.Mesh(textGeometry, textMaterial);

        // With this we make the height of lineHeight 0.3 world units
        const targetLineHeight = 0.35;
        const lineHeightPx = fontData.common.lineHeight;
        let textScale = targetLineHeight / lineHeightPx;

        mesh.scale.set(textScale, textScale, textScale);
        const meshOffset = -(textGeometry.layout.width / 2) * textScale;
        mesh.position.set(position.x + meshOffset, position.y, position.z);
        mesh.rotation.x = Math.PI;
        return mesh;

    }
}