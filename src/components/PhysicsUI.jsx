import React, { useEffect, useState, useRef } from 'react';
import { audio } from '../audio';

export default function PhysicsUI({ onSyncComplete, addLog }) {
  const containerRef = useRef(null);
  
  // Scren dimensions
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  // Sockets in center of screen
  // Layout coordinates for 900x600 grid
  const sockets = {
    core: { x: 275, y: 80, w: 350, h: 180, label: 'CORE_PROCESSOR_SOCKET', snapped: false },
    files: { x: 100, y: 300, w: 320, h: 200, label: 'DATA_PIPELINE_SOCKET', snapped: false },
    logs: { x: 480, y: 300, w: 320, h: 200, label: 'DIAGNOSTIC_FEED_SOCKET', snapped: false }
  };

  // Falling Rigid Bodies
  const [items, setItems] = useState([
    {
      id: 'core',
      name: 'Patcher Core Engine',
      x: 100,
      y: 50,
      vx: 2,
      vy: 1,
      w: 350,
      h: 180,
      color: 'var(--neon-cyan)',
      glowColor: 'rgba(0, 240, 255, 0.4)',
      snapped: false
    },
    {
      id: 'files',
      name: 'Local Directory Registry',
      x: 480,
      y: 80,
      vx: -3,
      vy: 2,
      w: 320,
      h: 200,
      color: 'var(--neon-yellow)',
      glowColor: 'rgba(255, 183, 0, 0.4)',
      snapped: false
    },
    {
      id: 'logs',
      name: 'System Logger Console',
      x: 300,
      y: 120,
      vx: 1.5,
      vy: -1,
      w: 320,
      h: 200,
      color: 'var(--neon-magenta)',
      glowColor: 'rgba(255, 0, 85, 0.4)',
      snapped: false
    }
  ]);

  // Dragging states
  const draggedItemId = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mousePos = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const mouseSpeed = useRef({ x: 0, y: 0 });

  // Track screen size
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Physics Simulation Loop
  useEffect(() => {
    let animationId;
    const gravity = 0.45;
    const bounce = 0.35; // bounce damping
    const friction = 0.985; // air resistance

    const updatePhysics = () => {
      setItems(prevItems => {
        let allSnapped = true;

        const updated = prevItems.map(item => {
          if (item.snapped) {
            return item;
          }

          allSnapped = false;

          // If currently being dragged, lock to mouse coordinates
          if (draggedItemId.current === item.id) {
            const nextX = mousePos.current.x - dragOffset.current.x;
            const nextY = mousePos.current.y - dragOffset.current.y;
            
            // Calculate velocity while dragging based on mouse movement
            const vx = mouseSpeed.current.x * 0.8;
            const vy = mouseSpeed.current.y * 0.8;

            return {
              ...item,
              x: Math.max(0, Math.min(dimensions.width - item.w, nextX)),
              y: Math.max(0, Math.min(dimensions.height - item.h, nextY)),
              vx,
              vy
            };
          }

          // Apply physics
          let nextVy = (item.vy + gravity) * friction;
          let nextVx = item.vx * friction;
          let nextX = item.x + nextVx;
          let nextY = item.y + nextVy;

          // Wall Collisions
          // Floor bounce
          if (nextY + item.h >= dimensions.height) {
            nextY = dimensions.height - item.h;
            nextVy = -nextVy * bounce;
            if (Math.abs(nextVy) < 1.0) nextVy = 0; // stop micro bouncing
            // friction on floor
            nextVx *= 0.8;
          }
          // Ceiling bounce
          else if (nextY <= 0) {
            nextY = 0;
            nextVy = -nextVy * bounce;
          }

          // Left wall
          if (nextX <= 0) {
            nextX = 0;
            nextVx = -nextVx * bounce;
          }
          // Right wall
          else if (nextX + item.w >= dimensions.width) {
            nextX = dimensions.width - item.w;
            nextVx = -nextVx * bounce;
          }

          // Check snapping target
          const target = sockets[item.id];
          const distanceX = Math.abs(nextX - target.x);
          const distanceY = Math.abs(nextY - target.y);

          // If within snapping distance, snap to socket!
          if (distanceX < 35 && distanceY < 35) {
            audio.playSuccess();
            addLog(`[SUCCESS] UI component '${item.name}' re-docked and locked.`, 'system');
            
            return {
              ...item,
              x: target.x,
              y: target.y,
              vx: 0,
              vy: 0,
              snapped: true
            };
          }

          return {
            ...item,
            x: nextX,
            y: nextY,
            vx: nextVx,
            vy: nextVy
          };
        });

        // Check if everyone snapped
        const snapCount = updated.filter(i => i.snapped).length;
        if (snapCount === prevItems.length) {
          // Solved!
          setTimeout(() => {
            onSyncComplete();
          }, 800);
        }

        return updated;
      });

      // Calculate mouse speed
      mouseSpeed.current = {
        x: mousePos.current.x - lastMousePos.current.x,
        y: mousePos.current.y - lastMousePos.current.y
      };
      lastMousePos.current = { ...mousePos.current };

      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, onSyncComplete]);

  // Mouse / Pointer Event handlers
  const handlePointerDown = (item, e) => {
    if (item.snapped) return;
    audio.playClick();
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    draggedItemId.current = item.id;
    dragOffset.current = {
      x: clientX - item.x,
      y: clientY - item.y
    };
    mousePos.current = { x: clientX, y: clientY };
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (e) => {
    if (!draggedItemId.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    mousePos.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    if (draggedItemId.current) {
      audio.playSelect();
    }
    draggedItemId.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className="physics-ui-container"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'radial-gradient(circle, rgba(12, 12, 28, 0.98) 0%, rgba(3, 3, 6, 0.99) 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Dynamic background alert HUD */}
      <div style={{ position: 'absolute', width: '100%', top: '30px', textAlign: 'center', fontFamily: 'Orbitron, sans-serif' }}>
        <h2 className="glitch-red" style={{ color: 'var(--neon-magenta)', fontSize: '1.8rem', letterSpacing: '3px' }}>
          CRITICAL INTEGRITY BREAKDOWN
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '6px' }}>
          GRAVITY RULE COMPROMISED. MANUALLY DRAG COMPONENTS TO COGNITIVE SOCKETS TO SYNCHRONIZE SYSTEMS
        </p>
      </div>

      {/* Holographic targets sockets */}
      {Object.entries(sockets).map(([key, sock]) => {
        const componentSnapped = items.find(i => i.id === key)?.snapped;
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: `${sock.x}px`,
              top: `${sock.y}px`,
              width: `${sock.w}px`,
              height: `${sock.h}px`,
              border: `2px dashed ${componentSnapped ? 'var(--neon-green)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: '12px',
              background: componentSnapped ? 'rgba(57, 255, 20, 0.04)' : 'rgba(255, 255, 255, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              zIndex: 10
            }}
          >
            {!componentSnapped && (
              <>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', color: '#64748b', letterSpacing: '1px', textShadow: 'none' }}>
                  {sock.label}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#475569', marginTop: '4px' }}>
                  SNAP REPLICA HERE
                </div>
              </>
            )}
            {componentSnapped && (
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>
                ✓ SYSTEM LOCKED
              </div>
            )}
          </div>
        );
      })}

      {/* Draggable physical rigid elements */}
      {items.map(item => {
        const isDragged = draggedItemId.current === item.id;
        
        return (
          <div
            key={item.id}
            onPointerDown={(e) => handlePointerDown(item, e)}
            style={{
              position: 'absolute',
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: `${item.w}px`,
              height: `${item.h}px`,
              background: 'var(--bg-panel-solid)',
              border: `2px solid ${item.snapped ? 'var(--neon-green)' : item.color}`,
              borderRadius: '12px',
              padding: '16px',
              boxShadow: item.snapped 
                ? '0 0 15px rgba(57, 255, 20, 0.25)' 
                : isDragged 
                  ? `0 15px 35px ${item.glowColor}, 0 0 15px ${item.glowColor}` 
                  : `0 4px 15px rgba(0, 0, 0, 0.6)`,
              cursor: item.snapped ? 'default' : isDragged ? 'grabbing' : 'grab',
              display: 'flex',
              flexDirection: 'column',
              zIndex: isDragged ? 100 : item.snapped ? 5 : 50,
              transform: isDragged ? 'scale(1.02)' : 'scale(1)',
              transition: isDragged ? 'box-shadow 0.15s, transform 0.15s' : 'none'
            }}
          >
            {/* Element Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: 'bold', color: item.snapped ? 'var(--neon-green)' : '#cbd5e1' }}>
                {item.name}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: item.snapped ? 'var(--neon-green)' : item.color }}>
                {item.snapped ? 'CONNECTED' : isDragged ? 'DRAGGING' : 'OFFLINE'}
              </span>
            </div>

            {/* Inner Content Previews */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {item.id === 'core' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>
                    99.990%
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#000', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ width: '99.9%', height: '100%', background: 'linear-gradient(90deg, #ff0055, #00f0ff)' }} />
                  </div>
                </div>
              )}

              {item.id === 'files' && (
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>📁 bin/gravity_constant.cfg ... <span style={{ color: 'var(--neon-green)' }}>OK</span></div>
                  <div>📁 src/checksum.db .......... <span style={{ color: 'var(--neon-green)' }}>OK</span></div>
                  <div>📁 diagnostics/debugger.exe . <span style={{ color: 'var(--neon-green)' }}>OK</span></div>
                </div>
              )}

              {item.id === 'logs' && (
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--neon-magenta)', display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.85 }}>
                  <div>[WARN] INTERFACE ANCHOR SECTOR 1 FAILED.</div>
                  <div>[WARN] CRITICAL PHYSICAL ENGINE TRIGGER.</div>
                  <div>[INFO] REDOCK COMPONENT MODULES NOW.</div>
                </div>
              )}
            </div>
            
            {/* Grab dots indicator */}
            {!item.snapped && (
              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '8px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#475569' }} />
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#475569' }} />
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#475569' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
