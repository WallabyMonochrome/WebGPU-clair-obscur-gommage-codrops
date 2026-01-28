//experience.js

import * as THREE from 'three/webgpu';
import GommageOrchestrator from './gommageOrchestrator.js';
import { float, mrt, pass, output } from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';

export class Experience {
  #threejs = null;
  #scene = null;
  #camera = null;
  #webgpuComposer = null;

  constructor() {}

  async initialize(container) {
    await this.#setupProject(container);
    window.addEventListener('resize', this.#onWindowResize_.bind(this), false);
    await this.#setupPostprocessing();
    this.#raf();
  }

  async #setupProject(container) {
    this.#threejs = new THREE.WebGPURenderer({ antialias: true });
    await this.#threejs.init();

    this.#threejs.shadowMap.enabled = false;
    this.#threejs.toneMapping = THREE.ACESFilmicToneMapping;
    this.#threejs.setClearColor(0x111111, 1);
    this.#threejs.setSize(window.innerWidth, window.innerHeight);
    this.#threejs.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.#threejs.domElement);

    // Camera Setup !
    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 25;
    this.#camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera.position.set(0, 0, 5);
    // Call window resize to compute FOV
    this.#onWindowResize_();
    this.#scene = new THREE.Scene();
    // Test MSDF Text
    const gommageOrchestratorEntity = new GommageOrchestrator();
    await gommageOrchestratorEntity.initialize(this.#scene);
  }

  async #setupPostprocessing() {
    this.#webgpuComposer = new THREE.PostProcessing(this.#threejs);
    const scenePass = pass(this.#scene, this.#camera);

    scenePass.setMRT(
      mrt({
        output,
        bloomIntensity: float(0),
      })
    );
    let outNode = scenePass;

    const outputPass = scenePass.getTextureNode();
    const bloomIntensityPass = scenePass.getTextureNode('bloomIntensity');
    const bloomPass = bloom(outputPass.mul(bloomIntensityPass), 0.8);
    outNode = outNode.add(bloomPass);

    this.#webgpuComposer.outputNode = outNode.renderOutput();
    this.#webgpuComposer.needsUpdate = true;
  }

  #onWindowResize_() {
    const HORIZONTAL_FOV_TARGET = THREE.MathUtils.degToRad(45);
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    const verticalFov = 2 * Math.atan(Math.tan(HORIZONTAL_FOV_TARGET / 2) / this.#camera.aspect);
    this.#camera.fov = THREE.MathUtils.radToDeg(verticalFov);
    this.#camera.updateProjectionMatrix();
    this.#threejs.setSize(window.innerWidth, window.innerHeight);
  }

  #render() {
    //this.#threejs.render(this.#scene, this.#camera);
    this.#webgpuComposer.render();
  }

  #raf() {
    requestAnimationFrame((t) => {
      this.#render();
      this.#raf();
    });
  }
}

new Experience().initialize(document.querySelector('#canvas-container'));
