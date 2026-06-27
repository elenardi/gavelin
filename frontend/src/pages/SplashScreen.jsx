import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

export default function SplashScreen() {
  const canvasRef = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Three.js particle field ───────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Particle system
    const count    = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const color = Math.random() > 0.7
        ? new THREE.Color(0xf59e0b) // gold
        : Math.random() > 0.5
          ? new THREE.Color(0x7c3aed) // purple
          : new THREE.Color(0x3b82f6); // blue
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size:         0.06,
      vertexColors: true,
      transparent:  true,
      opacity:      0.8,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Floating card placeholder
    const cardGeo = new THREE.PlaneGeometry(1.2, 1.7);
    const cardMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.position.set(0, 0.5, 0);
    scene.add(cardMesh);

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
      cardMesh.rotation.y = Math.sin(Date.now() * 0.001) * 0.3;
      cardMesh.position.y = 0.5 + Math.sin(Date.now() * 0.002) * 0.1;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0d0520 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Logo & Title */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {/* D20 icon */}
        <div style={{
          width: 100, height: 100,
          margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #7c3aed, #f59e0b)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48,
          boxShadow: '0 0 40px rgba(124,58,237,0.6)',
          animation: 'pulse 2s infinite',
        }}>
          🎲
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 8vw, 48px)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #c084fc, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}>
          GAVELIN
        </h1>

        <p style={{ color: '#8b7aa8', fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 40 }}>
          Card Chronicles
        </p>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#7c3aed',
              animation: `bounce 1s ${delay}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(124,58,237,0.6); }
          50% { box-shadow: 0 0 60px rgba(245,158,11,0.6); }
        }
      `}</style>
    </div>
  );
}
