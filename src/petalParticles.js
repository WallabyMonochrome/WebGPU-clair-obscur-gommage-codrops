//petalParticles.js

import * as THREE from 'three/webgpu';
import {
  attribute,
  uniform,
  positionLocal,
  texture,
  vec4,
  mrt,
  uv,
  mix,
  normalLocal,
  instanceIndex,
  normalize,
  abs,
  dot,
  time,
  vec2,
  vec3,
  clamp,
  smoothstep,
  float,
  pow,
  cos,
  sin,
  mat3,
  TWO_PI,
} from 'three/tsl';

export default class PetalParticles {
  constructor() {}

  #spawnPos;
  #birthLifeSeedScale;
  #currentPetalIndex = 0;
  #petalMesh;
  #MAX_PETAL = 400;

  async initialize(perlinTexture, petalGeometry) {
    const petalGeo = petalGeometry.clone();
    const scale = 0.1;
    petalGeo.scale(scale, scale, scale);

    this.#spawnPos = new Float32Array(this.#MAX_PETAL * 3);
    // Combined 4 attributes into one to not go above the 9 attribute limit for webgpu
    this.#birthLifeSeedScale = new Float32Array(this.#MAX_PETAL * 4);
    this.#currentPetalIndex = 0;

    petalGeo.setAttribute('aSpawnPos', new THREE.InstancedBufferAttribute(this.#spawnPos, 3));
    petalGeo.setAttribute('aBirthLifeSeedScale', new THREE.InstancedBufferAttribute(this.#birthLifeSeedScale, 4));
    const material = this.createPetalMaterial(perlinTexture);
    this.#petalMesh = new THREE.InstancedMesh(petalGeo, material, this.#MAX_PETAL);
    return this.#petalMesh;
  }

  debugSpawnPetal() {
    for (let i = 0; i < 10; i++) {
      this.spawnPetal(new THREE.Vector3((Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0));
    }
  }

  spawnPetal(spawnPos) {
    if (this.#currentPetalIndex === this.#MAX_PETAL) this.#currentPetalIndex = 0;
    const id = this.#currentPetalIndex;
    this.#currentPetalIndex = this.#currentPetalIndex + 1;
    this.#spawnPos[id * 3 + 0] = spawnPos.x;
    this.#spawnPos[id * 3 + 1] = spawnPos.y;
    this.#spawnPos[id * 3 + 2] = spawnPos.z;
    this.#birthLifeSeedScale[id * 4 + 0] = performance.now() * 0.001; // Birth time
    this.#birthLifeSeedScale[id * 4 + 1] = 6; // Life time
    this.#birthLifeSeedScale[id * 4 + 2] = Math.random(); // Random seed
    this.#birthLifeSeedScale[id * 4 + 3] = Math.random() * 0.5 + 0.5; // Scale

    this.#petalMesh.geometry.attributes.aSpawnPos.needsUpdate = true;
    this.#petalMesh.geometry.attributes.aBirthLifeSeedScale.needsUpdate = true;
  }

  createPetalMaterial(perlinTexture) {
    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });

    function rotX(a) {
      const c = cos(a);
      const s = sin(a);
      const ns = s.mul(-1.0);
      return mat3(1.0, 0.0, 0.0, 0.0, c, ns, 0.0, s, c);
    }
    function rotY(a) {
      const c = cos(a);
      const s = sin(a);
      const ns = s.mul(-1.0);
      return mat3(c, 0.0, s, 0.0, 1.0, 0.0, ns, 0.0, c);
    }

    function rotZ(a) {
      const c = cos(a);
      const s = sin(a);
      const ns = s.mul(-1.0);
      return mat3(c, ns, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
    }

    const aSpawnPos = attribute('aSpawnPos', 'vec3');
    const aBirthLifeSeedScale = attribute('aBirthLifeSeedScale', 'vec4');
    const aBirth = aBirthLifeSeedScale.x;
    const aLife = aBirthLifeSeedScale.y;
    const aSeed = aBirthLifeSeedScale.z;
    const aScale = aBirthLifeSeedScale.w;

    const uWindDirection = uniform(new THREE.Vector3(-1, 0, 0).normalize());
    const uWindStrength = uniform(0.3);
    const uRiseSpeed = uniform(0.1); // constant lift
    const uNoiseScale = uniform(30.0); // start small (frequency)
    const uNoiseSpeed = uniform(0.015); // scroll speed
    const uWobbleAmp = uniform(0.6); // vertical wobble amplitude

    const uBendAmount = uniform(2.5);
    const uBendSpeed = uniform(1.0);
    const uSpinSpeed = uniform(2.0);
    const uSpinAmp = uniform(0.45); // overall rotation amount
    const uRedColor = uniform(new THREE.Color('#9B0000'));
    const uWhiteColor = uniform(new THREE.Color('#EEEEEE'));
    const uLightPosition = uniform(new THREE.Vector3(0, 0, 5));

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
    const turbulenceZ = noiseSample.sub(0.5).mul(2);

    const swirl = vec3(clamp(turbulenceX.mul(lifeInterpolation), 0, 1.0), turbulenceY.mul(lifeInterpolation), 0.0).mul(
      uWobbleAmp
    );

    // Bending
    const y = uv().y;
    const bendWeight = pow(y, float(3.0));

    const bend = bendWeight.mul(uBendAmount).mul(sin(dustAge.mul(uBendSpeed.mul(noiseSample))));

    const B = rotX(bend);

    const windImpulse = uWindDirection.mul(uWindStrength).mul(dustAge);

    const riseFactor = clamp(noiseSample, 0.3, 1.0);
    const rise = vec3(0.0, dustAge.mul(uRiseSpeed).mul(riseFactor), 0.0);
    const driftMovement = windImpulse.add(rise).add(swirl);

    // Spin
    const baseX = aSeed.mul(1.13).mod(1.0).mul(TWO_PI);
    const baseY = aSeed.mul(2.17).mod(1.0).mul(TWO_PI);
    const baseZ = aSeed.mul(3.31).mod(1.0).mul(TWO_PI);

    const spin = dustAge.mul(uSpinSpeed).mul(uSpinAmp);
    const rx = baseX.add(spin.mul(0.9).mul(turbulenceX.add(1.5)));
    const ry = baseY.add(spin.mul(1.2).mul(turbulenceY.add(1.5)));
    const rz = baseZ.add(spin.mul(0.7).mul(turbulenceZ.add(1.5)));

    const R = rotY(ry).mul(rotX(rx)).mul(rotZ(rz));

    // 0 at creation, 1 at death
    const scaleFactor = smoothstep(float(0), float(0.05), lifeInterpolation);
    const fadingOut = float(1.0).sub(smoothstep(float(0.8), float(1.0), lifeInterpolation));

    // Update local position
    const positionLocalUpdated = R.mul(B.mul(positionLocal));
    const normalUpdate = normalize(R.mul(B.mul(normalLocal)));

    // Compute world position
    const worldPosition = aSpawnPos.add(driftMovement).add(positionLocalUpdated.mul(aScale.mul(scaleFactor)));

    // Petals color computation
    const petalColor = mix(uRedColor, uWhiteColor, instanceIndex.mod(3).equal(0));

    const lightDirection = normalize(uLightPosition.sub(worldPosition));
    const facing = clamp(abs(dot(normalUpdate, lightDirection)), 0.4, 1);

    material.colorNode = petalColor.mul(facing);
    material.positionNode = worldPosition;
    material.opacityNode = fadingOut;

    material.mrtNode = mrt({
      bloomIntensity: float(0.7).mul(fadingOut),
    });

    return material;
  }
}
