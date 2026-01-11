import * as THREE from "three/webgpu";

export class Experience {

  #threejs = null;
  #scene = null;
  #camera = null;
  #cube = null;

  constructor() {}

  async initialize(container) {
    await this.#setupProject(container);
    window.addEventListener("resize",  this.#onWindowResize_.bind(this), false);
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
    this.#scene = new THREE.Scene();

    this.createCube();
  }

  createCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.#cube = new THREE.Mesh(geometry, material);
    this.#scene.add(this.#cube);
  }

  #onWindowResize_() {
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
    this.#threejs.setSize(window.innerWidth, window.innerHeight);
  }


  #render() {
    this.#threejs.render(this.#scene, this.#camera);
  }


  #raf() {
    requestAnimationFrame(t => {
      this.#cube.rotation.x += 0.001;
      this.#cube.rotation.y += 0.001;
      this.#render();
      this.#raf();
    });
  }
}

new Experience().initialize(document.querySelector("#canvas-container"));