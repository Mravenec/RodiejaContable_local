const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://api-contability.tuprimernegocio.org',
      changeOrigin: true,
      logLevel: 'silent',
    })
  );
};
