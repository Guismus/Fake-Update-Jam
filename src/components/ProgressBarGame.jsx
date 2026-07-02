import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';

export default function ProgressBarGame({
  progress,
  phase,
  onProgressTick,
  onTriggerCollapse,
  onClose,
  addLog,
  setGlitchLevel
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Game states
  const [score, setScore] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [keysInverted, setKeysInverted] = useState(false);

  // Keyboard references
  const keys = useRef({});

  // Refs for props to prevent game loop resets
  const progressRef = useRef(progress);
  const onProgressTickRef = useRef(onProgressTick);
  const setGlitchLevelRef = useRef(setGlitchLevel);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    onProgressTickRef.current = onProgressTick;
  }, [onProgressTick]);

  useEffect(() => {
    setGlitchLevelRef.current = setGlitchLevel;
  }, [setGlitchLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    let gameActive = true;

    // Player definition
    const player = {
      x: 50,
      y: 100,
      vx: 0,
      vy: 0,
      width: 14,
      height: 14,
      speed: 3.5,
      jumpForce: 7.5,
      grounded: false,
      color: '#39ff14', // neon green
      hitFlash: 0
    };

    // Level Platforms
    // Progress bar canvas dimensions: 700 x 240
    const platforms = [
      // Floor
      { x: 0, y: 220, w: 700, h: 20, label: 'SECTOR_0_FLOOR' },
      
      // Left/Right Walls
      { x: 0, y: 0, w: 10, h: 220 },
      { x: 690, y: 0, w: 10, h: 220 },
      
      // Floating segments shaped like data packets/letters
      { x: 70, y: 160, w: 100, h: 16, label: 'DATA_0x0A' },
      { x: 220, y: 130, w: 80, h: 16, label: 'DATA_0x4F' },
      { x: 340, y: 160, w: 110, h: 16, label: 'DATA_0xDF' },
      { x: 490, y: 120, w: 120, h: 16, label: 'SYS_STACK' },
      
      // The "9" Platform
      { x: 140, y: 90, w: 40, h: 12 },
      // The "." Platform
      { x: 310, y: 80, w: 16, h: 16 },
      // The "%" Platform
      { x: 440, y: 70, w: 30, h: 12 }
    ];

    // Collectibles (yellow data bytes)
    let collectibles = [
      { id: 1, x: 120, y: 120, r: 6, pulse: 0 },
      { id: 2, x: 260, y: 90, r: 6, pulse: 0.5 },
      { id: 3, x: 390, y: 120, r: 6, pulse: 1.0 },
      { id: 4, x: 550, y: 80, r: 6, pulse: 1.5 },
      { id: 5, x: 318, y: 40, r: 6, pulse: 2.0 }
    ];

    // Hazards (red glitch bytes sliding around)
    const hazards = [
      { x: 150, y: 204, w: 16, h: 16, vx: 1, minX: 100, maxX: 300 },
      { x: 450, y: 204, w: 16, h: 16, vx: -1, minX: 350, maxX: 650 },
      { x: 220, y: 114, w: 12, h: 12, vx: 0.75, minX: 220, maxX: 300 },
      { x: 490, y: 104, w: 14, h: 12, vx: 1.25, minX: 490, maxX: 610 }
    ];

    // Particle FX
    let particles = [];
    const spawnParticles = (x, y, color, count = 8) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          alpha: 1,
          size: Math.random() * 3 + 2,
          decay: Math.random() * 0.03 + 0.02,
          color
        });
      }
    };

    // Keyboard bindings
    const handleKeyDown = (e) => {
      keys.current[e.key] = true;
      // Prevent browser scroll
      if (['ArrowUp', 'ArrowDown', 'Space', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      keys.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Physics Engine Loop
    const update = () => {
      if (!gameActive) return;

      // 1. Inverted controls check
      const currentGlitch = (progressRef.current - 99.97) / 0.02; // 0 to 1 as we approach 99.99
      const isInverted = currentGlitch > 0.5;
      setKeysInverted(isInverted);
      
      // Play glitch sound if intensity gets higher
      if (Math.random() < currentGlitch * 0.02) {
        audio.playGlitch();
      }

      // Adjust player movement direction
      let dirLeft = keys.current['ArrowLeft'] || keys.current['a'] || keys.current['A'];
      let dirRight = keys.current['ArrowRight'] || keys.current['d'] || keys.current['D'];
      const dirJump = keys.current['ArrowUp'] || keys.current['w'] || keys.current['W'] || keys.current['Space'] || keys.current[' '];

      if (isInverted) {
        // Swap inputs
        const temp = dirLeft;
        dirLeft = dirRight;
        dirRight = temp;
      }

      // Horizontal acceleration
      if (dirLeft) {
        player.vx = -player.speed;
      } else if (dirRight) {
        player.vx = player.speed;
      } else {
        player.vx *= 0.8; // friction
      }

      // Apply Gravity
      player.vy += 0.35; // gravity pull
      player.y += player.vy;
      player.x += player.vx;

      player.grounded = false;

      // 2. Platform Collisions (AABB Solver)
      platforms.forEach(plat => {
        // Check intersection
        if (
          player.x < plat.x + plat.w &&
          player.x + player.width > plat.x &&
          player.y < plat.y + plat.h &&
          player.y + player.height > plat.y
        ) {
          // Resolve overlap along shortest path
          const overlapX = Math.min(player.x + player.width - plat.x, plat.x + plat.w - player.x);
          const overlapY = Math.min(player.y + player.height - plat.y, plat.y + plat.h - player.y);

          if (overlapX < overlapY) {
            // Push out horizontally
            if (player.vx > 0) {
              player.x -= overlapX;
            } else if (player.vx < 0) {
              player.x += overlapX;
            }
            player.vx = 0;
          } else {
            // Push out vertically
            if (player.vy > 0) {
              player.y -= overlapY;
              player.vy = 0;
              player.grounded = true;
            } else if (player.vy < 0) {
              player.y += overlapY;
              player.vy = 0;
            }
          }
        }
      });

      // Jump request
      if (dirJump && player.grounded) {
        player.vy = -player.jumpForce;
        player.grounded = false;
        audio.playJump();
      }

      // 3. Keep player inside boundaries
      if (player.x < 10) player.x = 10;
      if (player.x + player.width > 680) player.x = 680 - player.width;
      if (player.y < 0) {
        player.y = 0;
        player.vy = 0;
      }
      if (player.y > 240) {
        // Respawn player
        respawnPlayer();
      }

      // 4. Update hazards
      hazards.forEach(haz => {
        haz.x += haz.vx;
        if (haz.x < haz.minX) {
          haz.x = haz.minX;
          haz.vx = -haz.vx;
        } else if (haz.x > haz.maxX) {
          haz.x = haz.maxX;
          haz.vx = -haz.vx;
        }

        // Collision with player
        if (
          player.x < haz.x + haz.w &&
          player.x + player.width > haz.x &&
          player.y < haz.y + haz.h &&
          player.y + player.height > haz.y
        ) {
          triggerHurt();
        }
      });

      // Update particles
      particles.forEach((part, idx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= part.decay;
        if (part.alpha <= 0) {
          particles.splice(idx, 1);
        }
      });

      // 5. Check Collectible collisions
      collectibles.forEach((item, idx) => {
        item.pulse += 0.05;
        const dx = (player.x + player.width/2) - item.x;
        const dy = (player.y + player.height/2) - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (item.r + player.width/2 + 2)) {
          // Play pick audio
          audio.playPickup();
          // Spawn particle flare
          spawnParticles(item.x, item.y, '#ffea00', 12);
          // Remove collectible
          collectibles.splice(idx, 1);
          setScore(s => s + 1);

          // Add Progress tick
          const increment = 0.004; // Each coin gives 0.004%
          onProgressTickRef.current(increment);
          
          // Re-spawn a new collectible in a random safe location
          setTimeout(() => {
            const randPlat = platforms[Math.floor(Math.random() * (platforms.length - 2)) + 2]; // avoid floor/walls
            const newItemX = randPlat.x + Math.random() * (randPlat.w - 12) + 6;
            const newItemY = randPlat.y - 20;
            collectibles.push({
              id: Date.now(),
              x: newItemX,
              y: newItemY,
              r: 6,
              pulse: Math.random() * 2
            });
          }, 1500);
        }
      });

      // Update hit flash visual timer
      if (player.hitFlash > 0) player.hitFlash -= 1;
    };

    const respawnPlayer = () => {
      player.x = 50;
      player.y = 100;
      player.vx = 0;
      player.vy = 0;
    };

    const triggerHurt = () => {
      audio.playHurt();
      setDeaths(d => d + 1);
      spawnParticles(player.x + player.width/2, player.y + player.height/2, '#ff0055', 20);
      
      // Lose some progress penalty (but clamp so we don't go below entry point 99.970%)
      onProgressTickRef.current(-0.002);
      
      // Camera tremor trigger via parent
      setGlitchLevelRef.current(true);
      setTimeout(() => setGlitchLevelRef.current(false), 200);

      respawnPlayer();
      player.hitFlash = 15; // flash player red
    };

    // Render loop
    const draw = () => {
      ctx.fillStyle = '#020206';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Draw Platforms
      platforms.forEach(plat => {
        // Neon boundary styling
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

        // Subtly label platforms for technical/hacker theme
        if (plat.label) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.font = '7px "JetBrains Mono", monospace';
          ctx.fillText(plat.label, plat.x + 6, plat.y + 11);
        }
      });

      // Draw collectibles (pulsing circles)
      collectibles.forEach(item => {
        const pulseRadius = item.r + Math.sin(item.pulse) * 1.5;
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'var(--neon-yellow)';
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(item.x, item.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // reset shadow
        ctx.shadowBlur = 0;

        // Draw little star outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw hazards (flickering red code glitches)
      hazards.forEach(haz => {
        ctx.fillStyle = Math.random() < 0.2 ? '#ffffff' : 'var(--neon-magenta)';
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'var(--neon-magenta)';
        ctx.fillRect(haz.x, haz.y, haz.w, haz.h);
        ctx.shadowBlur = 0;

        // X inside hazards
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(haz.x + 3, haz.y + 3);
        ctx.lineTo(haz.x + haz.w - 3, haz.y + haz.h - 3);
        ctx.moveTo(haz.x + haz.w - 3, haz.y + 3);
        ctx.lineTo(haz.x + 3, haz.y + haz.h - 3);
        ctx.stroke();
      });

      // Draw particles
      particles.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.alpha;
        ctx.fillRect(part.x, part.y, part.size, part.size);
      });
      ctx.globalAlpha = 1.0; // reset

      // Draw player (avatar block)
      if (player.hitFlash % 2 === 0) {
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;

        // Draw cute screen-face on player
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x + 3, player.y + 3, 2, 2);
        ctx.fillRect(player.x + 9, player.y + 3, 2, 2);
        ctx.fillRect(player.x + 4, player.y + 8, 6, 2);
      } else {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(player.x, player.y, player.width, player.height);
      }

      // Draw Inverted controls prompt if active
      if (keysInverted) {
        ctx.fillStyle = 'rgba(255, 0, 85, 0.85)';
        ctx.font = '10px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('! GLITCH WARNING: MOVEMENT INVERTED !', canvas.width / 2, 30);
      }
    };

    // Unified game ticker
    const tick = () => {
      update();
      draw();
      if (gameActive) {
        animationId = requestAnimationFrame(tick);
      }
    };

    // Run game loop
    tick();

    // Cleanup listeners
    return () => {
      gameActive = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Monitor progress to trigger the exit collapse
  useEffect(() => {
    // If progress reaches 99.990%, force the debugger to break and collapse layout!
    if (progress >= 99.990) {
      addLog(`[WARN] SYSTEM TEMP EXCEEDED SAFETY VALUES.`, 'warning');
      addLog(`[WARN] BUFFER OVERRUN. TERMINATING DEBUGGER.EXE.`, 'warning');
      addLog(`[ERROR] INTERFACE STRUCTURE UNSTABLE. RUN COGNITIVE LAUNCHER RESET.`, 'error');
      
      onTriggerCollapse(); // start Version 1.0.0 layout physics collapse
    }
  }, [progress, onTriggerCollapse, addLog]);

  return (
    <div 
      className="modal-overlay" 
      ref={containerRef}
      style={{ background: 'rgba(5, 5, 10, 0.96)' }}
    >
      <div 
        className="panel glitchy" 
        style={{ width: '740px', padding: '20px', background: '#090912', border: '2px solid var(--neon-cyan)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="version-badge">DEBUG MODE</span>
              SYSTEM_BAR_INTRUSION.EXE
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
              TARGET ADDRESS: 0x00F99F99 - PROGRESS OVERRIDE
            </p>
          </div>
          <button 
            className="btn-neon magenta" 
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={() => {
              audio.playClick();
              onClose();
            }}
          >
            TERMINATE
          </button>
        </div>

        {/* Game Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Packets Saved: </span>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{score}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Errors Blocked: </span>
            <span style={{ color: 'var(--neon-magenta)', fontWeight: 'bold' }}>{deaths}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Patcher Progress: </span>
            <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>{progress.toFixed(3)}%</span>
          </div>
        </div>

        {/* Primary Screen Area */}
        <div className="debugger-container">
          <canvas 
            ref={canvasRef} 
            width={700} 
            height={240} 
            className={`debugger-canvas ${keysInverted ? 'error-state' : ''}`}
          />
          
          <div className="debugger-controls-guide">
            Use <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>A/D</span> or <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>←/→</span> to Move | <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>W</span>, <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>SPACE</span> or <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>↑</span> to Jump.<br/>
            Avoid <span style={{ color: 'var(--neon-magenta)', fontWeight: 'bold' }}>Red Code Spikes</span>. Collect <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>Yellow Data Bytes</span> to push installation to 100%.
          </div>
        </div>
      </div>
    </div>
  );
}
