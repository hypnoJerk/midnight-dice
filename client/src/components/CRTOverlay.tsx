import React from 'react';

export function CRTOverlay() {
  return (
    <>
      <div className="crt-scanlines" />
      <div className="crt-flicker-layer" />
      <div className="crt-beam" />
    </>
  );
}
export default CRTOverlay;
