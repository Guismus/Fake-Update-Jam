import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';

export default function SimulationUI({ onReset }) {
  const canvasRef = useRef(null);
  const [bootStep, setBootStep] = useState(0);
  const [bootLogs, setBootLogs] = useState([]);
  const [simulationActive, setSimulationActive] = useState(false);
  const [warpSpeed, setWarpSpeed] = useState(1);

  const logs = [
    { text: ">> INITIALIZING CHRONOS ENGINE CORE...", type: "system" },
    { text: ">> INJECTING TEMPORAL FLOW VECTOR MATRIX...", type: "system" },
    { text: ">> CALIBRATING GRAVITY CONSTANT (G = 9.80665 m/s²)... OK", type: "success" },
    { text: ">> VALIDATING REGISTRY HEXADECIMAL CHECKSUMS... OK", type: "success" },
    { text: ">> ESTABLISHING TEMPORAL STABILITY FIELD... STABLE", type: "success" },
    { text: ">> WARNING: REALITY COHERENCE DEVIATION AT 0.00%", type: "warning" },
    { text: ">> PARSING CHRONOS SHIFT WORLD MATRIX v1.0.0...", type: "system" },
    { text: ">> ENGAGING TIME WARP COLLIMATORS...", type: "system" },
    { text: ">> SIMULATION PROTOCOL IS GO.", type: "success" }
  ];

  // Typing effect for the boot loader logs
  useEffect(() => {
    if (bootStep >= logs.length) {
      setTimeout(() => {
        setSimulationActive(true);
        audio.playSuccess();
      }, 1000);
      return;
    }

    const timer = setTimeout(() => {
      audio.playClick();
      setBootLogs(prev => [...prev, logs[bootStep]]);
      setBootStep(prev => prev + 1);
    }, 400 + Math.random() * 400);

    return () => clearTimeout(timer);
  }, [bootStep]);

  // Canvas Starfield / Warp speed simulation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    const numStars = 150;
    const stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * canvas.width,
        color: i % 2 === 0 ? '#00f0ff' : '#ff0055'
      });
    }

    const draw = () => {
      // Semi-transparent black fill to create tail/motion-blur effect
      ctx.fillStyle = 'rgba(5, 5, 8, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw cyber grid tunnel lines in background
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridCount = 12;
      for (let i = 0; i < gridCount; i++) {
        const angle = (i / gridCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * canvas.width, cy + Math.sin(angle) * canvas.height);
        ctx.stroke();
      }

      // Render stars
      stars.forEach(star => {
        // Move star closer (decrease z)
        star.z -= simulationActive ? 18 * warpSpeed : 4;

        // Reset star if it passes the viewer
        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width - canvas.width / 2;
          star.y = Math.random() * canvas.height - canvas.height / 2;
        }

        // Project 3D coordinate to 2D
        const px = (star.x / star.z) * canvas.width + cx;
        const py = (star.y / star.z) * canvas.height + cy;

        // Calculate tail coordinate for warp look
        const pzPrev = star.z + (simulationActive ? 30 : 10);
        const pxPrev = (star.x / pzPrev) * canvas.width + cx;
        const pyPrev = (star.y / pzPrev) * canvas.height + cy;

        if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
          const size = (1 - star.z / canvas.width) * 3 + 0.5;
          ctx.strokeStyle = star.color;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(pxPrev, pyPrev);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
      });

      // Pulse background glow
      if (simulationActive) {
        const glowRadius = Math.sin(Date.now() / 400) * 100 + 300;
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.03)');
        grad.addColorStop(0.5, 'rgba(255, 0, 85, 0.01)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [simulationActive, warpSpeed]);

  // Accelerate warp speed when pointer is pressed or moved
  const handlePointerDown = () => {
    setWarpSpeed(3);
    audio.playJump();
  };

  const handlePointerUp = () => {
    setWarpSpeed(1);
  };

  return (
    <div 
      className="simulation-screen"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: '#050508',
        zIndex: 9990,
        overflow: 'hidden',
        fontFamily: "'JetBrains Mono', monospace"
      }}
    >
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          display: 'block'
        }}
      />

      {/* Retro scanline filters & vignettes */}
      <div className="crt-overlay" />

      {/* Booting Loader Console Overlay */}
      {!simulationActive && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '650px',
            background: 'rgba(13, 13, 22, 0.85)',
            border: '2px solid var(--neon-cyan)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.25)',
            backdropFilter: 'blur(10px)',
            color: '#a7f3d0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0, 240, 255, 0.2)', paddingBottom: '10px', marginBottom: '15px' }}>
            <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-cyan)', fontWeight: 'bold', letterSpacing: '1px' }}>
              CHRONOS_CONNECT_INITIALIZATION
            </span>
            <span className="status-indicator">
              <span className="status-dot" style={{ animation: 'blink 0.5s infinite alternate' }} />
              BOOTING...
            </span>
          </div>

          <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            {bootLogs.map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  color: log.type === 'success' ? 'var(--neon-green)' : log.type === 'warning' ? 'var(--neon-yellow)' : '#cbd5e1',
                  textShadow: log.type === 'success' ? '0 0 5px rgba(57, 255, 20, 0.2)' : 'none'
                }}
              >
                {log.text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Awaiting quantum synchronization index loop...
          </div>
        </div>
      )}

      {/* Main Simulation Screen Overlay */}
      {simulationActive && (
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '40px',
            pointerEvents: 'none'
          }}
        >
          {/* Top Bar HUD */}
          <div 
            style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'rgba(13, 13, 22, 0.7)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '8px',
              padding: '12px 24px',
              backdropFilter: 'blur(5px)',
              pointerEvents: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--neon-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--neon-green)' }} />
              <span style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '2px', fontFamily: 'Orbitron, sans-serif' }}>
                SIMULATION STATUS: ACTIVE
              </span>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.8rem', letterSpacing: '1px' }}>
              CHRONOLOGY STABILITY: 100.00%
            </div>
          </div>

          {/* Centered Portal HUD */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 
              className="glitch-text" 
              data-text="CHRONOS SHIFT"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '4.5rem',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '10px',
                textShadow: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(255, 0, 85, 0.4)',
                marginBottom: '15px'
              }}
            >
              CHRONOS SHIFT
            </h1>
            <p 
              style={{ 
                color: 'var(--neon-cyan)', 
                fontSize: '1.2rem', 
                letterSpacing: '4px',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.5)',
                marginBottom: '4px'
              }}
            >
              Enter the Simulation
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '500px', lineHeight: 1.5, margin: '15px 0' }}>
              Hold click anywhere to warp time, accelerate packets and bend the space-time vector field.
            </p>
          </div>

          {/* Bottom HUD Actions */}
          <div 
            style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              pointerEvents: 'auto'
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              v1.0.0 BUILD_STABLE // SYSTEM RUNNING IN QUANTUM TIME-RIFT
            </div>

            <button 
              className="btn-neon magenta"
              onClick={() => {
                audio.playSelect();
                onReset();
              }}
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.8rem', 
                height: 'auto',
                boxShadow: '0 0 10px rgba(255, 0, 85, 0.3)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              RESET SIMULATION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
