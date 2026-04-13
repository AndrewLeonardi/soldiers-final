import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createGunJeep, animateGunJeep } from '@three/models/jeep';
import '@styles/homepage.css';

// ── Constants ──
const DRIVE_SPEED = 2.5;
const WALL_COUNT = 8;
const DUST_COUNT = 300;

// ── Enable body scroll for homepage (global.css sets overflow:hidden) ──
function useBodyScroll(): void {
  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);
}

// ── Brain Canvas Config ──
const BRAIN_LAYERS: { label: string; count: number }[] = [
  { label: 'OBSERVATION', count: 12 },
  { label: 'HIDDEN 1', count: 8 },
  { label: 'HIDDEN 2', count: 8 },
  { label: 'ACTIONS', count: 8 },
];
const ACTION_LABELS: string[] = ['↑', '↓', '←', '→', 'STAY', 'SHOOT', 'DOWN', 'UP'];

// ============================================================
// Three.js Hero Scene
// ============================================================
function useHeroScene(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a1a);
    scene.fog = new THREE.FogExp2(0x1a2a1a, 0.035);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(-1, 1.8, 5.5);
    camera.lookAt(0.5, 0.3, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0x667766, 1.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e0, 3.5);
    dirLight.position.set(4, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x88aacc, 0.8);
    fillLight.position.set(-4, 4, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xd4aa40, 2.0, 15);
    rimLight.position.set(-3, 3, -5);
    scene.add(rimLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(30, 30, 80, 80);
    const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setZ(i, posAttr.getZ(i) + (Math.random() - 0.5) * 0.08);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a4535,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Jeep
    const jeep = createGunJeep();
    jeep.group.scale.setScalar(4);
    jeep.group.rotation.y = -Math.PI / 2;
    scene.add(jeep.group);

    // Point gun left
    if (jeep.parts.gunPivot) {
      jeep.parts.gunPivot.rotation.y = 1.3;
    }

    // Decorative background blocks (simple boxes — not destructible, just visual scenery)
    const wallGeo = new THREE.BoxGeometry(1.2, 1.0, 0.4);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a8a5a, roughness: 0.7 });
    const walls: THREE.Mesh[] = [];
    const wallPositions = [
      { x: -8, z: -2 }, { x: -4, z: 3 }, { x: 0, z: -3 },
      { x: 4, z: 2 }, { x: 8, z: -1 }, { x: 12, z: 3 },
      { x: 16, z: -2 }, { x: 20, z: 1 },
    ];
    for (let i = 0; i < WALL_COUNT; i++) {
      const wall = new THREE.Mesh(wallGeo, wallMat);
      const p = wallPositions[i];
      const scale = 2 + Math.random() * 1.5;
      wall.position.set(p.x, 0.5 * scale, p.z);
      wall.scale.setScalar(scale);
      wall.rotation.y = Math.random() * Math.PI;
      wall.castShadow = true;
      scene.add(wall);
      walls.push(wall);
    }

    // Dust particles
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 30;
      dustPositions[i * 3 + 1] = Math.random() * 3;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xc2b280,
      size: 0.04,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // Muzzle flash light
    const muzzleLight = new THREE.PointLight(0xffaa22, 0, 8);
    scene.add(muzzleLight);

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.4,  // strength
      0.5,  // radius
      0.85  // threshold
    );
    composer.addPass(bloomPass);

    // Clock
    const clock = new THREE.Clock();
    let animFrameId: number;

    // Animation loop
    function animate(): void {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const dt = clock.getDelta();

      // Jeep driving bounce
      jeep.group.position.y = Math.sin(elapsed * 8) * 0.018;

      // Animate jeep in firing state
      animateGunJeep(jeep, 'firing', elapsed, dt, 0);

      // Keep gun pointed left
      if (jeep.parts.gunPivot) {
        jeep.parts.gunPivot.rotation.y = 1.3;
      }

      // Muzzle flash light follows gun
      if (jeep.parts.muzzleFlash && jeep.parts.muzzleFlash.visible) {
        const worldPos = new THREE.Vector3();
        jeep.parts.muzzleFlash.getWorldPosition(worldPos);
        muzzleLight.position.copy(worldPos);
        muzzleLight.intensity = 3;
      } else {
        muzzleLight.intensity = 0;
      }

      // Scroll walls left
      for (const w of walls) {
        w.position.x -= DRIVE_SPEED * (1 / 60);
        if (w.position.x < -15) {
          w.position.x += 40;
        }
      }

      // Dust drift
      const dPos = dust.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST_COUNT; i++) {
        let x = dPos.getX(i) - DRIVE_SPEED * 0.3 * (1 / 60);
        if (x < -15) x += 30;
        dPos.setX(i, x);
        dPos.setY(i, dPos.getY(i) + Math.sin(elapsed + i) * 0.001);
      }
      dPos.needsUpdate = true;

      // Gentle camera sway
      camera.position.x = -1 + Math.sin(elapsed * 0.3) * 0.15;
      camera.position.y = 1.8 + Math.sin(elapsed * 0.5) * 0.05;
      camera.lookAt(0.5, 0.3, 0);

      composer.render();
    }

    animate();

    // Resize handler
    function onResize(): void {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    }
    window.addEventListener('resize', onResize);

    // Cleanup ref
    cleanupRef.current = () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameId);
      composer.dispose();
      renderer.dispose();
      jeep.dispose();
      wallGeo.dispose();
      wallMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [containerRef]);
}

// ============================================================
// Brain Canvas (Neural Network Visualization)
// ============================================================
function useBrainCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>): void {
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize(): void {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      canvas!.width = rect.width * window.devicePixelRatio;
      canvas!.height = rect.height * window.devicePixelRatio;
      canvas!.style.width = rect.width + 'px';
      canvas!.style.height = rect.height + 'px';
    }
    resize();

    let activeAction = 0;
    let lastSwitch = 0;

    function drawBrain(time: number): void {
      animFrameRef.current = requestAnimationFrame(drawBrain);
      const t = time / 1000;

      // Switch active action every 2 seconds
      if (t - lastSwitch > 2) {
        activeAction = Math.floor(Math.random() * BRAIN_LAYERS[3].count);
        lastSwitch = t;
      }

      const w = canvas!.width;
      const h = canvas!.height;
      const dpr = window.devicePixelRatio;
      ctx!.clearRect(0, 0, w, h);

      const layers = BRAIN_LAYERS;
      const layerX: number[] = [];
      const padX = w * 0.12;
      const gapX = (w - padX * 2) / (layers.length - 1);
      for (let i = 0; i < layers.length; i++) {
        layerX.push(padX + i * gapX);
      }

      // Compute node positions
      const nodes: { x: number; y: number }[][] = [];
      for (let li = 0; li < layers.length; li++) {
        const layerNodes: { x: number; y: number }[] = [];
        const count = layers[li].count;
        const padY = h * 0.15;
        const gapY = (h - padY * 2) / (count - 1 || 1);
        for (let ni = 0; ni < count; ni++) {
          const y = count === 1 ? h / 2 : padY + ni * gapY;
          layerNodes.push({ x: layerX[li], y });
        }
        nodes.push(layerNodes);
      }

      // Draw edges
      for (let li = 0; li < nodes.length - 1; li++) {
        const fromLayer = nodes[li];
        const toLayer = nodes[li + 1];
        for (let fi = 0; fi < fromLayer.length; fi++) {
          for (let ti = 0; ti < toLayer.length; ti++) {
            const pulse = Math.sin(t * 3 + fi * 0.5 + ti * 0.7 + li) * 0.5 + 0.5;
            const alpha = 0.03 + pulse * 0.08;
            ctx!.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx!.lineWidth = 1 * dpr;
            ctx!.beginPath();
            ctx!.moveTo(fromLayer[fi].x, fromLayer[fi].y);
            ctx!.lineTo(toLayer[ti].x, toLayer[ti].y);
            ctx!.stroke();
          }
        }
      }

      // Draw nodes
      for (let li = 0; li < nodes.length; li++) {
        for (let ni = 0; ni < nodes[li].length; ni++) {
          const node = nodes[li][ni];
          const pulse = Math.sin(t * 4 + ni * 0.8 + li * 1.2) * 0.5 + 0.5;
          const radius = (3 + pulse * 2) * dpr;

          // Glow
          const gradient = ctx!.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, radius * 3
          );
          gradient.addColorStop(0, `rgba(0, 255, 65, ${0.3 + pulse * 0.3})`);
          gradient.addColorStop(1, 'rgba(0, 255, 65, 0)');
          ctx!.fillStyle = gradient;
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
          ctx!.fill();

          // Node
          ctx!.fillStyle = `rgba(0, 255, 65, ${0.6 + pulse * 0.4})`;
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx!.fill();

          // Active action ring on last layer
          if (li === nodes.length - 1 && ni === activeAction) {
            ctx!.strokeStyle = '#d4aa40';
            ctx!.lineWidth = 2 * dpr;
            ctx!.beginPath();
            ctx!.arc(node.x, node.y, radius + 6 * dpr, 0, Math.PI * 2);
            ctx!.stroke();

            // Gold glow
            const goldGlow = ctx!.createRadialGradient(
              node.x, node.y, radius,
              node.x, node.y, radius + 12 * dpr
            );
            goldGlow.addColorStop(0, 'rgba(212, 170, 64, 0.3)');
            goldGlow.addColorStop(1, 'rgba(212, 170, 64, 0)');
            ctx!.fillStyle = goldGlow;
            ctx!.beginPath();
            ctx!.arc(node.x, node.y, radius + 12 * dpr, 0, Math.PI * 2);
            ctx!.fill();
          }

          // Action labels on last layer
          if (li === nodes.length - 1 && ACTION_LABELS[ni]) {
            ctx!.fillStyle = ni === activeAction
              ? '#d4aa40'
              : 'rgba(255, 255, 255, 0.3)';
            ctx!.font = `${10 * dpr}px 'Share Tech Mono', monospace`;
            ctx!.textAlign = 'left';
            ctx!.fillText(ACTION_LABELS[ni], node.x + 14 * dpr, node.y + 4 * dpr);
          }
        }
      }

      // Layer labels
      ctx!.textAlign = 'center';
      for (let li = 0; li < layers.length; li++) {
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx!.font = `${9 * dpr}px 'Share Tech Mono', monospace`;
        ctx!.fillText(layers[li].label, layerX[li], h - 10 * dpr);
      }
    }

    animFrameRef.current = requestAnimationFrame(drawBrain);

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasRef]);
}

// ============================================================
// HomePage Component
// ============================================================
export default function HomePage() {
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const brainCanvasRef = useRef<HTMLCanvasElement>(null);

  useBodyScroll();
  useHeroScene(heroContainerRef);
  useBrainCanvas(brainCanvasRef);

  return (
    <div className="homepage">
      {/* ── HERO ── */}
      <section className="hp-hero">
        <div ref={heroContainerRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

        <div className="hp-neural-badge">
          <span className="dot" />
          NEURAL NETWORK ACTIVE
        </div>

        <div className="hp-hero-overlay">
          <h1>TOY SOLDIERS.AI</h1>
          <div className="hp-hero-tagline">
            We gave every toy soldier its own AI brain.
          </div>
          <div className="hp-hero-sub">
            BUILD. TRAIN. BATTLE. EVOLVE.
          </div>
          <Link to="/camp" className="hp-hero-cta">
            PLAY FREE
          </Link>
          {import.meta.env.DEV && (
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link
                to="/game-concept"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: 1.5,
                  color: 'rgba(232, 198, 90, 0.7)',
                  textDecoration: 'none',
                  padding: '4px 10px',
                  border: '1px solid rgba(232, 198, 90, 0.3)',
                  borderRadius: 4,
                }}
              >
                [DEV] /game-concept
              </Link>
            </div>
          )}
        </div>

        <div className="hp-scroll-hint">SCROLL &#9660;</div>
      </section>

      {/* ── THE HOOK ── */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-hook-grid">
            <div>
              <div className="hp-section-label">THE HOOK</div>
              <h2 className="hp-section-title">They&rsquo;re Not Scripted. They Learn.</h2>
              <p className="hp-section-desc">
                Every soldier runs a real neural network — 8,192 parameters making
                decisions in real-time. No behavior trees, no state machines, no
                scripted patrol paths.
              </p>
              <p className="hp-section-desc" style={{ marginTop: '16px' }}>
                They observe their surroundings, weigh their options, and act.
                Train them through episodes of combat and watch emergent tactics
                develop — flanking, retreating, covering fire — all learned, never
                programmed.
              </p>
            </div>
            <div className="hp-hook-visual">
              <canvas ref={brainCanvasRef} />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-section-label">HOW IT WORKS</div>
          <h2 className="hp-section-title">Three Steps to Domination</h2>
          <div className="hp-steps-grid">
            <div className="hp-step-card">
              <div className="hp-step-num">01</div>
              <div className="hp-step-title">BUILD YOUR BASE</div>
              <div className="hp-step-desc">
                Place walls, turrets, and defenses on a grid battlefield. Every
                structure affects how your soldiers perceive and navigate the
                world.
              </div>
            </div>
            <div className="hp-step-card">
              <div className="hp-step-num">02</div>
              <div className="hp-step-title">TRAIN YOUR ARMY</div>
              <div className="hp-step-desc">
                Watch your soldiers train through hundreds of episodes. Their
                neural networks evolve through reinforcement learning — rewarding
                smart play.
              </div>
            </div>
            <div className="hp-step-card">
              <div className="hp-step-num">03</div>
              <div className="hp-step-title">RAID &amp; CONQUER</div>
              <div className="hp-step-desc">
                Send your AI army against other players&rsquo; bases. Your soldiers
                make every decision autonomously — you just watch and pray.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROOF ── */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-section-label">THE PROOF</div>
          <h2 className="hp-section-title">Real Numbers, Real AI</h2>
          <div className="hp-proof-row">
            <div className="hp-proof-stat">
              <div className="num">8,192</div>
              <div className="label">NEURAL PARAMETERS PER SOLDIER</div>
            </div>
            <div className="hp-proof-stat">
              <div className="num">750+</div>
              <div className="label">TRAINING EPISODES PER PHASE</div>
            </div>
            <div className="hp-proof-stat">
              <div className="num">&lt;0.1ms</div>
              <div className="label">INFERENCE PER DECISION</div>
            </div>
            <div className="hp-proof-stat">
              <div className="num">0</div>
              <div className="label">LINES OF SCRIPTED BEHAVIOR</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="hp-bottom-cta">
        <h2>Ready to Command?</h2>
        <Link to="/camp" className="hp-hero-cta">
          PLAY FREE
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="hp-footer">
        TOYSOLDIERS.AI &mdash; Pure JS, no dependencies, real machine learning
      </footer>
    </div>
  );
}
