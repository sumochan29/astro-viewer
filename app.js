/* global AFRAME, THREE */

const planets = [
  { name: 'Mercury', color: '#b6a89e', radius: 0.17, orbit: 1.8, radiusKm: 2440, au: 0.387, year: '88 days', period: 87.97, rotation: 58.6, type: 'Rocky', tagline: 'Small, swift, and sun-baked.', description: 'The smallest planet races around the Sun in just 88 Earth days. Its surface is covered in ancient craters.', info: 'Smallest planet.\nA year lasts just 88 Earth days.\nSurface covered in ancient craters.' },
  { name: 'Venus', color: '#dfb883', radius: 0.28, orbit: 2.65, radiusKm: 6052, au: 0.723, year: '225 days', period: 224.7, rotation: -243, type: 'Rocky', tagline: 'A world of clouds and extremes.', description: 'Venus is wrapped in thick clouds and has the hottest surface of any planet, even though Mercury is closer to the Sun.', info: 'Hottest planetary surface.\nThick clouds trap the heat.\nIt spins in the opposite direction.' },
  { name: 'Earth', color: '#4c9bd2', radius: 0.31, orbit: 3.55, radiusKm: 6371, au: 1, year: '365 days', period: 365.25, rotation: 1, type: 'Rocky', tagline: 'Our pale blue home.', description: 'The only world we know of with life on its surface—and the only one with liquid water covering most of it.', info: 'Our pale blue home.\nLiquid water covers most of it.\nThe only known world with life.' },
  { name: 'Mars', color: '#ce7153', radius: 0.23, orbit: 4.45, radiusKm: 3390, au: 1.524, year: '687 days', period: 686.98, rotation: 1.03, type: 'Rocky', tagline: 'A rusty desert with big ambitions.', description: 'Mars is home to giant volcanoes, deep canyons, and robotic explorers looking for clues about its watery past.', info: 'A rusty desert world.\nHome to giant volcanoes.\nExplored by robotic rovers.' },
  { name: 'Jupiter', color: '#d7b89c', radius: 0.75, orbit: 5.75, radiusKm: 69911, au: 5.203, year: '11.9 years', period: 4332.59, rotation: 0.41, type: 'Gas giant', tagline: 'King of the planets.', description: 'Jupiter is the largest planet, with swirling cloud bands and a centuries-old storm called the Great Red Spot.', info: 'The largest planet.\nIts Great Red Spot is a huge storm.\nA gas giant with faint rings.' },
  { name: 'Saturn', color: '#ddcc9e', radius: 0.63, orbit: 7.25, radiusKm: 58232, au: 9.537, year: '29.4 years', period: 10759.2, rotation: 0.44, type: 'Gas giant', tagline: 'A giant wearing rings of ice.', description: 'Saturn’s bright rings are made of countless pieces of ice and rock, from tiny grains to chunks as large as a house.', info: 'Famous for bright rings.\nRings are made of ice and rock.\nA giant planet of gas.' },
  { name: 'Uranus', color: '#8ac9ce', radius: 0.46, orbit: 8.65, radiusKm: 25362, au: 19.19, year: '84 years', period: 30688.5, rotation: -0.72, type: 'Ice giant', tagline: 'The sideways-spinning ice giant.', description: 'Uranus rotates on its side, giving it some of the most extreme seasons in the solar system.', info: 'An ice giant with a blue-green hue.\nIt spins almost on its side.\nIts seasons last for years.' },
  { name: 'Neptune', color: '#5679d6', radius: 0.45, orbit: 10.05, radiusKm: 24622, au: 30.07, year: '165 years', period: 60182, rotation: 0.67, type: 'Ice giant', tagline: 'A distant world of fast winds.', description: 'Neptune is so far from the Sun that it takes about 165 Earth years to complete one orbit. Its winds are among the fastest measured.', info: 'The most distant planet.\nA year lasts about 165 Earth years.\nKnown for extremely fast winds.' },
];

const planetNodes = [];
const ARTISTIC = { A: 0.4, B: 6 };
const REAL = { kr: 0.0004, kd: 700 };

function artisticRadiusFromKm(radiusKm) {
  return ARTISTIC.A * Math.pow(radiusKm / 6371, 0.45);
}

function artisticOrbitFromAU(au) {
  return ARTISTIC.B * Math.pow(au, 0.5);
}

function realRadiusFromKm(radiusKm) {
  return radiusKm * REAL.kr;
}

function realOrbitFromAU(au) {
  return au * REAL.kd;
}

function getScaledPlanetValues(planet) {
  if (realSpeed) {
    return {
      radius: realRadiusFromKm(planet.radiusKm),
      orbit: realOrbitFromAU(planet.au),
    };
  }

  return {
    radius: artisticRadiusFromKm(planet.radiusKm),
    orbit: artisticOrbitFromAU(planet.au),
  };
}

function applyScaleMode() {
  const sunBodies = sunRoot.querySelectorAll('a-sphere');
  const corona = sunBodies[0];
  const sun = sunBodies[1] || sunBodies[0];
  const sunRadius = realSpeed ? 695700 * REAL.kr : 0.88;

  if (sun) {
    sun.setAttribute('radius', String(sunRadius));
  }

  if (corona) {
    corona.setAttribute('radius', String(realSpeed ? sunRadius * 1.2 : 1.12));
  }

  planetNodes.forEach((node) => {
    const values = getScaledPlanetValues(node.planet);
    const selected = selectedPlanet && selectedPlanet.name === node.planet.name;
    const shouldShowLabel = realSpeed || selected;

    node.orbitRing.setAttribute('radius', values.orbit);
    node.holder.setAttribute('position', `${values.orbit} 0 0`);
    node.body.setAttribute('radius', values.radius);
    if (node.rings) {
      node.rings.setAttribute('radius', values.radius * 1.48);
      node.rings.setAttribute('radius-tubular', values.radius * 0.24);
    }
    node.label.setAttribute('position', `0 ${values.radius + 0.28} 0`);
    node.label.setAttribute('visible', shouldShowLabel ? 'true' : 'false');
  });
}

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

let paused = false;
let realSpeed = false;
let selectedPlanet = null;
let isVr = false;
let toastTimer;

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

function addPlanet(planet, index) {
  const values = getScaledPlanetValues(planet);

  const orbitRing = document.createElement('a-torus');
  orbitRing.setAttribute('radius', values.orbit);
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
  holder.setAttribute('position', `${values.orbit} 0 0`);
  const body = document.createElement('a-sphere');
  body.classList.add('interactive', 'planet-body');
  body.dataset.planet = planet.name;
  body.setAttribute('radius', values.radius);
  body.setAttribute('material', `color: ${planet.color}; emissive: ${planet.color}; emissiveIntensity: 0.16; roughness: 0.85; metalness: 0.02`);
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
    rings.setAttribute('radius', values.radius * 1.48);
    rings.setAttribute('radius-tubular', values.radius * 0.24);
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
  label.setAttribute('position', `0 ${values.radius + 0.28} 0`);
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
  corona.setAttribute('radius', '1.12');
  corona.setAttribute('position', '0 2.4 0');
  corona.setAttribute('material', 'color: #ffbf72; opacity: 0.12; transparent: true; shader: flat; side: double');
  const sun = document.createElement('a-sphere');
  sun.classList.add('interactive');
  sun.dataset.planet = 'Sun';
  sun.setAttribute('radius', '0.88');
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

planets.forEach((planet, index) => {
  addPlanet(planet, index);
  const orbit = document.querySelector(`#orbit-${planet.name.toLowerCase()}`);
  orbit.setAttribute('planet-orbit', `period: ${planet.period}; phase: ${index * 27}`);
});
addSun();
applyScaleMode();

function updateVrInfo(planet) {
  document.querySelector('#vr-title').setAttribute('value', planet ? planet.name.toUpperCase() : 'ORBIT / SOLAR SYSTEM');
  document.querySelector('#vr-info').setAttribute('value', planet ? (planet.info || `${planet.tagline}\n${planet.description}`) : 'Look at a planet to explore it.\nPress a control to change the simulation.');
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
  document.querySelectorAll('.planet-label').forEach((label) => label.setAttribute('visible', label.parentElement.querySelector('.planet-body')?.dataset.planet === planet.name));
  updateVrInfo(planet);
  if (!isVr && planet.name !== 'Sun') focusPlanet(planet);
}

function focusPlanet(planet) {
  const body = document.querySelector(`[data-planet="${planet.name}"]`);
  if (!body) return;
  const target = new THREE.Vector3();
  body.object3D.getWorldPosition(target);
  const position = target.clone().add(new THREE.Vector3(0.12, 0.5, 1).normalize().multiplyScalar(Math.max(2.8, planet.radius * 5)));
  const looker = new THREE.Camera();
  looker.position.copy(position);
  looker.lookAt(target);
  const rotation = looker.rotation;
  camera.setAttribute('look-controls', 'enabled', false);
  camera.object3D.rotation.set(0, 0, 0);
  viewerRig.setAttribute('animation__focus-position', `property: position; to: ${position.x} ${position.y} ${position.z}; dur: 950; easing: easeInOutCubic`);
  viewerRig.setAttribute('animation__focus-rotation', `property: rotation; to: ${THREE.MathUtils.radToDeg(rotation.x)} ${THREE.MathUtils.radToDeg(rotation.y)} 0; dur: 950; easing: easeInOutCubic`);
}

function returnOverview() {
  selectedPlanet = null;
  selectedCard.classList.remove('visible');
  intro.classList.remove('dismissed');
  document.querySelectorAll('.planet-label').forEach((label) => label.setAttribute('visible', false));
  updateVrInfo(null);
  if (!isVr) {
    camera.setAttribute('look-controls', 'enabled', true);
    viewerRig.setAttribute('animation__focus-position', 'property: position; to: 0 15 24; dur: 900; easing: easeInOutCubic');
    viewerRig.setAttribute('animation__focus-rotation', 'property: rotation; to: -28 0 0; dur: 900; easing: easeInOutCubic');
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2300);
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
  applyScaleMode();
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
  showToast('SELECT ANY PLANET TO LEARN MORE');
});
document.querySelector('#help-button').addEventListener('click', () => { document.querySelector('#help-popover').hidden = false; });
document.querySelector('#close-help').addEventListener('click', () => { document.querySelector('#help-popover').hidden = true; });

scene.addEventListener('enter-vr', () => {
  isVr = true;
  document.querySelector('#vr-hud').setAttribute('visible', true);
  document.querySelector('#gaze-cursor').setAttribute('visible', true);
  document.querySelector('#gaze-cursor').setAttribute('cursor', 'enabled', true);
  viewerRig.removeAttribute('animation__focus-position');
  viewerRig.removeAttribute('animation__focus-rotation');
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
  camera.setAttribute('look-controls', 'enabled', true);
  if (selectedPlanet && selectedPlanet.name !== 'Sun') focusPlanet(selectedPlanet);
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    togglePause();
  }
  if (event.key === 'Escape' && selectedPlanet) returnOverview();
});