/* global AFRAME, THREE */

const CONFIG = {
  lightDistance: 36,
  raycasterFar: 32,
  pointerRaycasterFar: 14,
  handRaycasterFar: 24,
  viewerRigStart: { x: 0, y: 15, z: 24 },
};

const PLANET_DATA = [
  { name: 'Mercury', radiusKm: 2440, au: 0.387, periodDays: 87.97, rotationHours: 1407.6, type: 'Rocky', color: '#b6a89e', tagline: 'Small, swift, and sun-baked.', description: 'The smallest planet races around the Sun in just 88 Earth days. Its surface is covered in ancient craters.', info: 'Smallest planet.\nA year lasts just 88 Earth days.\nSurface covered in ancient craters.' },
  { name: 'Venus', radiusKm: 6052, au: 0.723, periodDays: 224.7, rotationHours: -5832.5, type: 'Rocky', color: '#dfb883', tagline: 'A world of clouds and extremes.', description: 'Venus is wrapped in thick clouds and has the hottest surface of any planet, even though Mercury is closer to the Sun.', info: 'Hottest planetary surface.\nThick clouds trap the heat.\nIt spins in the opposite direction.' },
  { name: 'Earth', radiusKm: 6371, au: 1, periodDays: 365.25, rotationHours: 23.93, type: 'Rocky', color: '#4c9bd2', tagline: 'Our pale blue home.', description: 'The only world we know of with life on its surface—and the only one with liquid water covering most of it.', info: 'Our pale blue home.\nLiquid water covers most of it.\nThe only known world with life.' },
  { name: 'Mars', radiusKm: 3390, au: 1.524, periodDays: 687, rotationHours: 24.62, type: 'Rocky', color: '#ce7153', tagline: 'A rusty desert with big ambitions.', description: 'Mars is home to giant volcanoes, deep canyons, and robotic explorers looking for clues about its watery past.', info: 'A rusty desert world.\nHome to giant volcanoes.\nExplored by robotic rovers.' },
  { name: 'Jupiter', radiusKm: 69911, au: 5.203, periodDays: 4331, rotationHours: 9.93, type: 'Gas giant', color: '#d7b89c', tagline: 'King of the planets.', description: 'Jupiter is the largest planet, with swirling cloud bands and a centuries-old storm called the Great Red Spot.', info: 'The largest planet.\nIts Great Red Spot is a huge storm.\nA gas giant with faint rings.' },
  { name: 'Saturn', radiusKm: 58232, au: 9.537, periodDays: 10747, rotationHours: 10.66, type: 'Gas giant', color: '#ddcc9e', tagline: 'A giant wearing rings of ice.', description: 'Saturn’s bright rings are made of countless pieces of ice and rock, from tiny grains to chunks as large as a house.', info: 'Famous for bright rings.\nRings are made of ice and rock.\nA giant planet of gas.' },
  { name: 'Uranus', radiusKm: 25362, au: 19.19, periodDays: 30589, rotationHours: -17.24, type: 'Ice giant', color: '#8ac9ce', tagline: 'The sideways-spinning ice giant.', description: 'Uranus rotates on its side, giving it some of the most extreme seasons in the solar system.', info: 'An ice giant with a blue-green hue.\nIt spins almost on its side.\nIts seasons last for years.' },
  { name: 'Neptune', radiusKm: 24622, au: 30.07, periodDays: 59800, rotationHours: 16.11, type: 'Ice giant', color: '#5679d6', tagline: 'A distant world of fast winds.', description: 'Neptune is so far from the Sun that it takes about 165 Earth years to complete one orbit. Its winds are among the fastest measured.', info: 'The most distant planet.\nA year lasts about 165 Earth years.\nKnown for extremely fast winds.' },
];

const SCALE = {
  artistic: { A: 0.4, B: 6, sunRadius: 2.8, labelOffset: 0.28 },
};

function getScale(mode = 'artistic') {
  const settings = mode === 'artistic' ? SCALE.artistic : SCALE.artistic;
  return {
    planetRadius: (planet) => settings.A * Math.pow(planet.radiusKm / 6371, 0.45),
    orbitRadius: (planet) => settings.B * Math.pow(planet.au, 0.5),
    sunRadius: () => settings.sunRadius,
    labelOffset: () => settings.labelOffset,
  };
}

function checkInvariants(mode = 'artistic') {
  const scale = getScale(mode);
  const failures = [];
  const radii = PLANET_DATA.map((planet) => scale.planetRadius(planet));
  const orbitRadii = PLANET_DATA.map((planet) => scale.orbitRadius(planet));
  const sunRadius = scale.sunRadius();

  if (sunRadius < Math.max(...radii)) {
    failures.push('sunRadius >= max(planetRadius)');
  }

  PLANET_DATA.forEach((planet, index) => {
    if (orbitRadii[index] - radii[index] <= sunRadius) {
      failures.push(`planet overlaps the Sun: ${planet.name}`);
    }
  });

  for (let i = 0; i < PLANET_DATA.length - 1; i += 1) {
    if (orbitRadii[i + 1] - orbitRadii[i] <= radii[i] + radii[i + 1]) {
      failures.push(`orbit spacing fails between ${PLANET_DATA[i].name} and ${PLANET_DATA[i + 1].name}`);
    }
  }

  if (PLANET_DATA.some((planet, index) => index > 0 && planet.au <= PLANET_DATA[index - 1].au)) {
    failures.push('orbit order invariant failed');
  }

  if (failures.length > 0) {
    console.warn('checkInvariants failed:', failures);
  } else {
    console.info('checkInvariants passed');
  }

  return failures;
}

const planets = PLANET_DATA.map((planet) => ({
  ...planet,
  period: planet.periodDays,
  rotation: planet.rotationHours,
  year: planet.periodDays < 365 ? `${Math.round(planet.periodDays)} days` : `${(planet.periodDays / 365.25).toFixed(1).replace(/\.0$/, '')} years`,
  radius: getScale('artistic').planetRadius(planet),
  orbit: getScale('artistic').orbitRadius(planet),
}));

const scene = document.querySelector('#solar-scene');
const orbitRoot = document.querySelector('#orbits');
const sunRoot = document.querySelector('#sun-system');
const solarModel = document.querySelector('#solar-model');
const camera = document.querySelector('#camera');
const viewerRig = document.querySelector('#viewer-rig');
const selectedCard = document.querySelector('#planet-card');
const intro = document.querySelector('.intro');
const playButton = document.querySelector('#play-button');
const speedButton = document.querySelector('#speed-button');
const toast = document.querySelector('#toast');
const helpPopover = document.querySelector('#help-popover');
const vignette = document.querySelector('.scene-vignette');

const planetNodes = [];

let paused = false;
let realSpeed = false;
let selectedPlanet = null;
let isVr = false;
let vrReturnMode = 'title';
let toastTimer;
const cameraLooker = new THREE.Camera();
const cameraControl = {
  mode: 'title',
  target: new THREE.Vector3(),
  azimuth: 0,
  elevation: 0,
  distance: 0,
  minDistance: 1.2,
  maxDistance: 100,
  overview: null,
  transition: null,
};

function getOverviewTarget() {
  const target = new THREE.Vector3();
  solarModel.object3D.getWorldPosition(target);
  target.y += 2.4;
  return target;
}

function getFocusedBody() {
  if (!selectedPlanet || selectedPlanet.name === 'Sun') return null;
  return document.querySelector(`[data-planet="${selectedPlanet.name}"]`);
}

function getCameraDestination() {
  if (cameraControl.mode === 'focus') {
    const body = getFocusedBody();
    if (body) {
      const target = new THREE.Vector3();
      body.object3D.getWorldPosition(target);
      return target;
    }
  }
  return getOverviewTarget();
}

function applyDesktopCamera() {
  const horizontalDistance = cameraControl.distance * Math.cos(cameraControl.elevation);
  const position = new THREE.Vector3(
    cameraControl.target.x + horizontalDistance * Math.sin(cameraControl.azimuth),
    cameraControl.target.y + cameraControl.distance * Math.sin(cameraControl.elevation),
    cameraControl.target.z + horizontalDistance * Math.cos(cameraControl.azimuth),
  );
  cameraLooker.position.copy(position);
  cameraLooker.lookAt(cameraControl.target);
  viewerRig.object3D.position.copy(position);
  viewerRig.object3D.rotation.copy(cameraLooker.rotation);
  viewerRig.object3D.updateMatrixWorld(true);
}

function rememberOverview() {
  cameraControl.overview = {
    azimuth: cameraControl.azimuth,
    elevation: cameraControl.elevation,
    distance: cameraControl.distance,
  };
}

function transitionCamera(mode, distance, saveOverview = false, view = null) {
  if (!cameraControl.initialized) return;
  if (saveOverview) rememberOverview();
  cameraControl.mode = mode;
  cameraControl.minDistance = mode === 'focus' && selectedPlanet
    ? Math.max(1.2, (selectedPlanet.radius || 0.4) * 1.4)
    : 5;
  const startTarget = cameraControl.target.clone();
  cameraControl.transition = {
    elapsed: 0,
    duration: 900,
    startTarget,
    startAzimuth: cameraControl.azimuth,
    startElevation: cameraControl.elevation,
    startDistance: cameraControl.distance,
    endAzimuth: view?.azimuth ?? cameraControl.azimuth,
    endElevation: view?.elevation ?? cameraControl.elevation,
    endDistance: THREE.MathUtils.clamp(distance, cameraControl.minDistance, cameraControl.maxDistance),
  };
}

function updateDesktopCamera(delta) {
  if (!cameraControl.initialized || isVr) return;
  const destination = getCameraDestination();
  if (cameraControl.transition) {
    const transition = cameraControl.transition;
    transition.elapsed += delta;
    const progress = THREE.MathUtils.clamp(transition.elapsed / transition.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    cameraControl.target.lerpVectors(transition.startTarget, destination, eased);
    cameraControl.azimuth = THREE.MathUtils.lerp(transition.startAzimuth, transition.endAzimuth, eased);
    cameraControl.elevation = THREE.MathUtils.lerp(transition.startElevation, transition.endElevation, eased);
    cameraControl.distance = THREE.MathUtils.lerp(transition.startDistance, transition.endDistance, eased);
    if (progress === 1) cameraControl.transition = null;
  } else {
    cameraControl.target.copy(destination);
  }
  applyDesktopCamera();
}

function initializeDesktopCamera() {
  if (AFRAME.utils.device.isMobile()) {
    camera.setAttribute('look-controls', 'enabled', true);
    cameraControl.initialized = true;
    cameraControl.mode = 'title';
    return;
  }

  const position = new THREE.Vector3();
  viewerRig.object3D.getWorldPosition(position);
  cameraControl.target.copy(getOverviewTarget());
  const offset = position.sub(cameraControl.target);
  cameraControl.distance = offset.length();
  cameraControl.azimuth = Math.atan2(offset.x, offset.z);
  cameraControl.elevation = Math.asin(THREE.MathUtils.clamp(offset.y / cameraControl.distance, -1, 1));
  cameraControl.mode = 'title';
  cameraControl.initialized = true;
  cameraControl.overview = {
    azimuth: cameraControl.azimuth,
    elevation: cameraControl.elevation,
    distance: 43,
  };
  cameraControl.minDistance = 5;
  cameraControl.transition = null;
  camera.setAttribute('look-controls', 'enabled', false);
  viewerRig.setAttribute('desktop-camera-controller', '');

  const canvas = scene.canvas;
  let drag = null;
  let dragged = false;
  window.addEventListener('pointermove', (event) => {
    if (isVr || !drag || event.pointerId !== drag.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) dragged = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!dragged) return;
    cameraControl.transition = null;
    cameraControl.azimuth -= deltaX * 0.005;
    cameraControl.elevation = THREE.MathUtils.clamp(cameraControl.elevation + deltaY * 0.005, -1.35, 1.35);
    if (cameraControl.mode === 'explore') rememberOverview();
  });
  window.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.pointerId) drag = null;
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || isVr) return;
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    };
    dragged = false;
  });
  canvas.addEventListener('wheel', (event) => {
    if (isVr) return;
    event.preventDefault();
    cameraControl.transition = null;
    cameraControl.distance = THREE.MathUtils.clamp(
      cameraControl.distance * Math.exp(event.deltaY * 0.001),
      cameraControl.minDistance,
      cameraControl.maxDistance,
    );
    if (cameraControl.mode === 'explore') rememberOverview();
  }, { passive: false });
  canvas.addEventListener('click', (event) => {
    if (dragged) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dragged = false;
      return;
    }
    if (!selectedPlanet || isVr) return;
    const bounds = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    camera.object3D.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera.object3D);
    const interactiveObjects = Array.from(scene.querySelectorAll('.interactive'))
      .map((entity) => entity.object3D)
      .filter(Boolean);
    if (raycaster.intersectObjects(interactiveObjects, true).length === 0) returnOverview();
  }, true);
}

AFRAME.registerComponent('desktop-camera-controller', {
  tick(time, delta) {
    updateDesktopCamera(delta);
  },
});

AFRAME.registerComponent('starfield', {
  init() {
    const positions = [];
    for (let i = 0; i < 1250; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const distance = 58 + Math.random() * 18;
      positions.push(distance * Math.sin(phi) * Math.cos(theta), distance * Math.cos(phi), distance * Math.sin(phi) * Math.sin(theta));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xc6d8f4, size: 0.075, sizeAttenuation: true, transparent: true, opacity: 0.8 });
    this.points = new THREE.Points(geometry, material);
    this.el.object3D.add(this.points);
  },
  remove() {
    this.points?.geometry.dispose();
    this.points?.material.dispose();
  },
});

function applyScaleMode() {
  const scale = getScale('artistic');
  const sunBodies = sunRoot.querySelectorAll('a-sphere');
  const corona = sunBodies[0];
  const sun = sunBodies[1] || sunBodies[0];
  const sunRadius = scale.sunRadius();

  if (sun) {
    sun.setAttribute('radius', String(sunRadius));
  }

  if (corona) {
    corona.setAttribute('radius', String(sunRadius * 1.2));
  }

  planets.forEach((planet) => {
    planet.radius = scale.planetRadius(planet);
    planet.orbit = scale.orbitRadius(planet);
  });

  planetNodes.forEach((node) => {
    const radius = scale.planetRadius(node.planet);
    const orbit = scale.orbitRadius(node.planet);
    node.orbitRing.setAttribute('radius', orbit);
    node.holder.setAttribute('position', `${orbit} 0 0`);
    node.body.setAttribute('radius', radius);
    node.label.setAttribute('position', `0 ${radius + scale.labelOffset()} 0`);
    if (node.rings) {
      node.rings.setAttribute('radius', radius * 1.48);
      node.rings.setAttribute('radius-tubular', radius * 0.24);
    }
  });
}

function addPlanet(planet, index) {
  const orbitRing = document.createElement('a-torus');
  orbitRing.setAttribute('radius', planet.orbit);
  orbitRing.setAttribute('radius-tubular', '0.006');
  orbitRing.setAttribute('segments-radial', '4');
  orbitRing.setAttribute('segments-tubular', '160');
  orbitRing.setAttribute('rotation', '-90 0 0');
  orbitRing.setAttribute('position', '0 2.4 0');
  orbitRing.setAttribute('material', 'color: #7384a0; opacity: 0.48; transparent: true; shader: flat');
  orbitRoot.appendChild(orbitRing);

  const orbit = document.createElement('a-entity');
  orbit.id = `orbit-${planet.name.toLowerCase()}`;
  orbit.classList.add('orbit-group');
  orbit.dataset.period = String(planet.period);
  orbit.setAttribute('position', '0 2.4 0');
  orbit.setAttribute('rotation', `0 ${index * 27} 0`);

  const holder = document.createElement('a-entity');
  holder.setAttribute('position', `${planet.orbit} 0 0`);
  const body = document.createElement('a-sphere');
  body.classList.add('interactive', 'planet-body');
  body.dataset.planet = planet.name;
  body.setAttribute('radius', planet.radius);
  body.setAttribute('material', `color: ${planet.color}; emissive: ${planet.color}; emissiveIntensity: 0.42; roughness: 0.62; metalness: 0.05`);
  body.setAttribute('segments-width', '28');
  body.setAttribute('segments-height', '20');
  body.setAttribute('shadow', 'cast: false; receive: false');
  body.setAttribute('planet-spin', `period: ${planet.rotation}`);
  body.addEventListener('click', () => selectPlanet(planet));
  body.addEventListener('mouseenter', () => body.setAttribute('scale', '1.14 1.14 1.14'));
  body.addEventListener('mouseleave', () => body.setAttribute('scale', '1 1 1'));
  holder.appendChild(body);

  let rings;
  if (planet.name === 'Saturn') {
    rings = document.createElement('a-torus');
    rings.setAttribute('radius', planet.radius * 1.48);
    rings.setAttribute('radius-tubular', planet.radius * 0.24);
    rings.setAttribute('segments-radial', '3');
    rings.setAttribute('segments-tubular', '40');
    rings.setAttribute('rotation', '72 0 12');
    rings.setAttribute('material', 'color: #ddcc9e; opacity: 0.68; transparent: true; roughness: 0.9');
    holder.appendChild(rings);
  }

  const label = document.createElement('a-text');
  label.setAttribute('value', planet.name.toUpperCase());
  label.setAttribute('align', 'center');
  label.setAttribute('color', '#d9e5f4');
  label.setAttribute('width', '2.4');
  label.setAttribute('position', `0 ${planet.radius + getScale('artistic').labelOffset()} 0`);
  label.setAttribute('scale', '0.56 0.56 0.56');
  label.setAttribute('visible', 'false');
  label.classList.add('planet-label');
  holder.appendChild(label);
  orbit.appendChild(holder);
  orbitRoot.appendChild(orbit);

  planetNodes.push({
    planet,
    orbitRing,
    holder,
    body,
    rings,
    label,
  });
}

function addSun() {
  const corona = document.createElement('a-sphere');
  corona.setAttribute('radius', String(getScale('artistic').sunRadius() * 1.2));
  corona.setAttribute('position', '0 2.4 0');
  corona.setAttribute('material', 'color: #ffbf72; opacity: 0.12; transparent: true; shader: flat; side: double');
  const sun = document.createElement('a-sphere');
  sun.classList.add('interactive');
  sun.dataset.planet = 'Sun';
  sun.setAttribute('radius', String(getScale('artistic').sunRadius()));
  sun.setAttribute('position', '0 2.4 0');
  sun.setAttribute('material', 'color: #ffcc83; emissive: #ff9d42; emissiveIntensity: 0.65; roughness: 1');
  sun.addEventListener('click', () => selectPlanet({ name: 'Sun', type: 'Star', year: 'About 225 million years', tagline: 'The star at the center of it all.', description: 'Our Sun is a star that holds the solar system together with gravity and provides the light and heat that make life on Earth possible.', info: 'The star at the center.\nIts light takes about 8 minutes to reach Earth.\nContains more than 99% of the system’s mass.' }));
  sun.addEventListener('mouseenter', () => sun.setAttribute('scale', '1.06 1.06 1.06'));
  sun.addEventListener('mouseleave', () => sun.setAttribute('scale', '1 1 1'));
  sunRoot.append(corona, sun);
}

AFRAME.registerComponent('planet-spin', {
  schema: { period: { type: 'number', default: 1 } },
  tick(time, delta) {
    if (paused || !delta) return;
    const secondsPerDay = realSpeed ? 86400 : 10;
    const degreesPerSecond = 360 / (this.data.period * secondsPerDay);
    this.el.object3D.rotation.y += THREE.MathUtils.degToRad(degreesPerSecond * (delta / 1000));
  },
});

AFRAME.registerComponent('planet-orbit', {
  schema: { period: { type: 'number', default: 365.25 }, phase: { type: 'number', default: 0 } },
  tick(time, delta) {
    if (paused || !delta) return;
    const secondsPerDay = realSpeed ? 86400 : 60 / 365.25;
    const degreesPerSecond = 360 / (this.data.period * secondsPerDay);
    this.el.object3D.rotation.y += THREE.MathUtils.degToRad(degreesPerSecond * (delta / 1000));
  },
});

AFRAME.registerComponent('planet-label-sync', {
  tick() {
    updatePlanetLabels();
  },
});

planets.forEach((planet, index) => {
  addPlanet(planet, index);
  const orbit = document.querySelector(`#orbit-${planet.name.toLowerCase()}`);
  orbit.setAttribute('planet-orbit', `period: ${planet.period}; phase: ${index * 27}`);
});
addSun();
checkInvariants('artistic');
solarModel.setAttribute('planet-label-sync', '');
applyScaleMode();

function updateVrInfo(planet) {
  document.querySelector('#vr-title').setAttribute('value', planet ? planet.name.toUpperCase() : 'ORBIT / SOLAR SYSTEM');
  document.querySelector('#vr-info').setAttribute('value', planet ? (planet.info || `${planet.tagline}\n${planet.description}`) : 'Look at a planet to explore it.\nPress a control to change the simulation.');
}

function updatePlanetLabels() {
  const showLabels = intro.classList.contains('dismissed') || realSpeed;
  const cameraWorld = new THREE.Vector3();
  camera.object3D.getWorldPosition(cameraWorld);

  planetNodes.forEach((node) => {
    const values = getScale('artistic');
    const bodyWorld = new THREE.Vector3();
    node.body.object3D.getWorldPosition(bodyWorld);
    const offset = Math.max(values.planetRadius(node.planet) + values.labelOffset(), 1.2);

    node.label.object3D.position.set(0, offset, 0);
    node.label.object3D.lookAt(cameraWorld);

    const distance = Math.max(cameraWorld.distanceTo(bodyWorld), 1);
    const zoomScale = 1.8 * (18 / distance);
    node.label.setAttribute('scale', `${zoomScale} ${zoomScale} ${zoomScale}`);
    node.label.setAttribute('visible', showLabels ? 'true' : 'false');
  });
}

function selectPlanet(planet) {
  selectedPlanet = planet;
  intro.classList.add('dismissed');
  const planetNumber = planets.findIndex((item) => item.name === planet.name) + 1;
  document.querySelector('#planet-index').textContent = planet.name === 'Sun' ? 'THE STAR AT THE CENTER' : `PLANET ${String(planetNumber).padStart(2, '0')} / 08`;
  document.querySelector('#planet-name').textContent = planet.name;
  document.querySelector('#planet-tagline').textContent = planet.tagline;
  document.querySelector('#planet-description').textContent = planet.description;
  document.querySelector('#planet-year').textContent = planet.year;
  document.querySelector('#planet-type').textContent = planet.type;
  selectedCard.classList.add('visible');
  updatePlanetLabels();
  updateVrInfo(planet);
  if (!isVr && planet.name !== 'Sun') focusPlanet(planet);
}

function focusPlanet(planet) {
  if (!getFocusedBody()) return;
  if (cameraControl.mode === 'title') {
    cameraControl.overview = {
      azimuth: cameraControl.azimuth,
      elevation: cameraControl.elevation,
      distance: 43,
    };
  }
  transitionCamera('focus', Math.max(2.8, planet.radius * 5), cameraControl.mode === 'explore');
}

function returnOverview() {
  selectedPlanet = null;
  selectedCard.classList.remove('visible');
  updatePlanetLabels();
  updateVrInfo(null);
  if (isVr) {
    cameraControl.mode = 'explore';
    vrReturnMode = 'explore';
  } else {
    const overview = cameraControl.overview || { distance: 43 };
    transitionCamera('explore', overview.distance, false, overview);
  }
  vignette.classList.add('hidden');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2300);
}

function isMetaQuestDevice() {
  const userAgent = navigator.userAgent || '';
  const brands = navigator.userAgentData?.brands ? navigator.userAgentData.brands.map((brand) => brand.brand).join(' ') : '';
  return /(Quest|Oculus|Meta Quest|MetaQuest)/i.test(userAgent + ' ' + brands);
}

function showQuestHelp() {
  if (!helpPopover || !isMetaQuestDevice()) return;
  helpPopover.hidden = false;
  helpPopover.querySelector('p.eyebrow').textContent = 'META QUEST CONTROLS';
  showToast('QUEST MODE: LOOK AND TRIGGER TO EXPLORE');
}

function togglePause() {
  paused = !paused;
  const label = paused ? 'PLAY' : 'PAUSE';
  document.querySelector('#play-label').textContent = label;
  document.querySelector('#play-icon').textContent = paused ? '▶' : 'Ⅱ';
  playButton.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} animation`);
  document.querySelector('#vr-play-label').setAttribute('value', label);
  showToast(paused ? 'MODEL PAUSED' : 'MODEL IN MOTION');
}

function toggleSpeed() {
  realSpeed = !realSpeed;
  const label = realSpeed ? 'REAL SPEED' : 'ARTISTIC SPEED';
  document.querySelector('#speed-label').textContent = label;
  speedButton.dataset.mode = realSpeed ? 'real' : 'artistic';
  document.querySelector('#vr-speed-label').setAttribute('value', realSpeed ? 'REAL SPEED' : 'ARTISTIC');
  showToast(realSpeed ? 'REAL MODE: TRUE-SCALE PLANETS' : 'ARTISTIC MODE: COMPRESSED VIEW');
}

playButton.addEventListener('click', togglePause);
speedButton.addEventListener('click', toggleSpeed);
document.querySelector('#vr-play').addEventListener('click', togglePause);
document.querySelector('#vr-speed').addEventListener('click', toggleSpeed);
document.querySelector('#return-button').addEventListener('click', returnOverview);
document.querySelector('#close-card').addEventListener('click', returnOverview);
document.querySelector('#explore-button').addEventListener('click', () => {
  intro.classList.add('dismissed');
  vignette.classList.add('hidden');
  const overview = cameraControl.overview || { distance: 43 };
  transitionCamera('explore', overview.distance, false, overview);
  updatePlanetLabels();
  showToast('SELECT ANY PLANET TO LEARN MORE');
});
document.querySelector('#help-button').addEventListener('click', () => { document.querySelector('#help-popover').hidden = false; });
document.querySelector('#close-help').addEventListener('click', () => { document.querySelector('#help-popover').hidden = true; });

scene.addEventListener('enter-vr', () => {
  vrReturnMode = cameraControl.mode;
  isVr = true;
  document.querySelector('#vr-hud').setAttribute('visible', true);
  document.querySelector('#gaze-cursor').setAttribute('visible', true);
  document.querySelector('#gaze-cursor').setAttribute('cursor', 'enabled', true);
  solarModel.setAttribute('scale', '0.22 0.22 0.22');
  solarModel.setAttribute('position', '0 1.05 0');
  viewerRig.setAttribute('position', '0 0 4');
  viewerRig.setAttribute('rotation', '0 0 0');
  camera.setAttribute('look-controls', 'enabled', true);
  camera.setAttribute('position', '0 0 0');
  camera.setAttribute('rotation', '0 0 0');
  showToast('WALK AROUND THE MODEL OR POINT TO EXPLORE');
});

scene.addEventListener('exit-vr', () => {
  isVr = false;
  document.querySelector('#vr-hud').setAttribute('visible', false);
  document.querySelector('#gaze-cursor').setAttribute('visible', false);
  document.querySelector('#gaze-cursor').setAttribute('cursor', 'enabled', false);
  solarModel.setAttribute('scale', '1 1 1');
  solarModel.setAttribute('position', '4 0 0');
  viewerRig.setAttribute('position', '0 15 24');
  viewerRig.setAttribute('rotation', '-28 0 0');
  camera.setAttribute('position', '0 0 0');
  camera.setAttribute('rotation', '0 0 0');
  camera.setAttribute('look-controls', 'enabled', !AFRAME.utils.device.isMobile());
  const position = new THREE.Vector3();
  viewerRig.object3D.getWorldPosition(position);
  cameraControl.target.copy(getOverviewTarget());
  const offset = position.sub(cameraControl.target);
  cameraControl.distance = offset.length();
  cameraControl.azimuth = Math.atan2(offset.x, offset.z);
  cameraControl.elevation = Math.asin(THREE.MathUtils.clamp(offset.y / cameraControl.distance, -1, 1));
  cameraControl.transition = null;
  cameraControl.mode = 'title';
  if (selectedPlanet && selectedPlanet.name !== 'Sun') {
    transitionCamera('focus', Math.max(2.8, selectedPlanet.radius * 5));
  } else if (vrReturnMode === 'explore') {
    const overview = cameraControl.overview || { distance: 43 };
    transitionCamera('explore', overview.distance, false, overview);
  }
});

if (scene.hasLoaded) {
  initializeDesktopCamera();
  showQuestHelp();
} else {
  scene.addEventListener('loaded', () => {
    initializeDesktopCamera();
    showQuestHelp();
  }, { once: true });
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    togglePause();
  }
  if (event.key === 'Escape' && selectedPlanet) returnOverview();
});
