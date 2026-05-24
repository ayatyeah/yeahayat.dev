import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

let revealObserver;

const state = {
  pointer: new THREE.Vector2(0, 0),
  targetPointer: new THREE.Vector2(0, 0),
  scroll: 0,
  targetScroll: 0
};

function createRevealObserver() {
  if (revealObserver) {
    return revealObserver;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  return revealObserver;
}

function initReveal(root = document) {
  const observer = createRevealObserver();
  const revealItems = Array.from(root.querySelectorAll('.reveal'));

  revealItems.forEach((item, index) => {
    item.classList.remove('visible');
    item.style.transitionDelay = `${Math.min(index * 90, 540)}ms`;
    observer.observe(item);
  });
}

function initYear() {
  const yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}

function initCodingDays() {
  const codingDaysNode = document.getElementById('codingDays');
  if (!codingDaysNode) {
    return;
  }

  const startDate = new Date('2023-09-01T00:00:00');
  const now = new Date();
  const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.max(0, Math.floor((nowUtc - startUtc) / 86400000));

  codingDaysNode.textContent = String(days);
}

function initMagnetic(root = document) {
  const magneticItems = Array.from(root.querySelectorAll('.magnetic'));

  magneticItems.forEach((item) => {
    if (item.dataset.magneticReady) {
      return;
    }

    item.dataset.magneticReady = 'true';

    item.addEventListener('pointermove', (event) => {
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      item.style.transform = `translate3d(${x * 0.14}px, ${y * 0.18}px, 34px) rotateX(${-y * 0.05}deg) rotateY(${x * 0.05}deg)`;
    });

    item.addEventListener('pointerleave', () => {
      item.style.transform = '';
    });
  });
}

function initTilt(root = document) {
  const panels = Array.from(root.querySelectorAll('[data-tilt]'));

  panels.forEach((panel) => {
    if (panel.dataset.tiltReady) {
      return;
    }

    panel.dataset.tiltReady = 'true';

    panel.addEventListener('pointermove', (event) => {
      const rect = panel.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      panel.style.transform = `rotateX(${-y * 9}deg) rotateY(${x * 11}deg) translateZ(18px)`;
    });

    panel.addEventListener('pointerleave', () => {
      panel.style.transform = '';
    });
  });
}

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(216,185,106,0.82)');
  gradient.addColorStop(1, 'rgba(216,185,106,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

function makeShard(index, total) {
  const geometry = new THREE.TetrahedronGeometry(0.25 + Math.random() * 0.52, 0);
  const palette = [0x78c7d4, 0xd8b96a, 0x8d315a, 0xd79d55, 0xf4f1e8];
  const material = new THREE.MeshStandardMaterial({
    color: palette[index % palette.length],
    emissive: palette[index % palette.length],
    emissiveIntensity: 0.14,
    roughness: 0.5,
    metalness: 0.76,
    transparent: true,
    opacity: 0.78
  });
  const mesh = new THREE.Mesh(geometry, material);
  const angle = (index / total) * Math.PI * 2;
  const radius = 4 + Math.random() * 7;

  mesh.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 5.8, Math.sin(angle) * radius - 1);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  mesh.userData = {
    angle,
    radius,
    spin: new THREE.Vector3(
      (Math.random() - 0.5) * 0.007,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.008
    ),
    float: Math.random() * Math.PI * 2
  };

  return mesh;
}

function initVoidScene() {
  const canvas = document.getElementById('voidCanvas');
  if (!canvas || canvas.dataset.ready) {
    return;
  }

  canvas.dataset.ready = 'true';

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030406, 0.052);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.2, 9);

  const rig = new THREE.Group();
  scene.add(rig);

  const ambient = new THREE.AmbientLight(0xf4f1e8, 0.44);
  scene.add(ambient);

  const cyanLight = new THREE.PointLight(0x78c7d4, 5.4, 24);
  cyanLight.position.set(-5.4, 3.4, 4);
  scene.add(cyanLight);

  const hotLight = new THREE.PointLight(0x8d315a, 4.2, 24);
  hotLight.position.set(5.2, -1.6, 3.5);
  scene.add(hotLight);

  const acidLight = new THREE.DirectionalLight(0xd8b96a, 2.15);
  acidLight.position.set(0.5, 1, 1.4);
  scene.add(acidLight);

  const coreGroup = new THREE.Group();
  rig.add(coreGroup);

  const coreGeometry = new THREE.IcosahedronGeometry(1.72, 8);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x07090d,
    emissive: 0x10131a,
    emissiveIntensity: 0.16,
    roughness: 0.2,
    metalness: 0.82,
    transmission: 0.12,
    thickness: 0.7,
    clearcoat: 1,
    clearcoatRoughness: 0.16
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  coreGroup.add(core);

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x78c7d4,
    wireframe: true,
    transparent: true,
    opacity: 0.18
  });
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 2), wireMaterial);
  coreGroup.add(wire);

  const torusMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8b96a,
    emissive: 0x4f3f1c,
    emissiveIntensity: 0.22,
    roughness: 0.28,
    metalness: 0.9
  });
  const torusA = new THREE.Mesh(new THREE.TorusKnotGeometry(2.45, 0.025, 260, 12, 2, 5), torusMaterial);
  const torusB = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.018, 10, 220), torusMaterial.clone());
  torusB.material.color.setHex(0x78c7d4);
  torusB.material.emissive.setHex(0x24545f);
  torusB.rotation.x = Math.PI / 2.8;
  coreGroup.add(torusA, torusB);

  const logoTexture = new THREE.TextureLoader().load('yeahayat_logo_without name.png');
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  const logoMaterial = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), logoMaterial);
  logoPlane.position.z = 1.94;
  coreGroup.add(logoPlane);

  const shardGroup = new THREE.Group();
  const shardCount = window.innerWidth < 760 ? 34 : 58;
  for (let index = 0; index < shardCount; index += 1) {
    shardGroup.add(makeShard(index, shardCount));
  }
  rig.add(shardGroup);

  const starCount = window.innerWidth < 760 ? 850 : 1500;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const color = new THREE.Color();

  for (let index = 0; index < starCount; index += 1) {
    const i = index * 3;
    const radius = 10 + Math.random() * 34;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i + 2] = radius * Math.cos(phi) - 14;

    color.setHSL([0.52, 0.12, 0.09, 0.68][index % 4], 0.72, 0.58);
    starColors[i] = color.r;
    starColors[i + 1] = color.g;
    starColors[i + 2] = color.b;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 0.1,
      map: createParticleTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  scene.add(stars);

  const clock = new THREE.Clock();

  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(width, height);
  }

  function onPointerMove(event) {
    state.targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    state.targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  function onScroll() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    state.targetScroll = window.scrollY / maxScroll;
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function tick() {
    const elapsed = clock.getElapsedTime();
    const delta = Math.min(clock.getDelta(), 0.033);

    state.pointer.lerp(state.targetPointer, 0.052);
    state.scroll += (state.targetScroll - state.scroll) * 0.06;

    rig.rotation.y = state.pointer.x * 0.2 + state.scroll * Math.PI * 0.52;
    rig.rotation.x = -state.pointer.y * 0.11 + state.scroll * 0.14;
    rig.position.y = state.scroll * -1.1;

    core.rotation.x += delta * 0.16;
    core.rotation.y += delta * 0.25;
    wire.rotation.x -= delta * 0.12;
    wire.rotation.z += delta * 0.18;
    torusA.rotation.x += delta * 0.18;
    torusA.rotation.y -= delta * 0.12;
    torusB.rotation.z -= delta * 0.16;
    logoPlane.rotation.z = Math.sin(elapsed * 0.55) * 0.025;

    shardGroup.children.forEach((shard) => {
      const data = shard.userData;
      data.angle += delta * (0.06 + data.radius * 0.0035);
      shard.position.x = Math.cos(data.angle) * data.radius;
      shard.position.z = Math.sin(data.angle) * data.radius - 1;
      shard.position.y += Math.sin(elapsed + data.float) * 0.0011;
      shard.rotation.x += data.spin.x;
      shard.rotation.y += data.spin.y;
      shard.rotation.z += data.spin.z;
    });

    stars.rotation.y -= delta * 0.009;
    stars.rotation.x = state.pointer.y * 0.016;
    camera.position.x = state.pointer.x * 0.38;
    camera.position.y = 0.2 - state.pointer.y * 0.28;
    camera.lookAt(0, -0.05, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

function initPage(root = document) {
  initReveal(root);
  initYear();
  initCodingDays();
  initMagnetic(root);
  initTilt(root);
}

let isNavigating = false;

async function navigateSeamlessly(url, { pushHistory = true, resetScroll = true } = {}) {
  if (isNavigating) {
    return;
  }

  isNavigating = true;
  document.body.classList.add('is-routing', 'page-leave');

  try {
    await new Promise((resolve) => setTimeout(resolve, 520));

    const response = await fetch(url, {
      headers: {
        'X-Requested-With': 'spa-navigation'
      }
    });

    if (!response.ok) {
      throw new Error(`Navigation failed: ${response.status}`);
    }

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    const incomingMain = parsed.querySelector('main.page-main');
    const incomingFooter = parsed.querySelector('footer.footer');
    const incomingHeader = parsed.querySelector('header.header');
    const currentMain = document.querySelector('main.page-main');
    const currentFooter = document.querySelector('footer.footer');
    const currentHeader = document.querySelector('header.header');

    if (!incomingMain || !incomingFooter || !incomingHeader || !currentMain || !currentFooter || !currentHeader) {
      window.location.href = url;
      return;
    }

    const applyDomSwap = () => {
      currentHeader.replaceWith(incomingHeader);
      currentMain.replaceWith(incomingMain);
      currentFooter.replaceWith(incomingFooter);

      document.title = parsed.title;

      const nextPage = parsed.body.getAttribute('data-page');
      if (nextPage) {
        document.body.setAttribute('data-page', nextPage);
      }

      if (pushHistory) {
        window.history.pushState({}, '', url);
      }

      if (resetScroll) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      document.body.classList.remove('page-leave');
      document.body.classList.add('page-enter');
      window.setTimeout(() => document.body.classList.remove('page-enter'), 850);

      initPage(document);
    };

    if (document.startViewTransition) {
      await document.startViewTransition(applyDomSwap).finished;
    } else {
      applyDomSwap();
    }
  } catch (error) {
    window.location.href = url;
  } finally {
    isNavigating = false;
    document.body.classList.remove('is-routing', 'page-leave');
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-nav-link="true"]');
  if (!link) {
    return;
  }

  if (link.target && link.target !== '_self') {
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
    return;
  }

  const targetUrl = new URL(href, window.location.href);
  if (targetUrl.origin !== window.location.origin) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  navigateSeamlessly(targetUrl.href, { pushHistory: true, resetScroll: true });
});

window.addEventListener('popstate', () => {
  navigateSeamlessly(window.location.href, { pushHistory: false, resetScroll: false });
});

document.body.classList.add('page-enter');
window.setTimeout(() => document.body.classList.remove('page-enter'), 850);

initVoidScene();
initPage(document);
