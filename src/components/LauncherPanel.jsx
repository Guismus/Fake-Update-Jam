import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';

export default function LauncherPanel({
  progress,
  phase,
  repairedFiles,
  logs,
  onStartRepair,
  onLaunchDebugger,
  addLog,
  setTab,
  onLaunchGame
}) {
  const canvasRef = useRef(null);
  const [speedHistory, setSpeedHistory] = useState(Array(30).fill(0));
  
  // Stalled and error flags
  const isStalled = progress < 100;
  
  // Calculate display progress
  const displayProgress = progress.toFixed(3);

  // Network speed graph loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const renderGraph = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 15) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw Speed Line
      ctx.beginPath();
      ctx.strokeStyle = phase === 'glitched' ? '#ff0055' : '#00f0ff';
      ctx.lineWidth = 2;
      
      const step = canvas.width / (speedHistory.length - 1);
      speedHistory.forEach((val, idx) => {
        // Map speed to canvas height
        const maxVal = 25; // max MB/s
        const y = canvas.height - (val / maxVal) * (canvas.height - 10) - 5;
        const x = idx * step;
        
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Shadow under graph line
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, phase === 'glitched' ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 240, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      animationId = requestAnimationFrame(renderGraph);
    };

    renderGraph();
    return () => cancelAnimationFrame(animationId);
  }, [speedHistory, phase]);

  // Feed speed graph
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeedHistory((prev) => {
        const next = [...prev.slice(1)];
        let newSpeed = 0;
        
        if (progress >= 100) {
          newSpeed = 0;
        } else if (phase === 'normal') {
          // Drops to zero and fluctuates weakly
          newSpeed = Math.random() < 0.8 ? 0 : Math.random() * 0.5;
        } else if (phase === 'glitched') {
          // Erratic bursts of corrupted speeds
          newSpeed = Math.random() * 3.5 + (Math.random() < 0.2 ? 15 : 0);
        } else if (phase === 'physics') {
          // Pulsing speeds
          newSpeed = Math.sin(Date.now() / 500) * 2 + 3;
        }
        
        next.push(newSpeed);
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [phase, progress]);

  // Auto-scroll logs
  const logsEndRef = useRef(null);
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle clicking main action button
  const handleActionButton = () => {
    if (progress >= 100) {
      audio.playSuccess();
      if (onLaunchGame) onLaunchGame();
      return;
    }
    
    audio.playError();
    addLog(`[ERROR] Installation cannot resume. Glitch checksum mismatch.`, 'error');
    addLog(`[INFO] Run manual file scan: click 'LOCAL FILES' on the left sidebar.`, 'system');
  };

  // Generate status text
  let statusText = 'Downloading patch files...';
  if (progress >= 100) {
    statusText = 'Installation Complete. Chronos Shift is ready.';
  } else if (phase === 'normal') {
    statusText = 'Update stalled. Connection packet dropped.';
  } else if (phase === 'glitched') {
    statusText = 'WARNING: Glitched bytes detected in directory registry!';
  } else if (phase === 'physics') {
    statusText = 'SYSTEM OVERLOAD: User interface rules collapsing...';
  }

  // Get active speed display
  const currentSpeed = speedHistory[speedHistory.length - 1];
  const speedStr = currentSpeed === 0 ? '0 B/s' : `${currentSpeed.toFixed(1)} MB/s`;

  return (
    <div className="dashboard-grid">
      {/* Main dashboard view */}
      <div className="dashboard-main">
        {/* Sleek banner panel */}
        <div className="hero-banner">
          <div className="hero-logo glitch-text" data-text="CHRONOS SHIFT">
            CHRONOS SHIFT
          </div>
          <div className="hero-tagline">
            {phase === 'glitched' ? 'SYSTEM_INTEGRITY: COMPROMISED (v0.9.5)' : 'THE TIME RIFT ACTION TACTICS GAME (v1.0.0)'}
          </div>
        </div>

        {/* Progress Bar Module */}
        <div className={`panel ${isStalled ? 'glitchy' : ''}`}>
          <div className="update-progress-container">
            <div className="progress-header">
              <span style={{ color: isStalled ? 'var(--neon-magenta)' : 'var(--neon-green)' }}>
                {statusText}
              </span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>
                {displayProgress}%
              </span>
            </div>

            <div className={`progress-bar-outer ${isStalled ? 'error' : ''}`}>
              <div 
                className={`progress-bar-inner ${phase === 'glitched' ? 'glitched' : ''}`}
                style={{ width: `${progress}%` }}
              />
              <div className="progress-text-center">
                {displayProgress}%
              </div>
            </div>

            <div className="progress-details-grid">
              <div>
                <span className="detail-label">SPEED: </span>
                <span className="detail-val" style={{ color: currentSpeed > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)' }}>
                  {speedStr}
                </span>
              </div>
              <div>
                <span className="detail-label">SIZE: </span>
                <span className="detail-val">
                  {progress >= 100 ? '42.89 GB / 42.89 GB' : `${(42.89 * (progress / 100)).toFixed(2)} GB / 42.89 GB`}
                </span>
              </div>
              <div>
                <span className="detail-label">ETA: </span>
                <span className="detail-val" style={{ color: isStalled ? 'var(--neon-magenta)' : 'var(--neon-green)' }}>
                  {progress >= 100 ? 'Finished' : phase === 'normal' ? 'Infinite' : 'Calculating...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Patch Notes */}
        <div className="panel" style={{ flex: 1, minHeight: '180px' }}>
          <div className="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '18px', height: '18px', color: 'var(--neon-cyan)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            System Patch Notes
          </div>
          <div className="notes-list">
            <div className="note-item">
              <strong>v0.9.0 Initial Boot:</strong> Configured installation parameters. Connection established to core mainframe server.
            </div>
            
            {phase === 'normal' && (
              <div className="note-item glitch">
                <strong>[GLITCH CLUE] Connection Stall:</strong> Download stalled at 99.90%. Network diagnostic shows directory structure failure. Core settings in <code>/bin/gravity_constant.cfg</code> is generating out-of-bound checksums. Open <strong>LOCAL FILES</strong> on sidebar to troubleshoot files.
              </div>
            )}

            {repairedFiles.gravity && (
              <div className="note-item">
                <strong>[FIXED] v0.9.1 Gravity:</strong> Anti-gravity constant index restored. Core variables successfully calibrated. Progress advanced to 99.93%.
              </div>
            )}

            {progress >= 99.93 && !repairedFiles.registry && (
              <div className="note-item glitch">
                <strong>[GLITCH CLUE] Registry Corrupted:</strong> Checksum registers in <code>/src/checksum.db</code> are scrambled. System requires manual hexadecimal buffer flipping.
              </div>
            )}

            {repairedFiles.registry && (
              <div className="note-item">
                <strong>[FIXED] v0.9.2 Registry:</strong> Code blocks aligned. System hashes matched. Progress advanced to 99.97%.
              </div>
            )}

            {progress >= 99.97 && (
              <div className="note-item glitch">
                <strong>[GLITCH CLUE] Debugger Bypass:</strong> The remaining 0.03% of the code is trapped behind the transmission buffer. Execute <code>debugger.exe</code> from the **LOCAL FILES** panel (under <code>/diagnostics</code>) to manually collect final data packets inside the progress bar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Speed Graph and Console logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Speed Graph Panel */}
        <div className="panel" style={{ height: '180px', padding: '16px' }}>
          <div className="section-title" style={{ marginBottom: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '18px', height: '18px', color: 'var(--neon-cyan)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Live Bandwidth (MB/s)
          </div>
          <canvas 
            ref={canvasRef} 
            width={280} 
            height={110} 
            className="speed-graph-canvas"
            style={{ width: '100%', height: '110px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}
          />
        </div>

        {/* Logs Console Panel */}
        <div className="panel console-panel" style={{ flex: 1 }}>
          <div className="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '18px', height: '18px', color: 'var(--neon-magenta)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            System Console Logs
          </div>
          <div className="console-output">
            {logs.map((log, idx) => (
              <div key={idx} className={`log-line ${log.type}`}>
                {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Launcher Primary Action Button */}
        <div>
          {progress >= 100 ? (
            <button 
              className="btn-neon"
              style={{ width: '100%', height: '54px', fontSize: '1.1rem' }}
              onClick={handleActionButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
              PLAY GAME
            </button>
          ) : (
            <button 
              className="btn-neon magenta"
              style={{ width: '100%', height: '54px', fontSize: '1.1rem' }}
              onClick={handleActionButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              UPDATE STALLED (99.9%)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
