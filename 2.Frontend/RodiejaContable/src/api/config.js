export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://api-contability.tuprimernegocio.org');
