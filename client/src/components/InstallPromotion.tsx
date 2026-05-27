import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { useSound } from '../hooks/useSound.js';

export default function InstallPromotion() {
  const { isInstallable, installApp } = usePWAInstall();
  const { playClick } = useSound();

  if (!isInstallable) {
    return null; // Do not render if the app is already installed or browser doesn't support install
  }

  const handleInstallClick = async () => {
    playClick();
    await installApp();
  };

  return (
    <button 
      onClick={handleInstallClick} 
      className="btn-retro"
      style={{
        fontSize: '0.9rem',
        width: '130px',
        padding: '8px',
        color: 'var(--crt-border)',
        borderColor: 'var(--crt-border)',
        boxShadow: '0 0 8px rgba(0, 255, 102, 0.2)',
        fontWeight: 'bold'
      }}
    >
      INSTALL APP
    </button>
  );
}
