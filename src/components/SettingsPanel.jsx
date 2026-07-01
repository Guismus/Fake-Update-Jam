import React from 'react';
import { audio } from '../audio';

export default function SettingsPanel({
  crtEnabled,
  setCrtEnabled,
  chromaticEnabled,
  setChromaticEnabled,
  muted,
  setMuted,
  onResetProgress
}) {
  
  const handleMuteToggle = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    audio.setMuted(nextMute);
    audio.playSelect();
  };

  const handleReset = () => {
    audio.playError();
    if (confirm("WARNING: This will wipe your connection index and reset the launcher back to 99.900% progress. Are you sure?")) {
      onResetProgress();
    }
  };

  return (
    <div className="panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="section-title" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '18px', height: '18px', color: 'var(--neon-cyan)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Launcher Configurations
      </div>

      <div className="settings-list">
        {/* Audio Mute toggle */}
        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Synthesizer Soundtrack</span>
            <span className="setting-desc">Toggle the dynamic procedural 8-bit chip music loop.</span>
          </div>
          <label className="switch-control">
            <input 
              type="checkbox" 
              checked={!muted} 
              onChange={handleMuteToggle}
            />
            <span className="slider-knob" />
          </label>
        </div>

        {/* CRT Scanline Filter Toggle */}
        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Scanline Overlay Filter</span>
            <span className="setting-desc">Apply a retro monitor CRT scanline rendering over the UI.</span>
          </div>
          <label className="switch-control">
            <input 
              type="checkbox" 
              checked={crtEnabled} 
              onChange={() => { audio.playSelect(); setCrtEnabled(!crtEnabled); }}
            />
            <span className="slider-knob" />
          </label>
        </div>

        {/* Chromatic aberration toggle */}
        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Chromatic Glitch Splitting</span>
            <span className="setting-desc">Enable red/blue horizontal color misalignment glitch FX.</span>
          </div>
          <label className="switch-control">
            <input 
              type="checkbox" 
              checked={chromaticEnabled} 
              onChange={() => { audio.playSelect(); setChromaticEnabled(!chromaticEnabled); }}
            />
            <span className="slider-knob" />
          </label>
        </div>

        {/* Reset Launcher State */}
        <div className="setting-row" style={{ marginTop: '10px', borderColor: 'rgba(255, 0, 85, 0.15)' }}>
          <div className="setting-meta">
            <span className="setting-title" style={{ color: 'var(--neon-magenta)' }}>Hard Reset Core Files</span>
            <span className="setting-desc">Wipe all repaired files and restart the installation progress.</span>
          </div>
          <button 
            className="btn-neon magenta" 
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            onClick={handleReset}
          >
            RESET PROGRESS
          </button>
        </div>
      </div>
    </div>
  );
}
