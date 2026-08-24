import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loader-content">
        <img src="/Fiosun-logo-full" alt="Fiosun" className="loader-logo" />
        <div className="loader-spinner"></div>
        <p className="loader-text">Initializing ERP Ecosystem...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
