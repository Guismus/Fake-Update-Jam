import React, { useState, useEffect } from 'react';
import { audio } from './audio';
import LauncherPanel from './components/LauncherPanel';
import FilePuzzle from './components/FilePuzzle';
import SettingsPanel from './components/SettingsPanel';
import ProgressBarGame from './components/ProgressBarGame';
import PhysicsUI from './components/PhysicsUI';

const DEFAULT_LOGS = [
  { text: '[INFO] Launching Chronos Shift updater system...', type: 'info' },
  { text: '[INFO] Connection handshake: SUCCESS (Port 4280)', type: 'info' },
  { text: '[INFO] Manifest load: OK. Patch size: 42.89 GB', type: 'info' },
  { text: '[INFO] Verifying files index...', type: 'info' },
  { text: '[INFO] Downloading block segment 4290/4300...', type: 'info' }
];

export default function App() {
  // Application routing / state
  const [currentTab, setTab] = useState('dashboard');
  const [phase, setPhase] = useState(() => {
    return localStorage.getItem('cs_phase') || 'boot';
  });
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('cs_progress');
    return saved ? parseFloat(saved) : 99.900;
  });
  const [repairedFiles, setRepairedFiles] = useState(() => {
    const saved = localStorage.getItem('cs_repaired');
    return saved ? JSON.parse(saved) : { gravity: false, registry: false };
  });
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('cs_logs');
    return saved ? JSON.parse(saved) : DEFAULT_LOGS;
  });

  // Settings
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [chromaticEnabled, setChromaticEnabled] = useState(true);
  const [muted, setMuted] = useState(false);

  // Layout action overlays
  const [debuggerActive, setDebuggerActive] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);

  // Boot sequence loading log lines
  const [bootLines, setBootLines] = useState([]);
  const BOOT_SEQUENCE = [
    { text: 'CHRONOS BIOS v4.81 (C) 2026 CHRONOS LABS', type: 'system' },
    { text: 'CPU: Temporal Vector Core x8 @ 3.4GHz', type: 'system' },
    { text: 'RAM: 64GB Spacetime Register Memory', type: 'system' },
    { text: 'STORAGE: Local SSD Partition /dev/sda1 (Ext4)', type: 'system' },
    { text: 'STATUS: Mounting file systems... OK', type: 'system' },
    { text: 'NETWORK: Binding websocket daemon... PORT 4280', type: 'system' },
    { text: 'LAUNCHER: Initializing Chronos Shift v0.9.0 Launcher...', type: 'info' },
    { text: '[ERROR] CRITICAL EXCEPTION IN DATALINK MANIFEST CHECKSUM.', type: 'error' },
    { text: '[ERROR] Block 4299 failed matching validation keys.', type: 'error' },
    { text: '[WARN] Installation suspended. Awaiting cognitive repair.', type: 'warning' }
  ];

  // Sync state changes with local storage
  useEffect(() => {
    localStorage.setItem('cs_phase', phase);
    localStorage.setItem('cs_progress', progress.toString());
    localStorage.setItem('cs_repaired', JSON.stringify(repairedFiles));
    localStorage.setItem('cs_logs', JSON.stringify(logs));
  }, [phase, progress, repairedFiles, logs]);

  // Synchronize audio synthesizer glitch level based on progress/phase
  useEffect(() => {
    if (muted) {
      audio.setMuted(true);
      return;
    }
    
    audio.setMuted(false);
    if (phase === 'completed') {
      audio.setGlitchIntensity(0);
    } else if (phase === 'physics') {
      audio.setGlitchIntensity(1.0);
    } else if (phase === 'glitched') {
      audio.setGlitchIntensity(0.7);
    } else {
      // In normal phase, increment glitch severity slightly if one file is repaired
      const repairs = (repairedFiles.gravity ? 0.2 : 0) + (repairedFiles.registry ? 0.2 : 0);
      audio.setGlitchIntensity(repairs);
    }
  }, [phase, repairedFiles, muted]);

  // Start background loop on user click / focus
  useEffect(() => {
    const handleInitAudio = () => {
      audio.init();
      window.removeEventListener('pointerdown', handleInitAudio);
    };
    window.addEventListener('pointerdown', handleInitAudio);
    return () => window.removeEventListener('pointerdown', handleInitAudio);
  }, []);

  // Boot cinematic lines runner
  useEffect(() => {
    if (phase !== 'boot') return;
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < BOOT_SEQUENCE.length) {
        audio.playClick();
        setBootLines(prev => [...prev, BOOT_SEQUENCE[index]]);
        index++;
      } else {
        clearInterval(interval);
        // Completed boot sequence, shift to dashboard
        setTimeout(() => {
          setPhase('normal');
          audio.playSelect();
        }, 1200);
      }
    }, 350);

    return () => clearInterval(interval);
  }, [phase]);

  // Add line to system logs console helper
  const addLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [...prev, { text: `[${time}] ${text}`, type }]);
  };

  // Callback when a puzzle is successfully solved
  const handleRepairSuccess = (fileId) => {
    setRepairedFiles(prev => {
      const next = { ...prev, [fileId]: true };
      
      // Calculate progress jumps
      let nextProgress = 99.900;
      if (next.gravity && !next.registry) {
        nextProgress = 99.930;
        addLog(`[SYSTEM] Anti-gravity constant index updated. Package connection adjusted.`, 'system');
      } else if (!next.gravity && next.registry) {
        nextProgress = 99.940;
        addLog(`[SYSTEM] Registry indexes restored. Checksums cleared.`, 'system');
      } else if (next.gravity && next.registry) {
        nextProgress = 99.970;
        addLog(`[SYSTEM] File registries synced. Access bypass unlocked.`, 'system');
      }

      setProgress(nextProgress);
      return next;
    });
  };

  // Start Progress bar game
  const handleLaunchDebugger = () => {
    setDebuggerActive(true);
    setPhase('glitched');
    addLog(`[SYSTEM] Debugger active. Injecting drone into progress bar channel...`, 'info');
  };

  // Callback on progress tick from progress bar game
  const handleProgressTick = (amount) => {
    setProgress(prev => {
      // Clamp between 99.970 and 99.990
      const next = Math.max(99.970, Math.min(99.990, prev + amount));
      return next;
    });
  };

  // Trigger phase 3 UI Element Collapse
  const handleTriggerCollapse = () => {
    setDebuggerActive(false);
    setPhase('physics');
    setShaking(true);
    setTimeout(() => setShaking(false), 800);
    audio.playError();
    addLog(`[FATAL] CRITICAL MEMORY FAULT. LAUNCHER USER INTERFACE COLLAPSED.`, 'error');
  };

  // Phase 4 solved: Reassembly completes
  const handleSyncComplete = () => {
    setPhase('completed');
    setProgress(100.000);
    setVictoryModal(true);
    audio.playSuccess();
    addLog(`[SYSTEM] Layout structure locked. Sync completed. Chronos Shift is active.`, 'system');
  };

  // Settings: Reset all game state back to zero
  const handleResetProgress = () => {
    localStorage.removeItem('cs_phase');
    localStorage.removeItem('cs_progress');
    localStorage.removeItem('cs_repaired');
    localStorage.removeItem('cs_logs');
    
    setPhase('boot');
    setBootLines([]);
    setProgress(99.900);
    setRepairedFiles({ gravity: false, registry: false });
    setLogs(DEFAULT_LOGS);
    setTab('dashboard');
    setDebuggerActive(false);
    setVictoryModal(false);
    addLog(`[SYSTEM] Launcher configurations cleared. Rebooting installer...`, 'info');
  };

  return (
    <div className={`app-container ${shaking ? 'shaking' : ''} ${chromaticEnabled && phase === 'glitched' ? 'chromatic' : ''}`}>
      {/* CRT scanline display filter */}
      {crtEnabled && <div className="crt-overlay" />}

      {/* BOOT LOADING CINEMATIC */}
      {phase === 'boot' && (
        <div className="boot-screen">
          <div className="boot-terminal-text">
            {bootLines.map((line, idx) => (
              <div key={idx} className={`log-line ${line.type}`} style={{ color: line.type === 'error' ? 'var(--neon-magenta)' : 'var(--neon-green)', textShadow: line.type === 'error' ? '0 0 4px rgba(255, 0, 85, 0.4)' : '0 0 4px rgba(57, 255, 20, 0.4)' }}>
                {line.text}
              </div>
            ))}
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="status-dot" style={{ animation: 'blink 0.5s infinite alternate' }} />
              <span style={{ color: 'var(--text-muted)' }}>INITIALIZING INTERFACE DAEMON...</span>
            </div>
          </div>
          <button 
            className="btn-neon" 
            style={{ position: 'absolute', bottom: '40px', right: '40px', padding: '8px 16px', fontSize: '0.8rem' }}
            onClick={() => { setPhase('normal'); audio.playSelect(); }}
          >
            SKIP SYSTEM BOOT
          </button>
        </div>
      )}

      {/* PHYSICAL UI COLLAPSE PHASE (v1.0.0 UI Collapse) */}
      {phase === 'physics' && (
        <PhysicsUI 
          onSyncComplete={handleSyncComplete} 
          addLog={addLog}
        />
      )}

      {/* NORMAL / GLITCHED / COMPLETED ACTIVE LAUNCHER LAYOUT */}
      {phase !== 'boot' && phase !== 'physics' && (
        <>
          {/* Header Top Bar */}
          <div className="top-bar">
            <div className="brand-section">
              <svg className="brand-logo" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="brand-title">Chronos Launcher</span>
              <span className={`version-badge ${phase === 'glitched' ? 'glitched' : ''}`}>
                {phase === 'completed' ? 'v1.1.0 Released' : phase === 'glitched' ? 'v0.9.5 GLITCHED' : 'v0.9.0 Beta'}
              </span>
            </div>
            
            <div className="system-status">
              <div className={`status-indicator ${progress < 100 ? 'error' : ''}`}>
                <span className="status-dot" />
                <span>{progress >= 100 ? 'SYS_ONLINE' : 'STALLED_DOWNLOAD'}</span>
              </div>
            </div>
          </div>

          <div className="main-layout">
            {/* Navigation Sidebar */}
            <div className="sidebar">
              <button 
                className={`nav-button ${currentTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { audio.playSelect(); setTab('dashboard'); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                Dashboard
              </button>

              <button 
                className={`nav-button ${currentTab === 'files' ? 'active' : ''}`}
                onClick={() => { audio.playSelect(); setTab('files'); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-19.5 0A2.25 2.25 0 004.5 15h15a2.25 2.25 0 002.25-2.25m-19.5 0v.25A2.25 2.25 0 004.5 18h15a2.25 2.25 0 002.25-2.25v-.25m-19.5 0V12a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 12v.75m-18 0h18" />
                </svg>
                Local Files
                {Object.values(repairedFiles).some(f => !f) && (
                  <span style={{ width: '6px', height: '6px', background: 'var(--neon-magenta)', borderRadius: '50%', marginLeft: 'auto', boxShadow: '0 0 5px var(--neon-magenta)' }} />
                )}
              </button>

              <button 
                className={`nav-button ${currentTab === 'settings' ? 'active' : ''}`}
                onClick={() => { audio.playSelect(); setTab('settings'); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                </svg>
                Settings
              </button>

              <div style={{ marginTop: 'auto', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>CPU TEMP: 43°C</div>
                <div>WS_CONN: ALIVE</div>
                <div>MEM_STACK: OK</div>
              </div>
            </div>

            {/* Display Routing Panel */}
            <div className="content-area">
              {currentTab === 'dashboard' && (
                <LauncherPanel 
                  progress={progress} 
                  phase={phase}
                  repairedFiles={repairedFiles}
                  logs={logs}
                  onStartRepair={() => setTab('files')}
                  onLaunchDebugger={handleLaunchDebugger}
                  addLog={addLog}
                  setTab={setTab}
                />
              )}

              {currentTab === 'files' && (
                <FilePuzzle 
                  repairedFiles={repairedFiles}
                  onRepairSuccess={handleRepairSuccess}
                  onLaunchDebugger={handleLaunchDebugger}
                  addLog={addLog}
                  progress={progress}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPanel 
                  crtEnabled={crtEnabled}
                  setCrtEnabled={setCrtEnabled}
                  chromaticEnabled={chromaticEnabled}
                  setChromaticEnabled={setChromaticEnabled}
                  muted={muted}
                  setMuted={setMuted}
                  onResetProgress={handleResetProgress}
                />
              )}
            </div>
          </div>

          {/* ACTIVE PROGRESS BAR DRONE OVERLAY */}
          {debuggerActive && (
            <ProgressBarGame 
              progress={progress}
              phase={phase}
              onProgressTick={handleProgressTick}
              onTriggerCollapse={handleTriggerCollapse}
              onClose={() => {
                audio.playSelect();
                setDebuggerActive(false);
                setPhase('normal');
                addLog(`[SYSTEM] Debugger terminated by user.`, 'warning');
              }}
              addLog={addLog}
              setGlitchLevel={setShaking}
            />
          )}

          {/* LAUNCHER COMPLETE SUCCESS MODAL */}
          {victoryModal && (
            <div className="modal-overlay" style={{ zIndex: 2000 }}>
              <div className="modal-card success-card">
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💎</div>
                <h2 className="modal-title" style={{ color: 'var(--neon-green)', textShadow: '0 0 10px rgba(57, 255, 20, 0.4)', marginBottom: '15px' }}>
                  CHRONOS SHIFT SYNCHRONIZED
                </h2>
                <p className="modal-text">
                  All installation components have successfully bound together. Sector registers verified at 100.00%. The system clock loop is locked.<br/>
                  Thank you for saving the timeline from the stalled patch.
                </p>
                <button 
                  className="btn-neon" 
                  onClick={() => {
                    audio.playSelect();
                    setVictoryModal(false);
                  }}
                >
                  ENTER CHRONOS SHIFT
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
