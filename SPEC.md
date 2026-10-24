# Solar System VR: Engineering Spec

Companion to `PROJECT_BRIEF.md`. This file is the source of truth for **scale, camera behavior, and how changes are made**. If code disagrees with this file, the code is wrong (or this file needs an explicit edit first).

---

## 1. Working rules (for any AI assistant or contributor)

1. **One request = one change.** Do only what was asked. Do not "improve" or restructure anything else.
2. **Never remove or hide a feature to make a new one easier** (e.g. hiding other planets in focus view). If a conflict seems unavoidable, stop and ask.
3. **Run the regression checklist (section 6) after every change** and report each item as pass or fail. "Syntax passed" is not verification.
4. **Commit after every completed change**, with a message naming it. Push when asked.
5. **Never tune sizes or distances by hand in scattered places.** All scale values come from the functions in section 3.
6. If a user report sounds like a bug, treat it as a bug. Do not explain it away.

---

## 2. Data (single source of truth)

Keep one table in `data.js` (or at the top of `app.js`). Nothing else may hold a radius or distance. Values below are from NASA planetary fact sheets; verify against https://nssdc.gsfc.nasa.gov/planetary/factsheet/ before shipping.

| Body    | Radius (km) | Semi-major axis (AU) | Orbital period (days) | Rotation period (h) |
|---------|------------:|---------------------:|----------------------:|--------------------:|
| Sun     | 695,700     | n/a                  | n/a                   | n/a                 |
| Mercury | 2,440       | 0.387                | 87.97                 | 1407.6              |
| Venus   | 6,052       | 0.723                | 224.7                 | -5832.5 (retrograde)|
| Earth   | 6,371       | 1.000                | 365.25                | 23.93               |
| Mars    | 3,390       | 1.524                | 687.0                 | 24.62               |
| Jupiter | 69,911      | 5.203                | 4,331                 | 9.93                |
| Saturn  | 58,232      | 9.537                | 10,747                | 10.66               |
| Uranus  | 25,362      | 19.19                | 30,589                | -17.24 (retrograde) |
| Neptune | 24,622      | 30.07                | 59,800                | 16.11               |

Moon data stays as already researched in the repo (radius, orbital distance, period per moon). Moons keep their own local scale (section 3.3).

---

## 3. Scale model

Scene units are arbitrary. Two modes, each defined **only** by a small set of constants plus pure functions. Switching modes recomputes everything from the data table, including **orbit rings, planet sizes, label offsets, camera distances, and the overview framing**.

### 3.1 Artistic mode (compressed, easy to see)

```
sunRadius      = 2.8                      // fixed display size
planetRadius   = A * (R_km / R_earth)^0.45   // A ~ 0.4 (Earth radius in scene units)
orbitRadius    = B * AU^0.5                  // B ~ 6
orbitSpeed     = artistic, accelerated, proportionally ordered (inner planets faster)
moonSpeed      = artistic, slowed down (separate multiplier)
```

Starting values (tune `A` and `B`, never the structure):

| Body    | planetRadius | orbitRadius |
|---------|-------------:|------------:|
| Mercury | ~0.26        | ~3.7        |
| Earth   | 0.40         | 6.0         |
| Jupiter | ~1.18        | ~13.7       |
| Saturn  | ~1.08        | ~18.5       |
| Neptune | ~0.73        | ~32.9       |

**Rule:** if `A` (planet size) is increased, `B` (orbit spacing) must be re-checked against invariants 4.3 and 4.4. A size change without a spacing check is what put Jupiter next to the Sun before.

### 3.2 Real mode (data-faithful)

```
kr = scene units per km     // one factor for ALL radii, Sun included
kd = scene units per AU     // one factor for ALL orbit distances
planetRadius = R_km * kr
sunRadius    = R_sun_km * kr        // never smaller than any planet
orbitRadius  = AU * kd
orbitSpeed   = true relative periods, accelerated by ONE global time factor
rotation     = true relative rotation periods, same global time factor
moonSpeed    = true relative moon periods, same global time factor
```

Sizes between planets are true to each other and to the Sun. Distances between orbits are true to each other. The Sun-to-orbit relationship is exaggerated (otherwise the whole system is invisible). Choose `kd` so Mercury's orbit clears the Sun's surface (invariant 4.3). Document the chosen `kr` and `kd` in the README as a known compromise. Set the camera far plane large enough for Neptune.

### 3.3 Moons

Each moon system uses its own local scale (moon radius and orbit distance mapped independently of the planet-system scale), so moons are visible but still ratio-faithful among themselves. Moon labels sit **close to the moon**, not offset vertically. Moon orbit lines are thin.

---

## 4. Invariants (check these in code; log a warning if any fails)

1. In **both** modes: `sunRadius >= max(planetRadius)`.
2. Switching mode **never shrinks the Sun** when planets shrink.
3. For every planet: `orbitRadius - planetRadius > sunRadius` (planet never overlaps the Sun).
4. For adjacent planets i and i+1: `orbitRadius[i+1] - orbitRadius[i] > planetRadius[i] + planetRadius[i+1]`.
5. Orbit order is always Mercury < Venus < Earth < Mars < Jupiter < Saturn < Uranus < Neptune in both modes.
6. In real mode, ratios between any two planet radii equal the ratios from the data table.
7. Moon orbit radius > parent planet radius, and moon systems stay inside the camera frame in focus view.

A tiny `checkInvariants()` function that runs on load and on every mode change is cheap and catches most scale regressions.

---

## 5. Camera and views (state machine)

Three states, one camera controller. Transitions animate smoothly.

| State   | Trigger                                  | Target                  | Framing                                  |
|---------|------------------------------------------|-------------------------|------------------------------------------|
| TITLE   | page load, "back to title"               | solar system center     | zoomed out, title + vignette visible     |
| EXPLORE | click "Explore the model"                | solar system center     | model fills the screen; title AND vignette fade out together |
| FOCUS   | click a planet                           | that planet (follows)   | fixed distance from the planet, moons visible |

Behavior that holds in **all** states:

- **Mouse drag** orbits the camera around the current target (EXPLORE and FOCUS included).
- **Scroll wheel** changes camera distance from the target (clamped min/max). Works in EXPLORE and FOCUS.
- **Planet labels are visible** in EXPLORE and FOCUS, and always face the camera (billboard, not aligned to the planet).
- **Other planets stay in the scene** in FOCUS. They may be dimmed, but not hidden or removed. The user stays in the *same* scene, not a separate view.
- **Follow:** in FOCUS the camera target is set to the focused planet's *current world position every frame*, preserving the user's orbit angle and zoom distance. This also works while the planet orbits and in both modes.
- Clicking "back" or empty space returns to EXPLORE with an animated transition.
- Moons of the focused planet are shown with labels and thin orbit lines. Moons of non-focused planets stay hidden.
- VR (Quest): model stays fixed; the user walks around it. Gaze/controller selects a planet and shows the info card. The desktop camera logic must not run in VR.

---

## 6. Regression checklist (run after EVERY change, report pass or fail for each)

- [ ] TITLE: title and vignette visible.
- [ ] Click "Explore the model": title and vignette both fade out, camera zooms to fill screen.
- [ ] EXPLORE: planet labels visible and facing the camera.
- [ ] EXPLORE: mouse drag orbits the model.
- [ ] EXPLORE: scroll wheel zooms in and out within limits.
- [ ] Click a planet: smooth zoom, same scene, other planets still visible (dimmed is fine).
- [ ] FOCUS: camera follows the planet as it orbits; distance stays constant.
- [ ] FOCUS: drag and scroll both work; labels visible.
- [ ] FOCUS: moons visible with nearby labels and thin orbit lines.
- [ ] Toggle real/artistic while in TITLE, EXPLORE and FOCUS: no crash, camera stays valid, orbit rings resize, Sun never shrinks.
- [ ] `checkInvariants()` reports no failures in either mode.
- [ ] Planet textures load (see section 7).
- [ ] VR entry still works; info card shows on selection.

---

## 7. Textures

Browsers should not load `.tif` directly. Convert the provided equirectangular maps to JPEG (or WebP), keep them reasonably small for Quest (2048 px wide is plenty, 1024 px for small planets), and store them in `assets/textures/`. Apply as the sphere's material map. Keep a flat-color fallback if a texture fails to load. Record the source and usage terms of each texture in the README.

---


