import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loader-content">
        <img src="/logo-full-white.png" alt="HONC Logo" className="loader-logo" />
        <div className="loader-spinner"></div>
        <p className="loader-text">Initializing HONC Ecosystem...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
