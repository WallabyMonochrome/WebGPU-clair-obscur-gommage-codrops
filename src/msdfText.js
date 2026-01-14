//msdfText.js

import * as THREE from "three/webgpu";
import { MSDFTextGeometry, MSDFTextNodeMaterial } from "three-msdf-text-utils";
import { texture, mix, uniform, clamp, pow, attribute, step, float, smoothstep } from "three/tsl";
import Debug, { DEBUG_FOLDERS } from "./debug.js";

export default class MSDFText {
    constructor() {
    }

    async initialize(text = "WebGPU Gommage Effect", position = new THREE.Vector3(0, 0, 0), uProgress) {
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

        const perlinTexture = await textureLoader.loadAsync("/textures/perlin.webp");
        perlinTexture.colorSpace = THREE.NoColorSpace;
        perlinTexture.minFilter = THREE.LinearFilter;
        perlinTexture.magFilter = THREE.LinearFilter;
        perlinTexture.wrapS = THREE.RepeatWrapping;
        perlinTexture.wrapT = THREE.RepeatWrapping;
        perlinTexture.generateMipmaps = false;

        // Create text geometry
        const textGeometry = new MSDFTextGeometry({
            text,
            font: fontData,
            width: 1000,
            align: "center",
        });
        console.log(textGeometry.attributes);

        const textMaterial = this.createTextMaterial(fontAtlasTexture, perlinTexture, uProgress);

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


    createTextMaterial(fontAtlasTexture, perlinTexture, uProgress) {
        const textMaterial = new MSDFTextNodeMaterial({
            map: fontAtlasTexture,
            transparent: true,
        });

        const glyphUv = attribute("glyphUv", "vec2");
        const center = attribute("center", "vec2");

        const uNoiseRemapMin = uniform(0.4);
        const uNoiseRemapMax = uniform(0.87);
        const uCenterScale = uniform(0.05);
        const uGlyphScale = uniform(0.75);
        const uDissolvedColor = uniform(new THREE.Color("#5E5E5E"));
        const uDesatComplete = uniform(0.45);
        const uBaseColor = uniform(new THREE.Color("#ECCFA3"));

        const customUv = center.mul(uCenterScale).add(glyphUv.mul(uGlyphScale));

        const perlinTextureNode = texture(perlinTexture, customUv).x;
        const perlinRemap = clamp(
            perlinTextureNode.sub(uNoiseRemapMin).div(uNoiseRemapMax.sub(uNoiseRemapMin)),
            0,
            1
        );
        const dissolve = step(uProgress, perlinRemap);
        const desaturationProgress = smoothstep(float(0.0), uDesatComplete, uProgress);

        const colorMix = mix(uBaseColor, uDissolvedColor, desaturationProgress);
        textMaterial.colorNode = colorMix;
        const msdfOpacity = textMaterial.opacityNode;
        textMaterial.opacityNode = msdfOpacity.mul(dissolve);

        return textMaterial;
    }
}