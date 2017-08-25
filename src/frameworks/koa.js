/**
 * Created by Ivan Prodaiko on 14-Aug-17.
 */

'use strict';

const DI = require('../di');

/**
 * @param ctx {Object}
 * @param original {Function}
 * @returns {Function}
 */
const diResolver = function(ctx, original) {
  /** @param diConfig {Function|String|Object<{controller: string, action: string, [params]: Array}>} */
  return function(diConfig) {
    switch (typeof diConfig) {
      case 'string':
        original.call(ctx, ctx.context.di.resolve(diConfig));
        break;
      case 'object': // array
        const { controller, action, params } = diConfig;
        const dependency = ctx.context.di.resolve(controller);
        original.call(ctx, async (ctx, next) => {
          if (next) {
            await dependency[action](ctx, next, params);
          } else {
            await dependency[action](ctx, params);
          }
        });
        break;
      default: // function
        original.call(ctx, diConfig);
    }
    return ctx;
  };
};

/**
 * @param app {Object}
 * @param ctx {Object}
 * @param original {Function}
 * @returns {Function}
 */
const diRouterResolver = function(app, ctx, original) {
  /**
   * path {string}
   * @param diConfig {Function|String|Object<{controller: string, action: string, [params]: Array}>}
   */
  return function(path, diConfig) {
    switch (typeof diConfig) {
      case 'string':
        original.call(ctx, path, app.context.di.resolve(diConfig));
        break;
      case 'object': // array
        const { controller, action, params } = diConfig;
        const dependency = app.context.di.resolve(controller);
        original.call(ctx, path, async (ctx, next) => {
          if (next) {
            await dependency[action](ctx, next, params);
          } else {
            await dependency[action](ctx, params);
          }
        });
        break;
      default: // function
        original.call(ctx, path, diConfig);
    }
    return ctx;
  };
};

/**
 *
 * @param app
 * @param bootstrapModule {Module|Object}
 * @param [router]
 */
module.exports = function koaDi(bootstrapModule, app, router) {
  const di = new DI();
  di.bootstrap(bootstrapModule);
  di.main.injector.register({name: 'App', strategy: 'constant', value: app});
  app.context.di = di;

  app.use = diResolver(app, app.use);

  if (router) {
    router.use = diRouterResolver(app, router, router.use);
    router.methods.forEach(method => {
      const methodName = method.toLowerCase();
      router[methodName] = diRouterResolver(app, router, router[methodName]);
    })
  }
};
