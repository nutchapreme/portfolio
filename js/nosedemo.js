/* Interactive nose cone: hover the parts, drag the payload board into the bay, watch the water ballast deploy.
   Shown at the end of the Payload Board project page. Needs three.js r128 + GLTFLoader + img/nosecone.glb */
(function () {
  const T = window.THREE; if (!T || !T.GLTFLoader) return;
  const PAYLOAD_TITLE = 'Payload Board';          // which project page gets the demo
  const GLB = 'img/nosecone.glb?v=1', PCB_IMG = './Payload_front.png';

  /* ---------- styles ---------- */
  const css = `
#noseDemo{margin:56px 0 24px;display:none}
#noseDemo .nd-eye{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#3d9bff;margin-bottom:10px}
#noseDemo .nd-title{font-family:'Fraunces',serif;font-weight:200;font-size:clamp(26px,4vw,44px);letter-spacing:-.02em;line-height:1;margin-bottom:10px}
#noseDemo .nd-title em{color:#3d9bff}
#noseDemo .nd-sub{color:#4d6a90;font-size:12px;line-height:1.8;max-width:520px;margin-bottom:20px}
#noseDemo .nd-stage{display:flex;gap:18px;align-items:stretch;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#noseDemo .nd-view{position:relative;flex:1;min-width:0;height:460px;border:1px solid rgba(61,155,255,.14);background:radial-gradient(ellipse at 50% 55%,rgba(61,155,255,.12),transparent 70%);overflow:hidden;border-radius:4px}
#noseDemo canvas{display:block;width:100%!important;height:100%!important;touch-action:pan-y}
#noseDemo .nd-dock{flex:0 0 210px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border:1px dashed rgba(61,155,255,.22);border-radius:4px;padding:18px;text-align:center;transition:opacity .4s}
#noseDemo .nd-dock span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#4d6a90;line-height:1.7}
#noseDemo .nd-pcb{width:150px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;animation:ndGlow 2.2s ease-in-out infinite;border-radius:6px}
#noseDemo .nd-pcb img{width:100%;display:block;pointer-events:none;-webkit-user-drag:none}
#noseDemo .nd-pcb.gone{visibility:hidden}
@keyframes ndGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(61,155,255,.35))}50%{filter:drop-shadow(0 0 16px rgba(61,155,255,.7))}}
.nd-ghost{position:fixed;z-index:9000;width:150px;pointer-events:none;transform:translate(-50%,-50%) scale(1.06);filter:drop-shadow(0 0 22px rgba(128,200,255,.95)) drop-shadow(0 0 44px rgba(61,155,255,.6));transition:none}
.nd-ghost img{width:100%;display:block}
.nd-ghost.drop{transition:left .55s cubic-bezier(.5,0,.2,1),top .55s cubic-bezier(.5,0,.2,1),transform .55s cubic-bezier(.5,0,.2,1),opacity .55s ease-in;opacity:0;transform:translate(-50%,-50%) scale(.12)}
.nd-ghost.back{transition:left .35s ease,top .35s ease,transform .35s ease;transform:translate(-50%,-50%) scale(1)}
#noseDemo .nd-tip{position:absolute;z-index:3;pointer-events:none;max-width:230px;padding:10px 12px;background:rgba(4,12,24,.92);border:1px solid rgba(61,155,255,.35);border-radius:4px;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s}
#noseDemo .nd-tip.on{opacity:1;transform:none}
#noseDemo .nd-tip b{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#80c8ff;margin-bottom:4px;font-weight:500}
#noseDemo .nd-tip p{font-size:11px;line-height:1.6;color:#9fb4cf;margin:0}
#noseDemo .nd-status{position:absolute;left:14px;top:12px;z-index:2;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#80c8ff;pointer-events:none;transition:opacity .3s}
#noseDemo .nd-hint{position:absolute;left:14px;bottom:10px;z-index:2;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#4d6a90;pointer-events:none}
#noseDemo .nd-reset{position:absolute;right:12px;bottom:10px;z-index:2;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:6px 12px;color:#80c8ff;background:rgba(4,12,24,.6);border:1px solid rgba(61,155,255,.3);cursor:pointer;opacity:0;pointer-events:none;transition:opacity .3s}
#noseDemo .nd-reset.on{opacity:1;pointer-events:auto}
#noseDemo .nd-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#4d6a90}
@media(max-width:760px){
  #noseDemo .nd-stage{flex-direction:column}
  #noseDemo .nd-view{flex:none;height:min(520px,60vh)}
  #noseDemo .nd-dock{flex:0 0 auto;flex-direction:row;padding:14px;justify-content:flex-start;text-align:left}
  #noseDemo .nd-pcb{width:120px;flex-shrink:0}
  .nd-ghost{width:120px}
}
html.light #noseDemo .nd-view{border-color:rgba(47,111,232,.15);background:radial-gradient(ellipse at 50% 55%,rgba(47,111,232,.12),transparent 70%)}
html.light #noseDemo .nd-dock{border-color:rgba(47,111,232,.3)}
html.light #noseDemo .nd-sub,html.light #noseDemo .nd-dock span,html.light #noseDemo .nd-hint{color:#5a6478}
html.light #noseDemo .nd-eye,html.light #noseDemo .nd-title em{color:#1f56c9}
html.light #noseDemo .nd-status{color:#1f56c9}
html.light #noseDemo .nd-tip{background:rgba(255,255,255,.96);border-color:rgba(47,111,232,.3);box-shadow:0 8px 24px rgba(30,60,140,.12)}
html.light #noseDemo .nd-tip b{color:#1f56c9}
html.light #noseDemo .nd-tip p{color:#3f5a7a}
html.light #noseDemo .nd-reset{color:#1f56c9;background:rgba(255,255,255,.8);border-color:rgba(47,111,232,.3)}`;
  document.head.insertAdjacentHTML('beforeend', '<style>' + css + '</style>');

  /* ---------- markup (appended to the end of the project page) ---------- */
  const host = document.querySelector('#projOverlay .proj-body-pad'); if (!host) return;
  host.insertAdjacentHTML('beforeend', `
<section id="noseDemo" aria-label="Interactive nose cone">
  <p class="nd-eye">// Interactive · Load the payload</p>
  <h3 class="nd-title">Arm the <em>nose cone</em></h3>
  <p class="nd-sub"><span class="t-desk">Hover</span><span class="t-mob">Tap</span> the parts to see what each one does. Then grab the payload board and drop it into the nose cone to run the water-ballast sequence.</p>
  <div class="nd-stage">
    <div class="nd-view"><div class="nd-load">Loading nose cone…</div><div class="nd-tip"><b></b><p></p></div><div class="nd-status"></div><span class="nd-hint"></span><button class="nd-reset" type="button">↺ Reset</button></div>
    <div class="nd-dock"><div class="nd-pcb" title="Payload board"><img src="${PCB_IMG}" alt="Payload board" draggable="false"></div><span>Hold &amp; drag the board<br>into the nose cone</span></div>
  </div>
</section>`);
  const box = document.getElementById('noseDemo'), view = box.querySelector('.nd-view'), tip = box.querySelector('.nd-tip'),
    statusEl = box.querySelector('.nd-status'), hintEl = box.querySelector('.nd-hint'), resetBtn = box.querySelector('.nd-reset'),
    dock = box.querySelector('.nd-dock'), pcb = box.querySelector('.nd-pcb'), loadEl = box.querySelector('.nd-load');
  const touch = matchMedia('(hover:none)').matches;

  const INFO = {
    shell: ['Nose cone', 'Ogive shell and coupler. It carries the whole payload and splits away at recovery.'],
    tip: ['Nose cone tip', 'Weighted tip ballast that keeps the rocket stable.'],
    bay: ['Payload bay', 'PCB sled. The payload board mounts here.'],
    motor: ['Stepper motor', 'NEMA 17 on a lead screw. It drives the piston that pushes the water out.'],
    tank: ['Water tank', 'PVC ballast tank, sealed at both ends.'],
    piston: ['Piston', 'Dynamic bulkhead with O-rings. The motor pushes it down the tank.'],
    servo: ['Servo', 'DS3235 servo. It opens the valve at apogee.'],
    valve: ['Valve & outlets', 'Brass valve feeding the side ports. Water exits on both sides.'],
    recovery: ['Recovery bulkhead', 'U-bolt anchor for the parachute harness.']
  };
  const COL = { shell: 0xcfe3ff, tip: 0xb7c2d4, bay: 0x4f86f7, motor: 0xe7c24a, tank: 0xf3a9c6, piston: 0xff8fb9, servo: 0x8b94a6, valve: 0xcaa34c, recovery: 0x9aa6b8 };

  /* ---------- three.js scene ---------- */
  let renderer, scene, cam, R, S, M, parts = {}, mats = {}, meshes = [], water, waterMat, jets, ready = false, loading = false;
  const OFF = 0.424;                          // shifts the model so its middle sits on the spin axis
  const BAY_X = -0.53 + OFF, OUT_X = -0.104 + OFF, OUT_R = 0.068;
  const PIST0 = 0, PIST1 = 0.165;             // piston travel (m)
  let upright = false, W = 1, H = 1;
  const camA = { p: new T.Vector3(), t: new T.Vector3() }, camB = { p: new T.Vector3(), t: new T.Vector3() };

  function build() {
    loading = true;
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    view.prepend(renderer.domElement);
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(30, 1, 0.01, 20);
    scene.add(new T.HemisphereLight(0xdfeeff, 0x2a3a55, 0.9));
    const d1 = new T.DirectionalLight(0xffffff, 0.9); d1.position.set(1, 2, 2); scene.add(d1);
    const d2 = new T.DirectionalLight(0x9cc8ff, 0.45); d2.position.set(-2, -1, -1.5); scene.add(d2);
    R = new T.Group(); S = new T.Group(); M = new T.Group(); R.add(S); S.add(M); scene.add(R);
    M.position.x = OFF;

    new T.GLTFLoader().load(GLB, gl => {
      gl.scene.traverse(o => {
        if (!o.isMesh) return;
        const k = o.name.replace(/_\d+$/, '');
        if (!COL[k]) return;
        const glassy = k === 'shell', see = k === 'tank';
        const m = new T.MeshStandardMaterial({ color: new T.Color(COL[k]).convertSRGBToLinear(), metalness: k === 'valve' || k === 'tip' ? .45 : .12, roughness: glassy ? .2 : .55,
          transparent: glassy || see, opacity: glassy ? .16 : see ? .2 : 1, depthWrite: !(glassy || see), side: glassy || see ? T.DoubleSide : T.FrontSide,
          flatShading: !(glassy || see || k === 'piston') });
        o.geometry.deleteAttribute('normal'); o.geometry.computeVertexNormals();
        o.material = m; o.userData.k = k; o.renderOrder = glassy ? 3 : see ? 2 : 0;
        mats[k] = m; parts[k] = o; meshes.push(o);
      });
      // keep every part, re-parented under M with its original transform
      [...meshes].forEach(o => { o.parent && o.parent.remove(o); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); M.add(o); });
      // water column inside the tank (between piston face and the outlet cap)
      waterMat = new T.MeshStandardMaterial({ color: 0x3d9bff, transparent: true, opacity: .85, roughness: .15, metalness: 0, emissive: 0x1d5fc0, emissiveIntensity: .6 });
      water = new T.Mesh(new T.CylinderGeometry(.037, .037, 1, 40, 1, false), waterMat);
      water.rotation.z = Math.PI / 2; water.renderOrder = 1; M.add(water);
      // water jets
      const N = 3000, g = new T.BufferGeometry(), pos = new Float32Array(N * 3);
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      jets = new T.Points(g, new T.PointsMaterial({ size: .022, map: new T.CanvasTexture(c), color: 0x6fbaff, transparent: true, depthWrite: false, opacity: .9 }));
      jets.frustumCulled = false; jets.userData = { N, v: new Float32Array(N * 3), life: new Float32Array(N), next: 0 };
      scene.add(jets);
      ready = true; loadEl.remove(); layout(); reset(true); applyTheme();
    }, undefined, () => { loadEl.textContent = 'Could not load the 3D model'; });
  }

  function applyTheme() {
    if (!ready) return; const light = document.documentElement.classList.contains('light');
    shellLook(state.solid);
    jets.material.color.set(light ? 0x2f6fe8 : 0x9fd6ff);
    waterMat.color.set(light ? 0x2f78e8 : 0x3d9bff);
  }
  function shellLook(s) {                     // s: 0 = see-through, 1 = solid painted shell
    const light = document.documentElement.classList.contains('light'), m = mats.shell; if (!m) return;
    m.color.set(light ? 0x7d9bd0 : 0xcfe3ff).lerp(new T.Color(light ? 0xd3dcec : 0xc4d0e2), s).convertSRGBToLinear();
    m.opacity = (light ? .24 : .16) + (1 - (light ? .24 : .16)) * s;
    m.roughness = .2 + .3 * s;
    const solid = s > .97; if (m.transparent === solid) { m.transparent = !solid; m.depthWrite = solid; m.needsUpdate = true; }
  }

  function layout() {
    W = view.clientWidth; H = view.clientHeight; if (!renderer || !W || !H) return;
    renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
    upright = W / H < 0.9;
    R.rotation.set(0, 0, upright ? -Math.PI / 2 : 0);
    // overview: fit the whole nose section, looking a little from above
    const L = 0.93, vf = cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * cam.aspect);
    const dist = upright ? Math.max((L / 2 * 1.08) / Math.tan(vf), 0.2 / Math.tan(hf)) : Math.max((L / 2 * 1.1) / Math.tan(hf), 0.22 / Math.tan(vf));
    const dir = new T.Vector3(0, .32, 1).normalize();
    camA.t.set(0, 0, 0); camA.p.copy(dir).multiplyScalar(dist);
    // close-up on the payload bay
    const bay = new T.Vector3(BAY_X, 0, 0).applyEuler(R.rotation);
    camB.t.copy(bay); camB.p.copy(bay).add(dir.clone().multiplyScalar(upright ? .85 : .5));
  }

  /* ---------- state ---------- */
  const state = { phase: 'idle', zoom: 0, zoomTo: 0, solid: 0, solidTo: 0, spin: 0, roll: 0, t0: 0, piston: 0, flow: 0, hover: null };
  function setStatus(s) { statusEl.textContent = s; }
  function reset(first) {
    state.phase = 'idle'; state.zoomTo = 0; state.solidTo = 0; state.spin = 0; state.piston = 0; state.flow = 0;
    if (first) { state.zoom = 0; state.solid = 0; }
    pcb.classList.remove('gone'); dock.style.opacity = ''; resetBtn.classList.remove('on');
    setStatus(''); hintEl.textContent = touch ? 'Tap a part · Swipe to turn' : 'Hover a part · Drag to turn';
    if (jets) { jets.userData.life.fill(0); }
  }
  resetBtn.addEventListener('click', () => reset(false));

  function arm() {
    state.phase = 'armed'; state.t0 = performance.now(); state.zoomTo = 0; state.solidTo = 1;
    pcb.classList.add('gone'); dock.style.opacity = '.35'; hintEl.textContent = ''; hideTip();
    setStatus('01 · Board installed');
  }

  /* ---------- hover / tap labels ---------- */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(cx, cy) {
    if (!ready) return null; const r = view.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects(meshes, false); if (!hits.length) return null;
    const see = state.solid < .5, inner = see && hits.find(h => h.object.userData.k !== 'shell');
    return (inner || hits[0]).object.userData.k;
  }
  function showTip(k, cx, cy) {
    const r = view.getBoundingClientRect(); const [a, b] = INFO[k];
    tip.querySelector('b').textContent = a;
    tip.querySelector('p').textContent = k === 'bay' && state.phase !== 'armed' ? b + ' Drop the board here.' : b;
    let x = cx - r.left + 16, y = cy - r.top + 16; tip.classList.add('on');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > r.width - 8) x = cx - r.left - tw - 14; if (y + th > r.height - 8) y = cy - r.top - th - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.classList.remove('on'); setHover(null); }
  function setHover(k) {
    if (state.hover === k) return;
    if (state.hover && mats[state.hover]) mats[state.hover].emissive.set(0x000000);
    state.hover = k; if (k && mats[k]) mats[k].emissive.set(COL[k]).multiplyScalar(.32);
  }
  let mv = null;
  view.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mv = e; });
  view.addEventListener('pointerleave', () => { mv = null; hideTip(); });

  /* ---------- drag to turn (roll) ---------- */
  let turn = null;
  view.addEventListener('pointerdown', e => { if (e.target.closest('.nd-reset')) return; turn = { x: e.clientX, y: e.clientY, r: state.roll, moved: false }; });
  addEventListener('pointermove', e => { if (!turn || drag) return; const dx = e.clientX - turn.x, dy = e.clientY - turn.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) turn.moved = true;
    if (turn.moved && state.phase === 'idle') state.roll = turn.r + (upright ? dx : -dy) * .012; });
  addEventListener('pointerup', e => {
    if (turn && !turn.moved && touch && !drag) { const k = pick(e.clientX, e.clientY); if (k) { setHover(k); showTip(k, e.clientX, e.clientY); } else hideTip(); }
    turn = null; });

  /* ---------- drag the board in ---------- */
  let drag = null;
  pcb.addEventListener('pointerdown', e => {
    if (state.phase !== 'idle' || !ready) return; e.preventDefault(); e.stopPropagation();
    const g = document.createElement('div'); g.className = 'nd-ghost'; g.innerHTML = `<img src="${PCB_IMG}" alt="">`;
    document.body.appendChild(g); g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px';
    pcb.classList.add('gone'); drag = { g, id: e.pointerId }; try { pcb.setPointerCapture(e.pointerId); } catch (_) {}
    state.zoomTo = 1; hideTip(); setStatus('Drop it into the payload bay');
  });
  pcb.addEventListener('pointermove', e => { if (!drag) return; drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
    const r = view.getBoundingClientRect(), over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    setHover(over ? 'bay' : null); });
  const endDrag = e => {
    if (!drag) return; const g = drag.g; drag = null; setHover(null);
    const r = view.getBoundingClientRect(), over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    if (over && e.type !== 'pointercancel') {
      const p = new T.Vector3(BAY_X, 0, 0); M.updateMatrixWorld(); p.applyMatrix4(R.matrixWorld).project(cam);
      g.classList.add('drop'); g.style.left = (r.left + (p.x + 1) / 2 * r.width) + 'px'; g.style.top = (r.top + (1 - p.y) / 2 * r.height) + 'px';
      setTimeout(() => g.remove(), 600); setTimeout(arm, 380);
    } else {
      const d = pcb.getBoundingClientRect(); g.classList.add('back'); g.style.left = (d.left + d.width / 2) + 'px'; g.style.top = (d.top + d.height / 2) + 'px';
      setTimeout(() => { g.remove(); pcb.classList.remove('gone'); }, 360); state.zoomTo = 0; setStatus('');
    }
  };
  pcb.addEventListener('pointerup', endDrag); pcb.addEventListener('pointercancel', endDrag);

  /* ---------- animation ---------- */
  const tmp = new T.Vector3(), tmp2 = new T.Vector3(), axis = new T.Vector3(), nrm = new T.Matrix3();
  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  let last = 0, running = false, visible = false;
  function emit(side, dt) {
    const J = jets.userData, P = jets.geometry.attributes.position.array, n = Math.round(dt * 520 * state.flow);
    for (let i = 0; i < n; i++) {
      const j = J.next; J.next = (J.next + 1) % J.N;
      const a = (Math.random() - .5) * .5, s = side;
      tmp.set(OUT_X - OFF + (Math.random() - .5) * .012, s * OUT_R, (Math.random() - .5) * .01); tmp.applyMatrix4(M.matrixWorld);
      tmp2.set((Math.random() - .5) * .25, s, a).normalize(); tmp2.applyMatrix3(nrm).normalize();
      const sp = .8 + Math.random() * .45;
      // velocity: out of the port + the spin's sideways swing (that's what makes the spiral)
      const tang = axis.clone().cross(tmp.clone().sub(new T.Vector3().setFromMatrixPosition(R.matrixWorld))).multiplyScalar(state.spin);
      J.v[j * 3] = tmp2.x * sp + tang.x; J.v[j * 3 + 1] = tmp2.y * sp + tang.y; J.v[j * 3 + 2] = tmp2.z * sp + tang.z;
      P[j * 3] = tmp.x; P[j * 3 + 1] = tmp.y; P[j * 3 + 2] = tmp.z; J.life[j] = 1.1 + Math.random() * .6;
    }
  }
  function frame(now) {
    if (!visible) { running = false; return; }
    (window.gateRAF || requestAnimationFrame)(frame);
    const raw = Math.min(.3, (now - (last || now)) / 1000), dt = Math.min(.05, raw); last = now; if (!ready) return;
    if (mv) { const k = pick(mv.clientX, mv.clientY); if (k) { setHover(k); showTip(k, mv.clientX, mv.clientY); } else hideTip(); mv = null; }

    // sequence after the board goes in
    if (state.phase === 'armed') {
      const t = (now - state.t0) / 1000;
      if (t > 1.6 && t < 2.2) setStatus('02 · Apogee · servo opens valve');
      if (t > 2.2) { state.spin = Math.min(2.4, state.spin + dt * 1.1); }
      if (t > 2.8 && state.piston < 1) { if (state.piston === 0) setStatus('03 · Piston pushes water out'); state.piston = Math.min(1, state.piston + dt / 7); state.flow = Math.min(1, state.flow + dt * 2); }
      if (state.piston >= 1) { state.flow = Math.max(0, state.flow - dt * 1.5); if (state.flow === 0 && statusEl.textContent.indexOf('04') < 0) { setStatus('04 · Ballast released ✓'); resetBtn.classList.add('on'); } }
      if (mats.servo) mats.servo.emissive.set(t > 1.6 && t < 2.6 ? 0x3d9bff : 0x000000).multiplyScalar(t > 1.6 && t < 2.6 ? .5 + .5 * Math.sin(t * 18) : 0);
    } else { state.spin = Math.max(0, state.spin - dt * 1.5); state.piston = Math.max(0, state.piston - dt * .8); }

    state.zoom += (state.zoomTo - state.zoom) * Math.min(1, raw * 4);
    if (state.phase === 'armed') state.solid = Math.min(1, Math.max(state.solid, (now - state.t0) / 1300));
    else state.solid += (state.solidTo - state.solid) * Math.min(1, raw * 3);
    shellLook(state.solid);
    if (state.phase === 'idle') { const r = state.roll; S.rotation.x += (r - S.rotation.x) * Math.min(1, dt * 8); }
    else S.rotation.x += state.spin * dt;
    // descending under chute: a gentle wobble while it spins
    R.rotation.x = state.phase === 'armed' ? Math.sin(now / 900) * .05 * Math.min(1, state.spin) : 0;
    R.position.y = Math.sin(now / 1400) * .006;

    // bay pulses while you're holding the board
    if (mats.bay && state.hover !== 'bay') mats.bay.emissive.set(0x3d9bff).multiplyScalar(drag ? .35 + .3 * Math.sin(now / 160) : 0);
    else if (mats.bay && drag) mats.bay.emissive.set(0x7fc0ff).multiplyScalar(.75 + .25 * Math.sin(now / 120));

    // piston + water column
    const px = PIST0 + (PIST1 - PIST0) * ease(state.piston);
    if (parts.piston) parts.piston.position.x = px;
    const a = -0.392 + px + OFF - OFF, b = -0.222, len = Math.max(.001, b - a);
    water.scale.set(1, len, 1); water.position.set((a + b) / 2, 0, 0); water.visible = len > .004;

    // camera
    cam.position.lerpVectors(camA.p, camB.p, ease(state.zoom));
    const tg = tmp.lerpVectors(camA.t, camB.t, ease(state.zoom)); cam.lookAt(tg);

    // jets
    R.updateMatrixWorld(true); nrm.getNormalMatrix(M.matrixWorld); axis.set(1, 0, 0).applyQuaternion(R.quaternion).normalize();
    if (state.flow > 0) { emit(1, dt); emit(-1, dt); }
    const J = jets.userData, P = jets.geometry.attributes.position.array;
    for (let j = 0; j < J.N; j++) {
      if (J.life[j] <= 0) { P[j * 3 + 1] = 1e3; continue; }
      J.life[j] -= dt; J.v[j * 3 + 1] -= 1.5 * dt;
      const dr = Math.pow(.55, dt); J.v[j * 3] *= dr; J.v[j * 3 + 2] *= dr;
      P[j * 3] += J.v[j * 3] * dt; P[j * 3 + 1] += J.v[j * 3 + 1] * dt; P[j * 3 + 2] += J.v[j * 3 + 2] * dt;
    }
    jets.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, cam);
  }
  function start() { if (running) return; running = true; last = 0; (window.gateRAF || requestAnimationFrame)(frame); }

  /* ---------- show only on the Payload Board page ---------- */
  new ResizeObserver(() => layout()).observe(view);
  new IntersectionObserver(es => { visible = es[0].isIntersecting && box.style.display !== 'none'; if (visible) { if (!renderer && !loading) build(); start(); } }, { threshold: 0 }).observe(view);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  function sync() {
    const t = (document.getElementById('projTitle') || {}).textContent || '';
    const on = t.indexOf(PAYLOAD_TITLE) > -1; box.style.display = on ? 'block' : 'none';
    if (!on) { visible = false; if (drag) { drag.g.remove(); drag = null; } reset(true); }
    else { layout(); }
  }
  new MutationObserver(sync).observe(document.getElementById('projTitle'), { childList: true, characterData: true, subtree: true });
  sync();
})();
