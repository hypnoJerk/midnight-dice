import React from 'react';
import { useSound } from '../hooks/useSound.js';

interface InstallPromotionProps {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<boolean>;
}

export default function InstallPromotion({ isInstallable, isInstalled, installApp }: InstallPromotionProps) {
  const { playClick } = useSound();

  const handleInstallClick = async () => {
    playClick();
    await installApp();
  };

  if (isInstallable) {
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

  return (
    <span style={{
      fontSize: '0.9rem',
      color: 'var(--crt-text-secondary)',
      width: '130px',
      textAlign: 'center',
      display: 'inline-block'
    }}>
      {isInstalled ? 'INSTALLED' : 'N/A'}
    </span>
  );
}

