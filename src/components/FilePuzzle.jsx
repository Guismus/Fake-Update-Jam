import React, { useState, useEffect } from 'react';
import { audio } from '../audio';

// Grid configurations for Node Wiring
// Types: 'straight' (|-), 'bend' (|_), 'cross' (+), 'blank'
// Rotations: 0, 90, 180, 270 degrees
const INITIAL_WIRE_GRID = [
  { r: 0, c: 0, type: 'source', rot: 0 },
  { r: 0, c: 1, type: 'bend', rot: 90 },
  { r: 0, c: 2, type: 'straight', rot: 0 },
  { r: 0, c: 3, type: 'bend', rot: 180 },
  
  { r: 1, c: 0, type: 'straight', rot: 90 },
  { r: 1, c: 1, type: 'bend', rot: 0 },
  { r: 1, c: 2, type: 'cross', rot: 0 },
  { r: 1, c: 3, type: 'straight', rot: 90 },
  
  { r: 2, c: 0, type: 'bend', rot: 270 },
  { r: 2, c: 1, type: 'bend', rot: 0 },
  { r: 2, c: 2, type: 'bend', rot: 90 },
  { r: 2, c: 3, type: 'bend', rot: 0 },
  
  { r: 3, c: 0, type: 'straight', rot: 90 },
  { r: 3, c: 1, type: 'bend', rot: 270 },
  { r: 3, c: 2, type: 'straight', rot: 0 },
  { r: 3, c: 3, type: 'sink', rot: 0 }
];

export default function FilePuzzle({
  repairedFiles,
  onRepairSuccess,
  onLaunchDebugger,
  addLog,
  progress
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Node wiring state
  const [wireGrid, setWireGrid] = useState([]);
  const [activePaths, setActivePaths] = useState(new Set());
  const [isWiringSolved, setIsWiringSolved] = useState(false);

  // Bit flipper state (Lights out variant: flipping i flips i-1, i, i+1)
  const [bits, setBits] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const TARGET_VALUE = 172; // Hex: 0xAC, Binary: 10101100
  const [currentVal, setCurrentVal] = useState(0);

  // File tree nodes hierarchy
  const files = [
    { id: 'gravity', name: 'gravity_constant.cfg', dir: '/bin', type: 'config', corrupted: !repairedFiles.gravity },
    { id: 'registry', name: 'checksum.db', dir: '/src', type: 'database', corrupted: !repairedFiles.registry },
    { id: 'debugger', name: 'debugger.exe', dir: '/diagnostics', type: 'executable', corrupted: false }
  ];

  // Initialize grids on select
  useEffect(() => {
    if (selectedFile === 'gravity') {
      // Deep copy initial wire grid and reset solve
      setWireGrid(JSON.parse(JSON.stringify(INITIAL_WIRE_GRID)));
      setIsWiringSolved(false);
    } else if (selectedFile === 'registry') {
      // Reset bits
      setBits([0, 0, 0, 0, 0, 0, 0, 0]);
      setCurrentVal(0);
    }
  }, [selectedFile]);

  // Recalculate wiring connections path whenever grid changes
  useEffect(() => {
    if (selectedFile !== 'gravity' || wireGrid.length === 0) return;
    
    // Solve paths starting from (0,0) (Source) to (3,3) (Sink)
    const size = 4;
    const gridMap = {};
    wireGrid.forEach(cell => {
      gridMap[`${cell.r},${cell.c}`] = cell;
    });

    const getConnections = (cell) => {
      const rot = cell.rot;
      const t = cell.type;
      
      // Standard connections for rot = 0
      // directions: 0 = up, 1 = right, 2 = down, 3 = left
      let base = [];
      if (t === 'source') base = [1]; // connects right
      else if (t === 'sink') base = [3]; // connects left
      else if (t === 'straight') base = [1, 3]; // left-right
      else if (t === 'cross') base = [0, 1, 2, 3]; // all
      else if (t === 'bend') base = [2, 1]; // bottom-right bend (L-shape)
      
      // Rotate connections
      // (dir + rot/90) % 4
      const shift = Math.floor(rot / 90);
      return base.map(dir => (dir + shift) % 4);
    };

    const connected = new Set();
    const queue = ['0,0'];
    connected.add('0,0');

    while (queue.length > 0) {
      const currentKey = queue.shift();
      const currentCell = gridMap[currentKey];
      if (!currentCell) continue;

      const [cr, cc] = currentKey.split(',').map(Number);
      const currentDirs = getConnections(currentCell);

      // Check neighbors: Up, Right, Down, Left
      const neighbors = [
        { r: cr - 1, c: cc, dir: 0, opp: 2 },
        { r: cr, c: cc + 1, dir: 1, opp: 3 },
        { r: cr + 1, c: cc, dir: 2, opp: 0 },
        { r: cr, c: cc - 1, dir: 3, opp: 1 }
      ];

      neighbors.forEach(n => {
        if (n.r < 0 || n.r >= size || n.c < 0 || n.c >= size) return;
        const neighborKey = `${n.r},${n.c}`;
        if (connected.has(neighborKey)) return;

        const neighborCell = gridMap[neighborKey];
        if (!neighborCell) return;

        const neighborDirs = getConnections(neighborCell);
        
        // If current cell connects in neighbor direction,
        // and neighbor cell connects back in opposite direction, they are wired
        if (currentDirs.includes(n.dir) && neighborDirs.includes(n.opp)) {
          connected.add(neighborKey);
          queue.push(neighborKey);
        }
      });
    }

    setActivePaths(connected);

    // Check if Sink (3,3) is connected
    if (connected.has('3,3')) {
      setIsWiringSolved(true);
      setTimeout(() => {
        onRepairSuccess('gravity');
        addLog("[SUCCESS] Gravity configuration file integrity check passed.", "system");
        audio.playSuccess();
      }, 800);
    }
  }, [wireGrid, selectedFile]);

  // Recalculate register value in bit flipper
  useEffect(() => {
    if (selectedFile !== 'registry') return;
    
    // Calculate current binary register value (bit 0 is MSB, bit 7 is LSB)
    const val = bits.reduce((acc, bit, idx) => acc + bit * Math.pow(2, 7 - idx), 0);
    setCurrentVal(val);

    if (val === TARGET_VALUE) {
      setTimeout(() => {
        onRepairSuccess('registry');
        addLog("[SUCCESS] Database checksum registry matches master keys.", "system");
        audio.playSuccess();
      }, 800);
    }
  }, [bits, selectedFile]);

  // Click handler for wire rotation
  const handleRotateWire = (index) => {
    if (isWiringSolved) return;
    audio.playClick();
    
    setWireGrid(prev => prev.map((cell, idx) => {
      if (idx !== index) return cell;
      if (cell.type === 'source' || cell.type === 'sink') return cell;
      return { ...cell, rot: (cell.rot + 90) % 360 };
    }));
  };

  // Click handler for bit toggle with adjacent coupling (linear Lights Out)
  const handleToggleBit = (index) => {
    if (currentVal === TARGET_VALUE) return;
    audio.playClick();

    setBits(prev => {
      const next = [...prev];
      // Toggle self
      next[index] = next[index] === 0 ? 1 : 0;
      // Toggle left
      if (index > 0) next[index - 1] = next[index - 1] === 0 ? 1 : 0;
      // Toggle right
      if (index < 7) next[index + 1] = next[index + 1] === 0 ? 1 : 0;
      return next;
    });
  };

  // SVG drawing helpers for wiring nodes
  const renderWirePathSVG = (cell) => {
    const t = cell.type;
    
    if (t === 'source') {
      return (
        <svg className="wire-svg" viewBox="0 0 100 100">
          <circle cx="20" cy="50" r="10" fill="var(--neon-green)" />
          <path d="M 20 50 L 100 50" className="wire-line" />
        </svg>
      );
    }
    
    if (t === 'sink') {
      return (
        <svg className="wire-svg" viewBox="0 0 100 100">
          <circle cx="80" cy="50" r="10" fill="var(--neon-magenta)" />
          <path d="M 0 50 L 80 50" className="wire-line" />
        </svg>
      );
    }
    
    if (t === 'straight') {
      return (
        <svg className="wire-svg" viewBox="0 0 100 100">
          <path d="M 0 50 L 100 50" className="wire-line" />
        </svg>
      );
    }
    
    if (t === 'bend') {
      return (
        <svg className="wire-svg" viewBox="0 0 100 100">
          <path d="M 50 100 L 50 50 L 100 50" className="wire-line" />
        </svg>
      );
    }
    
    if (t === 'cross') {
      return (
        <svg className="wire-svg" viewBox="0 0 100 100">
          <path d="M 0 50 L 100 50" className="wire-line" />
          <path d="M 50 0 L 50 100" className="wire-line" />
        </svg>
      );
    }

    return null;
  };

  return (
    <div className="file-explorer">
      {/* Sidebar: Navigation directories */}
      <div className="explorer-tree">
        <div style={{ padding: '0 8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
          LOCAL SYSTEM FILES
        </div>
        
        {/* /bin folder */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, padding: '4px' }}>
            <span style={{ color: 'var(--neon-cyan)' }}>📁</span> bin
          </div>
          <div className="tree-node">
            {files.filter(f => f.dir === '/bin').map(f => (
              <div 
                key={f.id} 
                className={`node-row ${selectedFile === f.id ? 'selected' : ''} ${f.corrupted ? 'corrupted' : 'repaired'}`}
                onClick={() => { audio.playSelect(); setSelectedFile(f.id); }}
              >
                <span>{f.corrupted ? '⚙️' : '✅'}</span>
                <span>{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* /src folder */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, padding: '4px' }}>
            <span style={{ color: 'var(--neon-cyan)' }}>📁</span> src
          </div>
          <div className="tree-node">
            {files.filter(f => f.dir === '/src').map(f => (
              <div 
                key={f.id} 
                className={`node-row ${selectedFile === f.id ? 'selected' : ''} ${f.corrupted ? 'corrupted' : 'repaired'}`}
                onClick={() => { audio.playSelect(); setSelectedFile(f.id); }}
              >
                <span>{f.corrupted ? '⚙️' : '✅'}</span>
                <span>{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* /diagnostics folder */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, padding: '4px' }}>
            <span style={{ color: 'var(--neon-cyan)' }}>📁</span> diagnostics
          </div>
          <div className="tree-node">
            {files.filter(f => f.dir === '/diagnostics').map(f => (
              <div 
                key={f.id} 
                className={`node-row ${selectedFile === f.id ? 'selected' : ''} repaired`}
                onClick={() => { audio.playSelect(); setSelectedFile(f.id); }}
              >
                <span>🚀</span>
                <span>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main detail page */}
      <div className="file-content-view">
        {selectedFile ? (
          <>
            <div className="file-header">
              <span className="file-name">
                {files.find(f => f.id === selectedFile)?.dir}/
                {files.find(f => f.id === selectedFile)?.name}
              </span>
              <span className="version-badge">
                {selectedFile === 'debugger' ? 'SYSTEM' : repairedFiles[selectedFile] ? 'OK' : 'CORRUPTED'}
              </span>
            </div>

            <div className="file-puzzle-area">
              {/* 1. Gravity File: Memory Reflector Puzzle */}
              {selectedFile === 'gravity' && (
                repairedFiles.gravity ? (
                  <div style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-green)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✓</div>
                    <h3>ANTI-GRAVITY ENGINES LOADED</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '10px' }}>
                      Checksum calibrated. Constant set to <code>9.80665 m/s²</code>.<br/>
                      Transmission integrity stabilized at 100%.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <h4 style={{ color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>MEMORY REFLECTOR ARRAY</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Click nodes to rotate. Connect the green INPUT node to the red OUTPUT node.
                      </p>
                    </div>

                    <div 
                      className="node-grid-board" 
                      style={{ gridTemplateColumns: 'repeat(4, 54px)', gridTemplateRows: 'repeat(4, 54px)' }}
                    >
                      {wireGrid.map((cell, idx) => {
                        const isConnected = activePaths.has(`${cell.r},${cell.c}`);
                        return (
                          <div 
                            key={idx}
                            className={`wire-node-cell ${isConnected ? 'active-path' : ''} ${cell.type === 'source' ? 'source' : ''} ${cell.type === 'sink' ? 'sink' : ''} ${cell.type === 'sink' && isWiringSolved ? 'connected' : ''}`}
                            onClick={() => handleRotateWire(idx)}
                          >
                            <div 
                              className="wire-element" 
                              style={{ transform: `rotate(${cell.rot}deg)` }}
                            >
                              {renderWirePathSVG(cell)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              {/* 2. Registry File: Bit Flipper Lights Out Puzzle */}
              {selectedFile === 'registry' && (
                repairedFiles.registry ? (
                  <div style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-green)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✓</div>
                    <h3>CHECKSUM REGISTRY RESTORED</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '10px' }}>
                      Hex code match: <code>0xAD</code>.<br/>
                      Checksum registry synced. Database connection active.
                    </p>
                  </div>
                ) : (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>BIT-FLIP HEX REGISTRY</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Flip bits to match target value. Flipping a bit also toggles its adjacent neighbors.
                      </p>
                    </div>

                    <div className="register-board">
                      <div className="bit-row">
                        <span className="bit-row-label">TARGET HASH:</span>
                        <span className="bit-row-value target">
                          {TARGET_VALUE} (0x{TARGET_VALUE.toString(16).toUpperCase()})
                        </span>
                      </div>

                      <div className="bit-row">
                        <span className="bit-row-label">CURRENT VALUE:</span>
                        <span className={`bit-row-value current ${currentVal === TARGET_VALUE ? 'matched' : ''}`}>
                          {currentVal} (0x{currentVal.toString(16).toUpperCase()})
                        </span>
                      </div>

                      {/* Display current byte in bits */}
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>
                        {bits.map((_, idx) => (
                          <div key={idx} style={{ width: '38px', textAlign: 'center' }}>
                            {Math.pow(2, 7 - idx)}
                          </div>
                        ))}
                      </div>

                      <div className="bit-buttons-container">
                        {bits.map((bit, idx) => (
                          <button
                            key={idx}
                            className={`bit-btn ${bit === 1 ? 'active-one' : ''}`}
                            onClick={() => handleToggleBit(idx)}
                          >
                            {bit}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* 3. Debugger File: Action trigger */}
              {selectedFile === 'debugger' && (
                <div style={{ textAlign: 'center', padding: '20px', maxWidth: '400px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚀</div>
                  <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-cyan)', marginBottom: '8px' }}>
                    DEBUGGER INSTRUMENT
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '24px' }}>
                    This debugger tools bypasses server transmissions to directly extract remaining data packets from within the progress bar.
                  </p>
                  
                  {progress < 99.97 ? (
                    <div style={{ background: 'rgba(255, 0, 85, 0.08)', border: '1px solid var(--border-magenta)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--neon-magenta)' }}>
                      <strong>ERROR: System Access Blocked.</strong><br/>
                      Please solve core file corruptions in <code>/bin</code> and <code>/src</code> before running debugger tool.
                    </div>
                  ) : (
                    <button 
                      className="btn-neon"
                      onClick={() => {
                        audio.playSelect();
                        onLaunchDebugger();
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.022-3.217a.75.75 0 01.077 1.057l-5.25 6a.75.75 0 01-1.076.006l-3-3a.75.75 0 111.06-1.06l2.462 2.47 4.77-5.45a.75.75 0 011.057-.076z" clipRule="evenodd" />
                      </svg>
                      RUN DEBUGGER.EXE
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📁</span>
            SELECT A SYSTEM FILE FROM THE DIRECTORY TREE<br/>
            TO SCAN AND EDIT INTEGRITY
          </div>
        )}
      </div>
    </div>
  );
}
