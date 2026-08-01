// Фоновая Three.js сцена (ядро + осколки + звёзды).
// Отличия от старой версии:
//  - three ставится из npm и tree-shake'ится, а не грузится целиком с unpkg;
//  - рендер останавливается, когда вкладка не видна (visibilitychange);
//  - полный cleanup при размонтировании (dispose геометрий/материалов/рендерера);
//  - при prefers-reduced-motion рисуется один статичный кадр без цикла.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(216,185,106,0.82)');
  gradient.addColorStop(1, 'rgba(216,185,106,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeShard(index: number, total: number) {
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

export default function VoidScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    scene.add(new THREE.AmbientLight(0xf4f1e8, 0.44));

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

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.72, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0x07090d,
        emissive: 0x10131a,
        emissiveIntensity: 0.16,
        roughness: 0.2,
        metalness: 0.82,
        transmission: 0.12,
        thickness: 0.7,
        clearcoat: 1,
        clearcoatRoughness: 0.16
      })
    );
    coreGroup.add(core);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.1, 2),
      new THREE.MeshBasicMaterial({ color: 0x78c7d4, wireframe: true, transparent: true, opacity: 0.18 })
    );
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
    (torusB.material as THREE.MeshStandardMaterial).color.setHex(0x78c7d4);
    (torusB.material as THREE.MeshStandardMaterial).emissive.setHex(0x24545f);
    torusB.rotation.x = Math.PI / 2.8;
    coreGroup.add(torusA, torusB);

    const logoTexture = new THREE.TextureLoader().load('/logo_clean.webp');
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    const logoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.15),
      new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, opacity: 0.9, depthWrite: false })
    );
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
    const pointer = new THREE.Vector2(0, 0);
    const targetPointer = new THREE.Vector2(0, 0);
    let scroll = 0;
    let targetScroll = 0;
    let rafId = 0;
    let running = true;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const onPointerMove = (event: PointerEvent) => {
      targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScroll = window.scrollY / maxScroll;
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced) {
        clock.getDelta(); // сбрасываем дельту, чтобы не было рывка
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    onScroll();

    function tick() {
      if (!running) return;

      const elapsed = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta(), 0.033);

      pointer.lerp(targetPointer, 0.052);
      scroll += (targetScroll - scroll) * 0.06;

      rig.rotation.y = pointer.x * 0.2 + scroll * Math.PI * 0.52;
      rig.rotation.x = -pointer.y * 0.11 + scroll * 0.14;
      rig.position.y = scroll * -1.1;

      core.rotation.x += delta * 0.16;
      core.rotation.y += delta * 0.25;
      wire.rotation.x -= delta * 0.12;
      wire.rotation.z += delta * 0.18;
      torusA.rotation.x += delta * 0.18;
      torusA.rotation.y -= delta * 0.12;
      torusB.rotation.z -= delta * 0.16;
      logoPlane.rotation.z = Math.sin(elapsed * 0.55) * 0.025;

      shardGroup.children.forEach((shard) => {
        const data = shard.userData as {
          angle: number;
          radius: number;
          spin: THREE.Vector3;
          float: number;
        };
        data.angle += delta * (0.06 + data.radius * 0.0035);
        shard.position.x = Math.cos(data.angle) * data.radius;
        shard.position.z = Math.sin(data.angle) * data.radius - 1;
        shard.position.y += Math.sin(elapsed + data.float) * 0.0011;
        shard.rotation.x += data.spin.x;
        shard.rotation.y += data.spin.y;
        shard.rotation.z += data.spin.z;
      });

      stars.rotation.y -= delta * 0.009;
      stars.rotation.x = pointer.y * 0.016;
      camera.position.x = pointer.x * 0.38;
      camera.position.y = 0.2 - pointer.y * 0.28;
      camera.lookAt(0, -0.05, 0);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }

    if (reduced) {
      renderer.render(scene, camera); // один статичный кадр
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);

      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      logoTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="void-canvas" aria-hidden="true" />;
}
