//dustParticles.js

import * as THREE from 'three/webgpu';
import {
  attribute,
  uniform,
  positionLocal,
  texture,
  vec4,
  uv,
  mrt,
  time,
  vec2,
  vec3,
  clamp,
  sin,
  smoothstep,
  float,
} from 'three/tsl';

export default class DustParticles {
  constructor() {}

  #spawnPos;
  #birthLifeSeedScale;
  #currentDustIndex = 0;
  #dustMesh;
  #MAX_DUST = 100;

  async initialize(perlinTexture, dustParticleTexture) {
    const dustGeometry = new THREE.PlaneGeometry(0.02, 0.02);
    this.#spawnPos = new Float32Array(this.#MAX_DUST * 3);
    // Combined 4 attributes into one to not go above the 9 attribute limit for webgpu
    this.#birthLifeSeedScale = new Float32Array(this.#MAX_DUST * 4);
    this.#currentDustIndex = 0;

    dustGeometry.setAttribute('aSpawnPos', new THREE.InstancedBufferAttribute(this.#spawnPos, 3));
    dustGeometry.setAttribute('aBirthLifeSeedScale', new THREE.InstancedBufferAttribute(this.#birthLifeSeedScale, 4));
    const material = this.createDustMaterial(perlinTexture, dustParticleTexture);
    this.#dustMesh = new THREE.InstancedMesh(dustGeometry, material, this.#MAX_DUST);
    return this.#dustMesh;
  }

  debugSpawnDust() {
    for (let i = 0; i < 10; i++) {
      this.spawnDust(new THREE.Vector3((Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0));
    }
  }

  spawnDust(spawnPos) {
    if (this.#currentDustIndex === this.#MAX_DUST) this.#currentDustIndex = 0;
    const id = this.#currentDustIndex;
    this.#currentDustIndex = this.#currentDustIndex + 1;
    this.#spawnPos[id * 3 + 0] = spawnPos.x;
    this.#spawnPos[id * 3 + 1] = spawnPos.y;
    this.#spawnPos[id * 3 + 2] = spawnPos.z;
    this.#birthLifeSeedScale[id * 4 + 0] = performance.now() * 0.001; // Birth time
    this.#birthLifeSeedScale[id * 4 + 1] = 4; // Life time
    this.#birthLifeSeedScale[id * 4 + 2] = Math.random(); // Random seed
    this.#birthLifeSeedScale[id * 4 + 3] = Math.random() * 0.5 + 0.5; // Scane

    this.#dustMesh.geometry.attributes.aSpawnPos.needsUpdate = true;
    this.#dustMesh.geometry.attributes.aBirthLifeSeedScale.needsUpdate = true;
  }

  createDustMaterial(perlinTexture, dustTexture) {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const aSpawnPos = attribute('aSpawnPos', 'vec3');
    const aBirthLifeSeedScale = attribute('aBirthLifeSeedScale', 'vec4');
    const aBirth = aBirthLifeSeedScale.x;
    const aLife = aBirthLifeSeedScale.y;
    const aSeed = aBirthLifeSeedScale.z;
    const aScale = aBirthLifeSeedScale.w;

    const uDustColor = uniform(new THREE.Color('#8A8A8A'));
    const uWindDirection = uniform(new THREE.Vector3(-1, 0, 0).normalize());
    const uWindStrength = uniform(0.3);
    const uRiseSpeed = uniform(0.1); // constant lift
    const uNoiseScale = uniform(30.0); // start small (frequency)
    const uNoiseSpeed = uniform(0.015); // scroll speed
    const uWobbleAmp = uniform(0.6); // vertical wobble amplitude

    // Age of the dust in seconds
    const dustAge = time.sub(aBirth);
    const lifeInterpolation = clamp(dustAge.div(aLife), 0, 1);

    // Use noise
    const randomSeed = vec2(aSeed.mul(123.4), aSeed.mul(567.8));
    const noiseUv = aSpawnPos.xz
      .mul(uNoiseScale)
      .add(randomSeed)
      .add(uWindDirection.xz.mul(dustAge.mul(uNoiseSpeed)));

    // Return a value between 0 and 1.
    const noiseSample = texture(perlinTexture, noiseUv).x;
    const noiseSammpleBis = texture(perlinTexture, noiseUv.add(vec2(13.37, 7.77))).x;

    // Convert to turbulence values between -1 and 1.
    const turbulenceX = noiseSample.sub(0.5).mul(2);
    const turbulenceY = noiseSammpleBis.sub(0.5).mul(2);

    const swirl = vec3(clamp(turbulenceX.mul(lifeInterpolation), 0, 1.0), turbulenceY.mul(lifeInterpolation), 0.0).mul(
      uWobbleAmp
    );

    const windImpulse = uWindDirection.mul(uWindStrength).mul(dustAge);

    const riseFactor = clamp(noiseSample, 0.3, 1.0);
    const rise = vec3(0.0, dustAge.mul(uRiseSpeed).mul(riseFactor), 0.0);
    const driftMovement = windImpulse.add(rise).add(swirl);

    // 0 at creation, 1 at death
    const scaleFactor = smoothstep(float(0), float(0.05), lifeInterpolation);
    const fadingOut = float(1.0).sub(smoothstep(float(0.8), float(1.0), lifeInterpolation));

    const dustSample = texture(dustTexture, uv());
    material.colorNode = vec4(uDustColor, dustSample.a);
    material.positionNode = aSpawnPos.add(driftMovement).add(positionLocal.mul(aScale.mul(scaleFactor)));
    material.opacityNode = fadingOut;

    material.mrtNode = mrt({
      bloomIntensity: float(0.5).mul(fadingOut),
    });

    return material;
  }
}
