import React, { useState } from 'react';
import DiceScene from '../canvas/DiceScene.js';
import KeepZone from './KeepZone.js';
import { useSound } from '../hooks/useSound.js';
import { calculateScore, rollDice } from 'shared';

interface DebugConfig {
  gravity: number;
  impulseForce: number;
  restitution: number;
  camX: number;
  camY: number;
  camZ: number;
  fov: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  ambientIntensity: number;
  lightY: number;
  diceScale: number;
}

export function SandboxDebugView({ preset, onBack }: { preset: 'green' | 'amber'; onBack: () => void }) {
  const { playClick, playRoll, playSuccess, playDq } = useSound();

  // 1. Diagnostics 12-Slider States with spacious wide defaults
  const [debugConfig, setDebugConfig] = useState<DebugConfig>({
    gravity: 9.8,
    impulseForce: 10,
    restitution: 0.45,
    camX: 0.0,
    camY: 11.5,
    camZ: 2.0,
    fov: 38,
    targetX: -0.2,
    targetY: 1.8,
    targetZ: -0.2,
    ambientIntensity: 2.30,
    lightY: 10.5,
    diceScale: 0.80
  });

  // 2. Custom Face Value Override States
  const [forceDice, setForceDice] = useState(false);
  const [overrideValues, setOverrideValues] = useState<number[]>([1, 4, 6, 6, 6, 6]);

  // 3. Local Game Simulation States
  const [keptDice, setKeptDice] = useState<number[]>([]);
  const [activeRoll, setActiveRoll] = useState<number[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

  const scoring = calculateScore(keptDice);
  const hasOne = scoring.hasOne;
  const hasFour = scoring.hasFour;

  const handleSliderChange = (key: keyof DebugConfig, val: number) => {
    setDebugConfig(prev => ({ ...prev, [key]: val }));
  };

  const handleTapDie = (idx: number) => {
    playClick();
    setSelectedIndexes(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      } else {
        return [...prev, idx];
      }
    });
  };

  const handleRoll = () => {
    playRoll();
    setSelectedIndexes([]);
    setActiveRoll([]); // Clear first to force unmount

    setTimeout(() => {
      const diceCount = 6 - keptDice.length;
      if (diceCount <= 0) return;

      if (forceDice) {
        const overrideSlice = overrideValues.slice(keptDice.length, 6);
        setActiveRoll(overrideSlice);
      } else {
        setActiveRoll(rollDice(diceCount));
      }
    }, 50);
  };

  const handleKeep = () => {
    if (selectedIndexes.length === 0) return;
    playSuccess();

    const lockedVals = selectedIndexes.map(idx => activeRoll[idx]);
    const nextKept = [...keptDice, ...lockedVals];
    setKeptDice(nextKept);
    
    setActiveRoll([]);
    setSelectedIndexes([]);

    if (nextKept.length === 6) {
      const finalScoring = calculateScore(nextKept);
      if (finalScoring.isDQ) {
        playDq();
      }
    }
  };

  const handleReset = () => {
    playClick();
    setKeptDice([]);
    setActiveRoll([]);
    setSelectedIndexes([]);
  };

  const handleOverrideValueChange = (idx: number, val: number) => {
    setOverrideValues(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '24px',
      width: '100%',
      maxWidth: '1024px',
      padding: '16px'
    }}>
      {/* Action Header */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid var(--crt-border)',
        paddingBottom: '8px'
      }}>
        <h2 style={{ fontSize: '1.4rem' }}>[SANDBOX DIAGNOSTICS CENTER]</h2>
        <button onClick={onBack} className="btn-retro" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
          EXIT TO TERMINAL
        </button>
      </div>

      {/* LEFT COLUMN: 3D Scene Tray & 2D KeepZone */}
      <div style={{
        flex: '1 1 500px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '0.55rem',
          color: 'var(--crt-text-secondary)',
          textAlign: 'center'
        }}>
          * ACTIVE PHYSICS EXPERIMENT PANEL *
        </div>

        <DiceScene 
          diceValues={activeRoll} 
          onTapDie={handleTapDie} 
          preset={preset}
          debugConfig={debugConfig}
        />

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleRoll} 
            disabled={keptDice.length === 6 || activeRoll.length > 0} 
            className="btn-retro" 
            style={{ flex: 1 }}
          >
            THROW ({6 - keptDice.length} LEFT)
          </button>
          <button 
            onClick={handleKeep} 
            disabled={selectedIndexes.length === 0} 
            className="btn-retro" 
            style={{ 
              flex: 1,
              borderColor: selectedIndexes.length > 0 ? '#00ff66' : 'var(--crt-border-muted)',
              color: selectedIndexes.length > 0 ? '#00ff66' : 'var(--crt-text-muted)'
            }}
          >
            LOCK SELECTION ({selectedIndexes.length})
          </button>
          <button onClick={handleReset} className="btn-retro" style={{ flex: 0.5 }}>
            RESET
          </button>
        </div>

        <KeepZone keptDice={keptDice} hasOne={hasOne} hasFour={hasFour} />

        {/* Telemetry output */}
        <div className="terminal-panel" style={{ padding: '12px', fontSize: '0.9rem' }}>
          <div style={{ fontFamily: 'Press Start 2P, monospace', fontSize: '0.5rem', color: 'var(--crt-text-secondary)', marginBottom: '6px' }}>
            [LOCAL ENGINE TELEMETRY]
          </div>
          <div>KEPT_COUNT: {keptDice.length}/6</div>
          <div>QUALIFIED: {hasOne && hasFour ? 'YES' : 'NO'}</div>
          <div>SCORE: {scoring.isDQ ? 'BUST (DQ\'D)' : `${scoring.score} PTS`}</div>
        </div>
      </div>

      {/* RIGHT COLUMN: 12-Slider Debug Control Panel */}
      <div className="terminal-panel" style={{
        flex: '1 1 360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxHeight: '620px',
        overflowY: 'auto'
      }}>
        <div style={{ 
          fontFamily: 'Press Start 2P, monospace', 
          fontSize: '0.6rem',
          color: 'var(--crt-text-secondary)',
          borderBottom: '1px solid var(--crt-border-muted)',
          paddingBottom: '6px'
        }}>
          [CALIBRATION & DIAGNOSTICS]
        </div>

        {/* 1. Camera coordinates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#00ff66' }}>1. CAMERA POSITION</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', paddingLeft: '8px' }}>
            <label>CAM_X: {debugConfig.camX.toFixed(1)}</label>
            <input type="range" min={-10} max={10} step={0.5} value={debugConfig.camX} onChange={(e) => handleSliderChange('camX', parseFloat(e.target.value))} />
            
            <label>CAM_Y (HEIGHT): {debugConfig.camY.toFixed(1)}</label>
            <input type="range" min={2} max={20} step={0.5} value={debugConfig.camY} onChange={(e) => handleSliderChange('camY', parseFloat(e.target.value))} />
            
            <label>CAM_Z (DEPTH): {debugConfig.camZ.toFixed(1)}</label>
            <input type="range" min={2} max={20} step={0.5} value={debugConfig.camZ} onChange={(e) => handleSliderChange('camZ', parseFloat(e.target.value))} />

            <label>FOV (ZOOM): {debugConfig.fov}</label>
            <input type="range" min={10} max={100} step={2} value={debugConfig.fov} onChange={(e) => handleSliderChange('fov', parseInt(e.target.value))} />
          </div>
        </div>

        {/* 2. Camera target locks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#00ff66' }}>2. CAMERA LOOK_AT TARGET</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', paddingLeft: '8px' }}>
            <label>TARGET_X: {debugConfig.targetX.toFixed(1)}</label>
            <input type="range" min={-5} max={5} step={0.2} value={debugConfig.targetX} onChange={(e) => handleSliderChange('targetX', parseFloat(e.target.value))} />
            
            <label>TARGET_Y (HEIGHT): {debugConfig.targetY.toFixed(1)}</label>
            <input type="range" min={-5} max={5} step={0.2} value={debugConfig.targetY} onChange={(e) => handleSliderChange('targetY', parseFloat(e.target.value))} />
            
            <label>TARGET_Z: {debugConfig.targetZ.toFixed(1)}</label>
            <input type="range" min={-5} max={5} step={0.2} value={debugConfig.targetZ} onChange={(e) => handleSliderChange('targetZ', parseFloat(e.target.value))} />
          </div>
        </div>

        {/* 3. Visual Lightings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#00ff66' }}>3. SCENE LIGHTINGS</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', paddingLeft: '8px' }}>
            <label>AMBIENT INTENSITY: {debugConfig.ambientIntensity.toFixed(2)}</label>
            <input type="range" min={0} max={3} step={0.1} value={debugConfig.ambientIntensity} onChange={(e) => handleSliderChange('ambientIntensity', parseFloat(e.target.value))} />
            
            <label>POINT LIGHT Y (HEIGHT): {debugConfig.lightY.toFixed(1)}</label>
            <input type="range" min={2} max={20} step={0.5} value={debugConfig.lightY} onChange={(e) => handleSliderChange('lightY', parseFloat(e.target.value))} />
          </div>
        </div>

        {/* 4. Dice custom scale sizing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#00ff66' }}>4. DICE GEOMETRY SIZE</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', paddingLeft: '8px' }}>
            <label>DICE SCALE SIZE: {debugConfig.diceScale.toFixed(2)}x</label>
            <input type="range" min={0.5} max={2.5} step={0.1} value={debugConfig.diceScale} onChange={(e) => handleSliderChange('diceScale', parseFloat(e.target.value))} />
          </div>
        </div>

        {/* 5. Physics parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#00ff66' }}>5. PHYSICAL CONSTANTS</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', paddingLeft: '8px' }}>
            <label>GRAVITY: {debugConfig.gravity.toFixed(1)} m/s²</label>
            <input type="range" min={0} max={40} step={0.5} value={debugConfig.gravity} onChange={(e) => handleSliderChange('gravity', parseFloat(e.target.value))} />

            <label>BOUNCINESS (RESTITUTION): {debugConfig.restitution.toFixed(2)}</label>
            <input type="range" min={0} max={1} step={0.05} value={debugConfig.restitution} onChange={(e) => handleSliderChange('restitution', parseFloat(e.target.value))} />
          </div>
        </div>

        {/* 6. Custom Face Overrides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#00ff66' }}>6. VALUE OVERRIDES</span>
            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={forceDice} onChange={(e) => setForceDice(e.target.checked)} />
              FORCE_ROLL
            </label>
          </div>

          {forceDice && (
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--crt-border-muted)'
            }}>
              {overrideValues.map((val, idx) => (
                <select
                  key={idx}
                  value={val}
                  onChange={(e) => handleOverrideValueChange(idx, parseInt(e.target.value))}
                  style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: 'var(--crt-text)',
                    border: '1px solid var(--crt-border)',
                    borderRadius: '2px',
                    padding: '2px',
                    fontSize: '0.85rem'
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default SandboxDebugView;
