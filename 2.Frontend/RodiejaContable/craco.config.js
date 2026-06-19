module.exports = {
  devServer: (devServerConfig) => {
    const onBefore = devServerConfig.onBeforeSetupMiddleware;
    const onAfter = devServerConfig.onAfterSetupMiddleware;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (typeof onBefore === 'function') {
        onBefore(devServer);
      }
      if (typeof onAfter === 'function') {
        onAfter(devServer);
      }
      return middlewares;
    };

    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    return devServerConfig;
  },
};
