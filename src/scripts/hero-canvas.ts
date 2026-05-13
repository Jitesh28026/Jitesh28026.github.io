/**
 * Hero Three.js layer — particle field + wireframe icosahedron sphere offset to
 * the right of the hero copy. Ported from public/legacy/index.html.
 *
 * Lazy-loaded: three.js is dynamically imported only when the hero canvas
 * scrolls into view AND the user hasn't requested reduced motion. This keeps
 * the homepage's first-paint bundle small.
 */

const canvas = document.querySelector<HTMLCanvasElement>('#global-three-canvas');
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

if (canvas && !reducedMotion) {
  const initOnce = async () => {
    const THREE = await import('three');

    let renderer: InstanceType<typeof THREE.WebGLRenderer>;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch (error) {
      console.warn('Three.js could not initialize on this device.', error);
      canvas.style.display = 'none';
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // GLOBAL ATMOSPHERE: floating particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 400;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 15;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.012,
      color: 0xc8a96e,
      transparent: true,
      opacity: 0.28,
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // KINETIC SCULPTURE — wireframe icosahedron, sized + offset per breakpoint
    const getSphereParams = () => {
      const w = window.innerWidth;
      if (w <= 480) return { scale: 0.95, x: 1.6, y: -0.3, z: -4.5 };
      if (w <= 768) return { scale: 1.10, x: 2.3, y: -0.1, z: -4.2 };
      if (w <= 1200) return { scale: 1.30, x: 3.6, y: 0.0, z: -4.0 };
      return { scale: 1.45, x: 4.4, y: 0.0, z: -3.8 };
    };
    const sphereParams = getSphereParams();
    const sculptureGeo = new THREE.IcosahedronGeometry(2, 2);
    const sculptureMat = new THREE.MeshPhongMaterial({
      color: 0xc8a96e,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const sculpture = new THREE.Mesh(sculptureGeo, sculptureMat);
    sculpture.position.set(sphereParams.x, sphereParams.y, sphereParams.z);
    sculpture.scale.setScalar(sphereParams.scale);
    scene.add(sculpture);

    const mainLight = new THREE.PointLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    camera.position.z = 6;

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let currentScroll = 0;

    window.addEventListener(
      'mousemove',
      (event) => {
        targetX = event.clientX / window.innerWidth - 0.5;
        targetY = event.clientY / window.innerHeight - 0.5;
      },
      { passive: true },
    );
    window.addEventListener(
      'scroll',
      () => {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        currentScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      },
      { passive: true },
    );

    const startTime = performance.now();
    const animate = () => {
      const elapsedTime = (performance.now() - startTime) / 1000;

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      particlesMesh.rotation.y = elapsedTime * 0.03;
      particlesMesh.rotation.x = currentScroll * 0.5;
      particlesMesh.position.y = -currentScroll * 2;

      const pp =
        (window as unknown as { __processProgress?: number }).__processProgress ??
        0;
      sculpture.material.opacity = 0.26 + pp * 0.38;
      sculpture.rotation.y += 0.0035 + pp * 0.009;
      sculpture.rotation.x = Math.sin(pp * Math.PI * 2) * 0.22;
      sculpture.position.y = sphereParams.y + (pp - 0.5) * -2.5;

      scene.rotation.x = mouseY * 0.1;
      scene.rotation.y = mouseX * 0.1;

      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
    };

    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      const p = getSphereParams();
      sphereParams.scale = p.scale;
      sphereParams.x = p.x;
      sphereParams.y = p.y;
      sphereParams.z = p.z;
      sculpture.scale.setScalar(p.scale);
      sculpture.position.set(p.x, p.y, p.z);
    });

    animate();
  };

  // Only start once the hero canvas is on screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            io.disconnect();
            initOnce();
          }
        });
      },
      { rootMargin: '200px' },
    );
    io.observe(canvas);
  } else {
    initOnce();
  }
}
