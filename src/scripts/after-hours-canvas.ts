/**
 * After Hours — WebGL layer (Three.js, lazy-loaded).
 *
 *   1. FOG          full-section background, simplex noise drifting low,
 *                   warm pool around the cursor that pushes the fog open.
 *                   Replaces the CSS .ah-headlights glow once active.
 *   2. STREAKS      horizontal light streaks panning past, like blurry
 *                   oncoming headlights on a freeway. Scroll velocity
 *                   speeds them up; cursor X tilts the parallax.
 *   3. PORTRAIT     the about photo lives on a 32x32 plane mesh whose
 *                   vertices breathe with slow noise and dimple toward the
 *                   cursor when it's close.
 *
 * All gated on:
 *   - WebGL availability
 *   - prefers-reduced-motion
 *   - pointer:fine    (skip on touch — no cursor to push the fog)
 * If any layer fails to init, page falls back to the CSS-only version.
 */

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;

const bgCanvas = document.querySelector<HTMLCanvasElement>('[data-ah-bg-canvas]');
const portraitHost = document.querySelector<HTMLElement>('[data-ah-portrait-canvas]');

const enable = !reducedMotion && finePointer && (bgCanvas || portraitHost);

if (enable) {
  // Two stage gate: only load three.js once the section is actually in view,
  // so first-paint of /about doesn't drag ~600kb across the wire for nothing.
  const section = document.querySelector('.after-hours') ?? document.body;
  const trigger = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      trigger.disconnect();
      void boot();
    },
    { rootMargin: '200px' },
  );
  trigger.observe(section);
}

async function boot() {
  let THREE: typeof import('three');
  try {
    THREE = await import('three');
  } catch (err) {
    console.warn('[after-hours] three.js failed to load', err);
    return;
  }

  // Shared state — cursor in normalized 0..1 screen coords, with damping.
  const cursor = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, force: 0, tforce: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      cursor.tx = e.clientX / window.innerWidth;
      cursor.ty = e.clientY / window.innerHeight;
      cursor.tforce = 1;
    },
    { passive: true },
  );
  window.addEventListener('pointerleave', () => { cursor.tforce = 0; });

  // Scroll velocity — for the streaks. Decays to 0 when not scrolling.
  const scroll = { y: window.scrollY, v: 0, tv: 0 };
  window.addEventListener(
    'scroll',
    () => {
      const dy = window.scrollY - scroll.y;
      scroll.y = window.scrollY;
      scroll.tv = Math.min(Math.abs(dy) / 30, 1);
    },
    { passive: true },
  );

  const bg = bgCanvas ? initBackground(THREE, bgCanvas) : null;
  const portrait = portraitHost ? initPortrait(THREE, portraitHost) : null;

  if (bg) document.body.classList.add('ah-webgl-on');

  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Damp cursor + force — fast enough that the glow tracks the pointer,
    // gentle enough that it still feels eased.
    cursor.x += (cursor.tx - cursor.x) * 0.12;
    cursor.y += (cursor.ty - cursor.y) * 0.12;
    cursor.force += (cursor.tforce - cursor.force) * 0.08;

    // Decay scroll velocity
    scroll.v += (scroll.tv - scroll.v) * 0.12;
    scroll.tv *= 0.92;

    bg?.tick(dt, cursor, scroll);
    portrait?.tick(dt, cursor);

    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  });
}

/* ------------------------------------------------------------------------ */
/*  BACKGROUND — fog + streaks share one renderer, one orthographic scene.   */
/* ------------------------------------------------------------------------ */

type CursorState = { x: number; y: number; force: number };
type ScrollState = { v: number };

function initBackground(
  THREE: typeof import('three'),
  canvas: HTMLCanvasElement,
) {
  let renderer: import('three').WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch (err) {
    console.warn('[after-hours] WebGL unavailable', err);
    canvas.style.display = 'none';
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const fogUniforms = {
    uTime:        { value: 0 },
    uResolution:  { value: new THREE.Vector2(1, 1) },
    uMouse:       { value: new THREE.Vector2(0.5, 0.5) },
    uMouseForce:  { value: 0 },
    uAccent:      { value: new THREE.Color('#c8a96e') },
    uProgress:    { value: 0 },
  };

  // Fragment shader — multi-octave value noise, warm pool around cursor.
  const fogFrag = /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec2  uResolution;
    uniform vec2  uMouse;
    uniform float uMouseForce;
    uniform vec3  uAccent;
    uniform float uProgress;
    varying vec2 vUv;

    // Cheap hash noise — fast enough to do 4 octaves per fragment.
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += vnoise(p) * a;
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      float aspect = uResolution.x / uResolution.y;
      vec2 p = vUv;
      p.x *= aspect;

      float t = uTime * 0.04;
      vec2 q = p * 1.8 + vec2(t, t * 0.7);
      float n = fbm(q);
      n = pow(n, 1.4);

      // Warm pool — pushes through the fog around cursor.
      vec2 m = uMouse;
      m.x *= aspect;
      float d = distance(p, m);
      float pool = smoothstep(0.55, 0.0, d) * uMouseForce;
      pool = pow(pool, 1.8);

      // Density curve: peaks mid-section (the heart of the drive), drops
      // toward the closing line as the car arrives and the road quiets.
      float density = mix(0.55, 1.25, sin(uProgress * 3.14159));

      // Fog color builds from accent at low intensity.
      vec3 fog = uAccent * n * 0.22 * density;
      vec3 warm = uAccent * pool * 0.55;
      vec3 col = fog + warm;

      // Alpha — section background should remain mostly black so the
      // existing #0d0d0d shows through. Fog is a soft glow on top.
      float alpha = clamp(n * 0.34 * density + pool * 0.7, 0.0, 0.85);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  const fogVert = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const fogMat = new THREE.ShaderMaterial({
    uniforms: fogUniforms,
    vertexShader: fogVert,
    fragmentShader: fogFrag,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const fogMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fogMat);
  scene.add(fogMesh);

  /* ----- Streaks: 8 thin planes with a soft radial gradient texture. ---- */

  const streakTex = makeStreakTexture(THREE);
  const streakMat = new THREE.MeshBasicMaterial({
    map: streakTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  type Streak = {
    mesh: import('three').Mesh;
    speed: number;
    baseY: number;
    baseSpeed: number;
  };
  const streaks: Streak[] = [];
  const STREAK_COUNT = 8;
  for (let i = 0; i < STREAK_COUNT; i++) {
    const g = new THREE.PlaneGeometry(0.6 + Math.random() * 1.1, 0.02 + Math.random() * 0.025);
    const mesh = new THREE.Mesh(g, streakMat.clone());
    (mesh.material as import('three').MeshBasicMaterial).opacity = 0.18 + Math.random() * 0.25;
    const baseY = (Math.random() - 0.5) * 1.7;
    mesh.position.set(2 + Math.random() * 2, baseY, 0);
    scene.add(mesh);
    const baseSpeed = 0.08 + Math.random() * 0.16;
    streaks.push({ mesh, speed: baseSpeed, baseY, baseSpeed });
  }

  /* ---------- Resize ----------------------------------------------------- */

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    renderer.setSize(w, h, false);
    fogUniforms.uResolution.value.set(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    tick(dt: number, cursor: CursorState, scroll: ScrollState) {
      const progress = window.__ahScroll?.p ?? 0;

      fogUniforms.uTime.value += dt;
      fogUniforms.uMouse.value.set(cursor.x, 1 - cursor.y);
      fogUniforms.uMouseForce.value = cursor.force;
      fogUniforms.uProgress.value = progress;

      // Parallax tilt — streaks shift horizontally with cursor.x
      const tiltX = (cursor.x - 0.5) * 0.12;

      // Streak speed envelope across the drive: slow start, full cruise
      // mid-section, decelerate at the closing line.
      const driveSpeed = 0.4 + Math.sin(progress * Math.PI) * 0.9;
      const speedMul = driveSpeed + scroll.v * 4;

      for (const s of streaks) {
        s.mesh.position.x -= s.baseSpeed * speedMul * dt * 1.6;
        // Vertical micro-drift with cursor.y so it doesn't look flat.
        s.mesh.position.y = s.baseY + (cursor.y - 0.5) * 0.18;
        s.mesh.position.x += tiltX * 0.04 * dt;
        if (s.mesh.position.x < -2.5) {
          s.mesh.position.x = 2 + Math.random() * 1.5;
          s.baseY = (Math.random() - 0.5) * 1.7;
        }
      }

      renderer.render(scene, camera);
    },
  };
}

function makeStreakTexture(THREE: typeof import('three')) {
  // 256x16 — wide soft horizontal gradient that fades at both ends.
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0,   'rgba(200, 169, 110, 0)');
  g.addColorStop(0.4, 'rgba(220, 190, 130, 0.55)');
  g.addColorStop(0.5, 'rgba(240, 215, 160, 0.9)');
  g.addColorStop(0.6, 'rgba(220, 190, 130, 0.55)');
  g.addColorStop(1,   'rgba(200, 169, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/* ------------------------------------------------------------------------ */
/*  PORTRAIT — photo on a 32x32 plane, vertex displacement.                  */
/* ------------------------------------------------------------------------ */

function initPortrait(
  THREE: typeof import('three'),
  host: HTMLElement,
) {
  const texUrl = host.dataset.tex;
  if (!texUrl) return null;

  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return null;

  let renderer: import('three').WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch (err) {
    console.warn('[after-hours] portrait WebGL unavailable', err);
    canvas.style.display = 'none';
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
  camera.position.z = 2;

  const loader = new THREE.TextureLoader();
  let ready = false;
  const tex = loader.load(
    texUrl,
    () => {
      ready = true;
      host.classList.add('is-canvas-ready');
    },
    undefined,
    () => { canvas.style.display = 'none'; },
  );
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const uniforms = {
    uTime:       { value: 0 },
    uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
    uMouseForce: { value: 0 },
    uTex:        { value: tex },
  };

  const vert = /* glsl */ `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uMouseForce;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      // Slow breath — gentle z-noise across the surface.
      float n = vnoise(uv * 4.0 + uTime * 0.18) - 0.5;
      pos.z += n * 0.045;
      // Cursor dimple — push toward cursor when force is high.
      vec2 m = uMouse;
      float d = distance(uv, m);
      float dimple = smoothstep(0.4, 0.0, d) * uMouseForce;
      pos.z -= dimple * 0.12;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const frag = /* glsl */ `
    precision highp float;
    uniform sampler2D uTex;
    uniform vec2 uMouse;
    uniform float uMouseForce;
    varying vec2 vUv;

    void main() {
      // Slight chromatic shift toward cursor — subtle warmth bias.
      vec2 m = uMouse;
      float d = distance(vUv, m);
      float warm = smoothstep(0.35, 0.0, d) * uMouseForce;

      vec2 uv = vUv;
      // Refraction-ish offset based on the dimple.
      uv += (vUv - m) * warm * 0.02;
      vec4 col = texture2D(uTex, uv);

      // Lift warmth + slight grade for the gold accent.
      col.rgb = mix(col.rgb, col.rgb * vec3(1.08, 1.02, 0.92), warm);
      // Slight darkening at edges to match the framed look.
      float vig = smoothstep(0.9, 0.4, distance(vUv, vec2(0.5)));
      col.rgb *= mix(0.85, 1.0, vig);

      gl_FragColor = col;
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
  });

  // Match the 1:1 square portrait aspect of the CSS frame.
  const geo = new THREE.PlaneGeometry(1.0, 1.0, 32, 32);
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Camera fit so the 1x1 plane fills the frame.
    const planeH = 1.0;
    const fov = camera.fov * Math.PI / 180;
    camera.position.z = (planeH / 2) / Math.tan(fov / 2) + 0.05;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  return {
    tick(dt: number, cursor: CursorState) {
      if (!ready) return;
      uniforms.uTime.value += dt;
      // Local cursor coords — relative to the portrait's bounding rect.
      const rect = host.getBoundingClientRect();
      const localX = (cursor.x * window.innerWidth - rect.left) / rect.width;
      const localY = 1 - (cursor.y * window.innerHeight - rect.top) / rect.height;
      uniforms.uMouse.value.set(localX, localY);

      // Force scales by proximity — full force when cursor is over portrait,
      // and amplified by scroll progress so the photo "wakes up" as you read.
      const proxX = Math.max(0, Math.min(1, localX));
      const proxY = Math.max(0, Math.min(1, localY));
      const onCanvas = localX > -0.4 && localX < 1.4 && localY > -0.4 && localY < 1.4;
      const progress = window.__ahScroll?.p ?? 0;
      const wake = 0.6 + progress * 0.6;
      uniforms.uMouseForce.value = onCanvas
        ? cursor.force * wake * (1 - Math.hypot(proxX - 0.5, proxY - 0.5) * 0.6)
        : 0;

      renderer.render(scene, camera);
    },
  };
}

export {};
