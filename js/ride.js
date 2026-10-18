/* ─────────────────────────────────────────────────────────────
   Portfolio coaster — scroll-driven intro ride
   POV ride → chase cam → SharkFin board (inspect + flip)
   → pull back behind rider → side view drop → climbs to the nav
   → track fades, original site underneath.
   Needs: three r128 (already on the page), js/GLTFLoader.js, img/sharkfin.glb
   ───────────────────────────────────────────────────────────── */
(function () {
  const T = window.THREE;
  const spacer = document.getElementById('ride');
  const cv = document.getElementById('rideCanvas');
  const ui = document.getElementById('rideUI');
  const nav = document.getElementById('nav');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!T || !spacer || !cv || reduced) { if (spacer) spacer.remove(); if (cv) cv.remove(); if (ui) ui.remove(); return; }
  if (nav) nav.style.opacity = 0;   // nav arrives at the end of the ride

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const BG = 0x040c18, ACCENT = 0x3d9bff, ACCENT2 = 0x80c8ff;

  /* ── renderer / scene ── */
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setClearColor(BG, 1);
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(BG, 0.012);
  const cam = new T.PerspectiveCamera(62, 1, 0.05, 600);

  const hemi = new T.HemisphereLight(0xbfdcff, 0x060c18, 0.85); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 0.8); sun.position.set(20, 40, 20); scene.add(sun);
  const rimL = new T.DirectionalLight(ACCENT, 0.7); rimL.position.set(-20, 10, -40); scene.add(rimL);

  /* ── track ── */
  const P = [[0,0,14],[0,0,2],[0,0,-12],[0,5,-28],[0,10,-44],[0,9.6,-50],[0,1,-64],[1,.5,-74],[6,2.5,-88],[10,2.5,-102],
    [10,2,-116],[10,2,-130],[10,2,-140],[12,1.8,-145.5],[18,.5,-148],[26,-6,-148],[36,-9,-148],[48,-9,-148],[58,-2,-148],[66,10,-148],[70,19,-148]]
    .map(a => new T.Vector3(...a));
  const curve = new T.CatmullRomCurve3(P, false, 'centripetal');
  const UP = new T.Vector3(0, 1, 0);
  const N = 900, pts = curve.getSpacedPoints(N);
  const frame = u => {                                    // stable frame (no Frenet twist): tangent, right, up
    const t = curve.getTangentAt(clamp(u, 0, 1)).normalize();
    let r = new T.Vector3().crossVectors(t, UP); if (r.lengthSq() < 1e-4) r.set(1, 0, 0); r.normalize();
    const up = new T.Vector3().crossVectors(r, t).normalize();
    return { t, r, up };
  };
  // u where the car parks in front of the board (z ≈ -138 on the straight)
  let uStop = 0; for (let i = 0; i <= N; i++) { if (pts[i].z <= -137) { uStop = i / N; break; } }
  let uDrop = 0; for (let i = 0; i <= N; i++) { if (pts[i].x >= 44 && pts[i].y < -8) { uDrop = i / N; break; } }

  const trackGroup = new T.Group(); scene.add(trackGroup);
  const railMat = new T.MeshBasicMaterial({ color: ACCENT, transparent: true });
  const railGlowMat = new T.MeshBasicMaterial({ color: ACCENT2, transparent: true, opacity: .25 });
  const tieMat = new T.MeshStandardMaterial({ color: 0x1a2a44, roughness: .6, metalness: .4, transparent: true });
  const pillarMat = new T.MeshStandardMaterial({ color: 0x14223a, roughness: .7, metalness: .3, transparent: true });
  for (const side of [-1, 1]) {
    const off = [];
    for (let i = 0; i <= N; i += 2) { const u = i / N, f = frame(u); off.push(pts[i].clone().addScaledVector(f.r, side * .62)); }
    const c = new T.CatmullRomCurve3(off);
    trackGroup.add(new T.Mesh(new T.TubeGeometry(c, 700, .07, 6, false), railMat));
    trackGroup.add(new T.Mesh(new T.TubeGeometry(c, 700, .16, 6, false), railGlowMat));
  }
  // spine + ties
  {
    const spine = new T.CatmullRomCurve3(pts.filter((_, i) => i % 2 === 0).map((p, i) => p.clone().addScaledVector(frame(i * 2 / N).up, -.25)));
    trackGroup.add(new T.Mesh(new T.TubeGeometry(spine, 700, .12, 6, false), tieMat));
    const len = curve.getLength(), n = Math.floor(len / 1.1);
    const ties = new T.InstancedMesh(new T.BoxGeometry(1.5, .08, .16), tieMat, n);
    const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const u = i / n, f = frame(u), p = curve.getPointAt(u).addScaledVector(f.up, -.12);
      m.makeBasis(f.r, f.up, f.t.clone().negate()); q.setFromRotationMatrix(m);
      m.compose(p, q, s); ties.setMatrixAt(i, m);
    }
    trackGroup.add(ties);
    // support pillars
    const pil = new T.CylinderGeometry(.09, .12, 1, 6);
    for (let i = 0; i < n; i += 6) {
      const p = curve.getPointAt(i / n), h = p.y + 14;
      if (h < 1.5) continue;
      const pm = new T.Mesh(pil, pillarMat); pm.scale.y = h; pm.position.set(p.x, p.y - h / 2 - .25, p.z); trackGroup.add(pm);
    }
  }

  /* ── world: ground grid, stars, station, signs ── */
  const grid = new T.GridHelper(600, 150, 0x10325e, 0x0a1d38); grid.position.y = -14; grid.material.transparent = true; scene.add(grid);
  {
    const g = new T.BufferGeometry(), a = [];
    for (let i = 0; i < 900; i++) { const r = 160 + Math.random() * 120, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * .45;
      a.push(Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r + 10, Math.sin(th) * Math.cos(ph) * r - 80); }
    g.setAttribute('position', new T.Float32BufferAttribute(a, 3));
    var stars = new T.Points(g, new T.PointsMaterial({ color: 0x9fc8ff, size: .9, sizeAttenuation: true, transparent: true, opacity: .7, fog: false }));
    scene.add(stars);
  }
  const station = new T.Group(); scene.add(station);
  {
    const slab = new T.Mesh(new T.BoxGeometry(11, .4, 26), new T.MeshStandardMaterial({ color: 0x050d1c, roughness: .9, metalness: .1 }));
    slab.position.set(0, -.65, 2); station.add(slab);
    for (const x of [-5.5, 5.5]) { const e = new T.Mesh(new T.BoxGeometry(.06, .06, 26), railMat); e.position.set(x, -.43, 2); station.add(e); }
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }
  const serif = "'Fraunces', Georgia, serif", mono = "'DM Mono', ui-monospace, monospace";
  function signTex(text, sub) {
    return canvasTex(1024, 400, (x, w, h) => {
      x.fillStyle = '#06142a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#3d9bff'; x.lineWidth = 8; x.strokeRect(14, 14, w - 28, h - 28);
      x.fillStyle = '#ddeeff'; x.font = `300 150px ${serif}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 - 18);
      x.fillStyle = '#3d9bff'; x.font = `34px ${mono}`; x.fillText(sub, w / 2, h - 70);
    });
  }
  function bannerTex() {
    return canvasTex(2048, 420, (x, w, h) => {
      x.fillStyle = '#06142a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#3d9bff'; x.lineWidth = 10; x.strokeRect(16, 16, w - 32, h - 32);
      // gear
      const gx = 300, gy = h / 2; x.fillStyle = '#80c8ff';
      x.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 110 : 140; x.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); } x.closePath(); x.fill();
      x.fillStyle = '#06142a'; x.beginPath(); x.arc(gx, gy, 55, 0, 7); x.fill();
      // coaster wave
      x.strokeStyle = '#80c8ff'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath();
      for (let i = 0; i <= 100; i++) { const px = 520 + i * 6.4, py = gy + 40 - Math.sin(i / 100 * Math.PI * 1.6) * 110 * (i < 60 ? 1 : .6); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      // loop
      x.beginPath(); x.arc(1300, gy - 10, 90, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#ddeeff'; x.font = `300 120px ${serif}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('Preme', 1450, gy - 50);
      x.fillStyle = '#3d9bff'; x.font = `italic 300 96px ${serif}`; x.fillText('Express', 1450, gy + 70);
    });
  }
  const postMat = new T.MeshStandardMaterial({ color: 0x1a2a44, metalness: .5, roughness: .5 });
  function sign(tex, w, h, pos, rotY) {
    const g = new T.Group();
    const board = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
    board.position.y = h / 2 + 1.4; g.add(board);
    const back = new T.Mesh(new T.BoxGeometry(w + .12, h + .12, .08), postMat); back.position.set(0, h / 2 + 1.4, -.06); g.add(back);
    for (const sx of [-w / 2 + .2, w / 2 - .2]) { const p = new T.Mesh(new T.CylinderGeometry(.06, .06, 1.6, 8), postMat); p.position.set(sx, .7, -.06); g.add(p); }
    g.position.copy(pos); g.rotation.y = rotY; station.add(g); return g;
  }
  let signs = [];
  function buildSigns() {
    signs.forEach(s => station.remove(s));
    signs = [sign(signTex('Welcome', 'EST. 2026 · BROOKLYN'), 3.4, 1.33, new T.Vector3(-3.6, -.4, -4), .42),
             sign(signTex('My Portfolio', 'RIDE THE WORK →'), 3.4, 1.33, new T.Vector3(3.6, -.4, -4), -.42)];
    const arch = new T.Group();
    const ban = new T.Mesh(new T.PlaneGeometry(6.2, 1.27), new T.MeshBasicMaterial({ map: bannerTex(), toneMapped: false }));
    ban.position.y = 5.2; arch.add(ban);
    for (const sx of [-3.2, 3.2]) { const p = new T.Mesh(new T.CylinderGeometry(.09, .09, 6, 8), postMat); p.position.set(sx, 2.4, 0); arch.add(p); }
    arch.position.set(0, 0, -20); station.add(arch); signs.push(arch);
  }
  buildSigns(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildSigns);

  /* ── rocket car (from your sketch: cockpit dip, nose cone, tail fin, side stripes, bogies) + rider ── */
  const car = new T.Group(); scene.add(car);
  const body = new T.MeshStandardMaterial({ color: 0x1c3f75, metalness: .55, roughness: .32 });
  const bodyDark = new T.MeshStandardMaterial({ color: 0x0c1a33, metalness: .5, roughness: .45 });
  const chrome = new T.MeshStandardMaterial({ color: 0xc9d8ea, metalness: .95, roughness: .18 });
  const stripe = new T.MeshBasicMaterial({ color: ACCENT2 });
  const flameMat = new T.MeshBasicMaterial({ color: ACCENT2, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false });
  let flame, flameCore;
  {
    const W = 1.3;
    // side silhouette in (car z, y) — rear at +z, nose at −z — extruded across the car's width
    const prof = new T.Shape();
    prof.moveTo(1.5, .28); prof.lineTo(1.5, 1.02); prof.lineTo(1.08, 1.02);
    prof.bezierCurveTo(.95, .6, .7, .58, .3, .6);             // cockpit dip
    prof.lineTo(-.25, .6); prof.bezierCurveTo(-.5, .62, -.62, .9, -.72, 1.02);
    prof.lineTo(-1.25, 1.02); prof.lineTo(-1.25, .28); prof.closePath();
    const hull = new T.Mesh(new T.ExtrudeGeometry(prof, { depth: W, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 3, curveSegments: 16 }), body);
    hull.rotation.y = -Math.PI / 2; hull.position.x = W / 2; car.add(hull);
    // cockpit floor (dark) so the dip reads from above
    const floor = new T.Mesh(new T.BoxGeometry(W - .1, .04, 1.25), bodyDark); floor.position.set(0, .6, .38); car.add(floor);
    // nose cone (ogive lathe), oval to match the body width
    const np = []; for (let i = 0; i <= 16; i++) { const t = i / 16; np.push(new T.Vector2(.39 * Math.sqrt(1 - t * t * .98) * (1 - t * .15), t * 1.0)); }
    const nose = new T.Mesh(new T.LatheGeometry(np, 32), body);
    nose.rotation.x = -Math.PI / 2; nose.scale.set(1.75, 1, 1); nose.position.set(0, .65, -1.3); car.add(nose);
    const noseRing = new T.Mesh(new T.TorusGeometry(.39, .035, 8, 40), chrome); noseRing.scale.set(1.75, 1, 1); noseRing.position.set(0, .65, -1.31); car.add(noseRing);
    // tail fin
    const finS = new T.Shape(); finS.moveTo(1.5, 1.0); finS.lineTo(1.6, 1.68); finS.lineTo(1.32, 1.68); finS.lineTo(1.02, 1.0); finS.closePath();
    const fin = new T.Mesh(new T.ExtrudeGeometry(finS, { depth: .09, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2 }), body);
    fin.rotation.y = -Math.PI / 2; fin.position.x = .045; car.add(fin);
    const finEdge = new T.Mesh(new T.BoxGeometry(.12, .03, .3), stripe); finEdge.position.set(0, 1.7, 1.46); car.add(finEdge);
    // twin side stripes
    for (const sx of [-1, 1]) for (const [y, len, z] of [[.56, 2.45, .05], [.42, 2.2, .25]]) {
      const st = new T.Mesh(new T.BoxGeometry(.02, .045, len), stripe); st.position.set(sx * (W / 2 + .075), y, z); car.add(st);
    }
    // thruster + flame at the rear
    const noz = new T.Mesh(new T.CylinderGeometry(.24, .3, .26, 24, 1, true), chrome); noz.rotation.x = Math.PI / 2; noz.position.set(0, .64, 1.68); car.add(noz);
    const glow = new T.Mesh(new T.CircleGeometry(.22, 24), new T.MeshBasicMaterial({ color: ACCENT2 })); glow.position.set(0, .64, 1.6); car.add(glow);
    flame = new T.Mesh(new T.ConeGeometry(.22, 1, 20, 1, true), flameMat); flame.rotation.x = Math.PI / 2; flame.position.set(0, .64, 1.8); car.add(flame);
    flameCore = new T.Mesh(new T.ConeGeometry(.11, .6, 16, 1, true), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    flameCore.rotation.x = Math.PI / 2; flameCore.position.set(0, .64, 1.75); car.add(flameCore);
    // lap bar
    const bar = new T.Mesh(new T.TorusGeometry(.42, .045, 8, 24, Math.PI), chrome); bar.position.set(0, .98, -.12); bar.rotation.x = -.35; car.add(bar);
    // bogies (wheel blocks) underneath
    for (const z of [.95, -.7]) {
      const bg = new T.Mesh(new T.BoxGeometry(1.0, .2, .62), bodyDark); bg.position.set(0, .16, z); car.add(bg);
      for (const sx of [-.58, .58]) { const w = new T.Mesh(new T.CylinderGeometry(.13, .13, .1, 14), chrome); w.rotation.z = Math.PI / 2; w.position.set(sx, .12, z); car.add(w); }
    }
  }
  /* rider = the astronaut from the hero section (same geometry + materials), scaled into the seat */
  const rider = new T.Group(); car.add(rider);
  const astro = new T.Group(); rider.add(astro);
  const arms = [];
  {
    const M = (o) => new T.MeshStandardMaterial(o);
    const suitMat = M({ color: 0x5bbcee, metalness: .25, roughness: .5 });
    const suitDarkMat = M({ color: 0x1a4a88, metalness: .55, roughness: .3 });
    const accentMat = M({ color: 0x22aaee, metalness: .8, roughness: .15, emissive: 0x0066bb, emissiveIntensity: .6 });
    const ringMat = M({ color: 0x3388cc, metalness: .75, roughness: .2 });
    const glowMat = M({ color: 0x88eeff, emissive: 0x44ccff, emissiveIntensity: 3 });
    const visorDarkMat = M({ color: 0x06121e, metalness: .6, roughness: .05 });
    const glassMat = M({ color: 0xaaddff, metalness: .1, roughness: 0, transparent: true, opacity: .55, depthWrite: false });
    const shineMat = M({ color: 0xaaddff, metalness: 1, roughness: .05, transparent: true, opacity: .2, depthWrite: false });
    const glare1 = new T.MeshBasicMaterial({ color: 0xeef8ff, transparent: true, opacity: .65, depthWrite: false });
    const glare2 = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false });
    const add = (geo, mat, pos, rot) => { const m = new T.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); astro.add(m); return m; };
    const H = Math.PI / 2;
    add(new T.SphereGeometry(1, 48, 48), suitMat);                                               // helmet
    add(new T.TorusGeometry(.984, .03, 12, 80), ringMat, [0, -.12, 0], [H, 0, 0]);
    add(new T.TorusGeometry(.92, .03, 12, 80), ringMat, [0, .42, 0], [H, 0, 0]);
    add(new T.TorusGeometry(.63, .046, 16, 80), accentMat, [0, .05, .77]);                      // visor frame
    add(new T.CircleGeometry(.608, 64), visorDarkMat, [0, .05, .776]);
    add(new T.SphereGeometry(.7, 40, 40, 0, Math.PI * 2, 0, Math.PI * .36), glassMat, [0, .05, .5], [H, 0, 0]);
    add(new T.SphereGeometry(.706, 40, 40, 0, Math.PI * 2, 0, Math.PI * .36), shineMat, [0, .05, .5], [H, 0, 0]);
    add(new T.CircleGeometry(.16, 32), glare1, [-.21, .29, .89]);
    add(new T.CircleGeometry(.065, 32), glare2, [-.33, .13, .89]);
    add(new T.CylinderGeometry(.015, .015, .5, 8), accentMat, [0, 1.26, 0]);                    // antenna
    const tip = add(new T.SphereGeometry(.044, 16, 16), glowMat, [0, 1.54, 0]);
    add(new T.CylinderGeometry(.41, .5, .28, 32), suitDarkMat, [0, -1.08, 0]);                  // neck
    add(new T.TorusGeometry(.5, .036, 12, 48), accentMat, [0, -.93, 0], [H, 0, 0]);
    add(new T.CylinderGeometry(.6, .64, .6, 32), suitMat, [0, -1.56, 0]);                       // torso
    add(new T.TorusGeometry(.635, .032, 12, 48), ringMat, [0, -1.85, 0], [H, 0, 0]);
    add(new T.BoxGeometry(.52, .38, .12), suitDarkMat, [0, -1.46, .62]);                       // chest panel
    [[-.14, 0x00eeff], [0, 0x4488ff], [.14, 0x0099ff]].forEach(([x, c]) =>
      add(new T.SphereGeometry(.038, 12, 12), M({ color: c, emissive: c, emissiveIntensity: 2.5 }), [x, -1.58, .69]));
    for (const sx of [-1, 1]) {                                                                 // shoulders
      const sh = add(new T.SphereGeometry(.27, 32, 32), suitMat, [sx * .82, -1.38, 0]); sh.scale.set(1, .8, .9);
      add(new T.TorusGeometry(.27, .022, 10, 40), accentMat, [sx * .82, -1.38, 0], [0, 0, H]);
      // arms (new — so the astronaut can throw its hands up on the drop)
      const pivot = new T.Group(); pivot.position.set(sx * .9, -1.4, 0);
      const arm = new T.Mesh(new T.CylinderGeometry(.13, .11, .8, 16), suitMat); arm.position.y = -.42; pivot.add(arm);
      const cuff = new T.Mesh(new T.TorusGeometry(.12, .025, 8, 24), accentMat); cuff.rotation.x = H; cuff.position.y = -.8; pivot.add(cuff);
      const glove = new T.Mesh(new T.SphereGeometry(.17, 20, 16), suitDarkMat); glove.position.y = -.95; pivot.add(glove);
      astro.add(pivot); arms.push({ pivot, sx });
    }
    astro.userData.tip = tip;
  }
  // seat it: helmet above the hull, torso inside the car, visor facing forward (−z)
  astro.scale.setScalar(.44); astro.position.set(0, 1.78, .3); astro.rotation.y = Math.PI;

  /* ── the SharkFin board (real model, flat-render fallback) ── */
  const BOARD_POS = new T.Vector3(10, 7.2, -152), BW = 8.4;
  const boardG = new T.Group(); boardG.position.copy(BOARD_POS); scene.add(boardG);
  const halo = new T.Mesh(new T.PlaneGeometry(BW * 2.4, BW * 1.5), new T.MeshBasicMaterial({
    map: canvasTex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(61,155,255,.4)'); g.addColorStop(1, 'rgba(61,155,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }),
    transparent: true, depthWrite: false, fog: false }));
  halo.position.copy(BOARD_POS).add(new T.Vector3(0, 0, -2)); scene.add(halo);
  const parts = [];
  const boardInner = new T.Group(); boardG.add(boardInner);
  const fb = new T.TextureLoader().load('SharkFin_front.png'); fb.encoding = T.sRGBEncoding;
  const flat = new T.Mesh(new T.PlaneGeometry(BW, BW * .465), new T.MeshBasicMaterial({ map: fb, transparent: true, side: T.DoubleSide }));
  boardInner.add(flat);
  if (T.GLTFLoader) new T.GLTFLoader().load('img/sharkfin.glb', g => {
    const model = g.scene, edge = model.getObjectByName('BOARD_EDGE'), bb = new T.Box3().setFromObject(edge);
    const c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), s = BW / sz.x;
    model.scale.setScalar(s); model.position.set(-c.x * s, -c.y * s, -c.z * s);
    // model is Z-up (board faces +Z) — exactly how boardInner faces the car
    model.traverse(o => {
      if (!o.isMesh) return;
      o.material.metalness = o.name.startsWith('BOARD') ? .1 : .25; o.material.roughness = o.name.startsWith('BOARD') ? .55 : .45;
      if (!o.name.startsWith('BOARD')) {
        const b = new T.Box3().setFromObject(o), cc = b.getCenter(new T.Vector3());
        parts.push({ o, z: o.position.z, side: Math.sign(cc.z - c.z) || 1, lift: .004 + .01 * ((parts.length * 37) % 11) / 11 });
      }
    });
    boardInner.add(model); flat.visible = false;
  }, undefined, e => console.warn('[ride] board model failed, using flat render', e));

  /* ── sizing ── */
  let W = 1, H = 1, aspect = 1;
  function size() { W = innerWidth; H = innerHeight; aspect = W / H; renderer.setSize(W, H, false); cam.aspect = aspect; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);

  /* ── camera poses ── */
  const tmp = new T.Vector3(), tmp2 = new T.Vector3();
  function carAt(u) {
    const p = curve.getPointAt(clamp(u, 0, 1)), f = frame(u);
    car.position.copy(p).addScaledVector(f.up, .05);
    const m = new T.Matrix4().makeBasis(f.r, f.up, f.t.clone().negate());
    car.quaternion.setFromRotationMatrix(m);
    return f;
  }
  const pose = (pos, look) => ({ pos: pos.clone(), look: look.clone() });
  function povPose(u, f) {
    const pos = car.position.clone().addScaledVector(f.up, 1.85).addScaledVector(f.t, -.1);
    const look = curve.getPointAt(clamp(u + .025, 0, 1)).addScaledVector(UP, 1.4);
    return pose(pos, look);
  }
  function chasePose(f) { return pose(car.position.clone().addScaledVector(f.t, -6.5).addScaledVector(UP, 3.2), car.position.clone().lerp(BOARD_POS, .7)); }
  function boardPose() { const d = aspect < 1 ? 11 / Math.max(.55, aspect) * .75 : 11; return pose(BOARD_POS.clone().add(tmp.set(0, 0, d)), BOARD_POS); }
  function behindPose() {
    const f = frame(uStop);
    // over-the-shoulder: rider bottom-left, flipped board ahead
    return pose(curve.getPointAt(uStop).addScaledVector(f.t, -5.2).addScaledVector(UP, 2.6).addScaledVector(f.r, 1.3), BOARD_POS.clone().add(tmp2.set(0, -2.4, 0)));
  }
  function sidePose() {
    const k = Math.max(1, (16 / 9) / aspect);
    return pose(new T.Vector3(40, 2, -148 + 38 * k), new T.Vector3(40, 2, -148));
  }
  const mix = (a, b, t) => ({ pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t) });

  /* ── scroll → timeline ── */
  function progress() { const h = spacer.offsetHeight; return clamp(scrollY / h); }
  let running = true, lastP = -1;
  function frameLoop(now) {
    const t = now / 1000, p = progress();

    // car progress along the track
    let u;
    if (p < .25) u = lerp(0, uStop * .93, range(p, 0, .25));
    else if (p < .36) u = lerp(uStop * .93, uStop, ease(range(p, .25, .36)));
    else if (p < .74) u = uStop;
    else if (p < .86) u = lerp(uStop, uDrop, ease(range(p, .74, .86)));
    else u = lerp(uDrop, 1, range(p, .86, .97));
    const f = carAt(u);

    // rider: hidden in POV, arms up for the drop
    rider.visible = p > .2;
    const up = ease(range(p, .74, .8));
    for (const a of arms) { a.pivot.rotation.x = -.55 - up * 2.25; a.pivot.rotation.z = -a.sx * up * .3; }
    { const burn = .25 + .75 * range(p, .74, .8) + Math.sin(t * 40) * .06; flame.scale.set(1, .5 + burn * 1.6, 1); flame.position.z = 1.8 + .25 * burn * 1.6; flameCore.scale.set(1, .4 + burn, 1); flameMat.opacity = .5 + .4 * burn; }
    astro.position.y = 1.78 + Math.sin(t * 2.2) * .02; astro.userData.tip.material.emissiveIntensity = 2.2 + Math.sin(t * 4) * .9;

    // camera choreography
    let c;
    const POV = povPose(u, f);
    if (p < .25) c = POV;
    else if (p < .36) c = mix(POV, chasePose(f), ease(range(p, .25, .36)));
    else if (p < .42) c = mix(chasePose(f), boardPose(), ease(range(p, .36, .42)));
    else if (p < .62) c = boardPose();
    else if (p < .69) c = mix(boardPose(), behindPose(), ease(range(p, .62, .69)));
    else if (p < .76) c = mix(behindPose(), sidePose(), ease(range(p, .69, .76)));
    else c = sidePose();
    // a little life: idle sway in POV, slight shake on the drop
    const shake = range(p, .76, .84) * (1 - range(p, .84, .9)) * .08;
    cam.position.copy(c.pos).add(tmp.set(Math.sin(t * 23) * shake, Math.cos(t * 19) * shake, 0));
    cam.lookAt(c.look);
    cam.fov = p < .25 ? 68 : lerp(68, 48, ease(range(p, .25, .42))); if (p > .69) cam.fov = lerp(48, 50, range(p, .69, .76));
    cam.updateProjectionMatrix();

    // board: float, inspect (explode), flip, then leave
    const insp = ease(range(p, .43, .5)) * (1 - ease(range(p, .5, .55)));
    const flip = ease(range(p, .52, .6));
    boardInner.rotation.y = flip * Math.PI + Math.sin(t * .5) * .05 * (1 - flip);
    boardInner.rotation.x = -.12 * (1 - insp) * (1 - flip) + Math.sin(t * .7) * .02;
    boardInner.position.y = Math.sin(t * .9) * .12;
    for (const q of parts) q.o.position.z = q.z + q.side * q.lift * insp;
    const leave = ease(range(p, .72, .8));
    boardG.scale.setScalar(1 - leave * .999); halo.material.opacity = 1 - leave;
    boardG.visible = leave < .99;

    // finale: track + world fade, page shows through, nav comes in
    const fade = range(p, .88, .98);
    railMat.opacity = 1 - fade; railGlowMat.opacity = .25 * (1 - fade); tieMat.opacity = pillarMat.opacity = 1 - fade;
    grid.material.opacity = 1 - fade; stars.material.opacity = .7 * (1 - fade);
    renderer.setClearColor(BG, 1 - range(p, .86, .97));
    scene.fog.density = .012 * (1 - fade);
    const carFade = range(p, .95, 1); car.scale.setScalar(lerp(1, 1.9, ease(range(p, .76, .8))) * (1 - carFade * .9));   // bigger in the wide side view
    cv.style.opacity = 1 - range(p, .985, 1);
    if (nav) nav.style.opacity = range(p, .9, .99);
    ui.style.opacity = 1 - range(p, .8, .9);
    ui.style.pointerEvents = p > .85 ? 'none' : 'auto';

    if (p !== lastP || p < 1) renderer.render(scene, cam);
    lastP = p;
    cv.style.visibility = p >= 1 ? 'hidden' : 'visible';
    if (running) requestAnimationFrame(frameLoop);
  }
  // pause the render loop once the ride is fully scrolled past
  new IntersectionObserver(es => { const was = running; running = es[0].isIntersecting || scrollY < spacer.offsetHeight; if (running && !was) requestAnimationFrame(frameLoop); }).observe(spacer);
  addEventListener('scroll', () => { if (!running && scrollY < spacer.offsetHeight) { running = true; requestAnimationFrame(frameLoop); } }, { passive: true });
  requestAnimationFrame(frameLoop);

  document.getElementById('rideSkip').addEventListener('click', () => document.getElementById('home').scrollIntoView({ behavior: 'smooth' }));
})();
