"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.autoloadPlugins = exports.unregisterPlugin = exports.registerPlugin = exports.autoloadBlocks = exports.afterUpdateBlocks = exports.beforeUpdateBlocks = exports.unregisterBlock = exports.registerBlock = exports.autoload = void 0;

/**
 * Provide helper methods to dynamically locate, load & register Blocks & Plugins.
 */
var _window$wp = window.wp,
    blocks = _window$wp.blocks,
    plugins = _window$wp.plugins,
    hooks = _window$wp.hooks,
    data = _window$wp.data;
/**
 * No-op function for use as a default argument value.
 */

var noop = function noop() {};
/**
 * Require a set of modules and configure them for hot module replacement.
 * The consuming function must opt-in to HMR by passing a callback to
 * accept updates for the context where this function is used.
 *
 * The first argument should be a function returning a `require.context()`
 * call. All modules loaded from this context are cached, and on each rebuild
 * the incoming updated modules are checked against the cache. Updated modules
 * which already exist in the cache are unregistered with the provided function,
 * then any incoming (new or updated) modules will be registered.
 *
 * @param {Object}   options            Configuration object defining callbacks.
 * @param {Function} options.getContext Execute and return a `require.context()` call.
 * @param {Function} options.register   Function to register accepted modules.
 * @param {Function} options.unregister Function to unregister replaced modules.
 * @param {Function} options.[before]   Function to run before updating modules.
 * @param {Function} options.[after]    Function to run after updating modules.
 * @param {Function} [callback]         A callback function which will be passed the
 *                                      generated `context` object and `loadModules`
 *                                      function, which can be used to opt-in to HMR.
 */


var autoload = function autoload(_ref) {
  var getContext = _ref.getContext,
      register = _ref.register,
      unregister = _ref.unregister,
      _ref$before = _ref.before,
      before = _ref$before === void 0 ? noop : _ref$before,
      _ref$after = _ref.after,
      after = _ref$after === void 0 ? noop : _ref$after;
  var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop;
  var cache = {};

  var loadModules = function loadModules() {
    before();
    var context = getContext();
    var changed = [];
    context.keys().forEach(function (key) {
      var module = context(key);

      if (module === cache[key]) {
        // Module unchanged: no further action needed.
        return;
      }

      if (cache[key]) {
        // Module changed, and prior copy detected: unregister old module.
        unregister(cache[key]);
      } // Register new module and update cache.


      register(module);
      changed.push(module);
      cache[key] = module;
    });
    after(changed); // Return the context for HMR initialization.

    return context;
  };

  var context = loadModules();
  callback(context, loadModules);
}; // Maintain the selected block ID across HMR updates.


exports.autoload = autoload;
var selectedBlockId = null;
/**
 * Register a new or updated block.
 *
 * @param {Object}   block            The exported block module.
 * @param {String}   block.name       Block name.
 * @param {Object}   block.settings   Block configuration object.
 * @param {Object[]} [block.filters]  Optional array of filters to bind.
 * @param {Object[]} [block.styles]   Optional array of block styles to bind.
 */

var registerBlock = function registerBlock(_ref2) {
  var name = _ref2.name,
      settings = _ref2.settings,
      filters = _ref2.filters,
      styles = _ref2.styles;

  if (name && settings) {
    blocks.registerBlockType(name, settings);
  }

  if (filters && Array.isArray(filters)) {
    filters.forEach(function (_ref3) {
      var hook = _ref3.hook,
          namespace = _ref3.namespace,
          callback = _ref3.callback;
      hooks.addFilter(hook, namespace, callback);
    });
  }

  if (styles && Array.isArray(styles)) {
    styles.forEach(function (style) {
      return blocks.registerBlockStyle(name, style);
    });
  }
};
/**
 * Unregister an updated or removed block.
 *
 * @param {Object}   block            The exported block module.
 * @param {String}   block.name       Block name.
 * @param {Object}   block.settings   Block configuration object.
 * @param {Object[]} [block.filters]  Optional array of filters to bind.
 * @param {Object[]} [block.styles]   Optional array of block styles to bind.
 */


exports.registerBlock = registerBlock;

var unregisterBlock = function unregisterBlock(_ref4) {
  var name = _ref4.name,
      settings = _ref4.settings,
      filters = _ref4.filters,
      styles = _ref4.styles;

  if (name && settings) {
    blocks.unregisterBlockType(name);
  }

  if (filters && Array.isArray(filters)) {
    filters.forEach(function (_ref5) {
      var hook = _ref5.hook,
          namespace = _ref5.namespace;
      hooks.removeFilter(hook, namespace);
    });
  }

  if (styles && Array.isArray(styles)) {
    styles.forEach(function (style) {
      return blocks.unregisterBlockStyle(name, style.name);
    });
  }
};
/**
 * Store the selected block to persist selection across block-swaps.
 */


exports.unregisterBlock = unregisterBlock;

var beforeUpdateBlocks = function beforeUpdateBlocks() {
  selectedBlockId = data.select('core/editor').getSelectedBlockClientId();
  data.dispatch('core/editor').clearSelectedBlock();
};
/**
 * Trigger a re-render on all blocks which have changed.
 *
 * @param {Object[]} changed Array of changed module objects.
 */


exports.beforeUpdateBlocks = beforeUpdateBlocks;

var afterUpdateBlocks = function afterUpdateBlocks() {
  var changed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var changedNames = changed.map(function (module) {
    return module.name;
  });

  if (!changedNames.length) {
    return;
  } // Refresh all blocks by iteratively selecting each one that has changed.


  data.select('core/editor').getBlocks().forEach(function (_ref6) {
    var name = _ref6.name,
        clientId = _ref6.clientId;

    if (changedNames.includes(name)) {
      data.dispatch('core/editor').selectBlock(clientId);
    }
  }); // Reselect whatever was selected in the beginning.

  if (selectedBlockId) {
    data.dispatch('core/editor').selectBlock(selectedBlockId);
  } else {
    data.dispatch('core/editor').clearSelectedBlock();
  }

  selectedBlockId = null;
};
/**
 * Require a set of blocks and configure them for hot module replacement.
 *
 * @see autoload
 *
 * @param {Object}   options              Configuration object defining callbacks.
 * @param {Function} options.getContext   Execute and return a `require.context()` call.
 * @param {Function} options.[register]   Function to register accepted blocks.
 * @param {Function} options.[unregister] Function to unregister replaced blocks.
 * @param {Function} options.[before]     Function to run before updating blocks.
 * @param {Function} options.[after]      Function to run after updating blocks.
 * @param {Function} [callback]           A callback function which will be passed the
 *                                        generated `context` object and `loadModules`
 *                                        function, which can be used to opt-in to HMR.
 */


exports.afterUpdateBlocks = afterUpdateBlocks;

var autoloadBlocks = function autoloadBlocks(_ref7, callback) {
  var getContext = _ref7.getContext,
      _ref7$register = _ref7.register,
      register = _ref7$register === void 0 ? registerBlock : _ref7$register,
      _ref7$unregister = _ref7.unregister,
      unregister = _ref7$unregister === void 0 ? unregisterBlock : _ref7$unregister,
      _ref7$before = _ref7.before,
      before = _ref7$before === void 0 ? beforeUpdateBlocks : _ref7$before,
      _ref7$after = _ref7.after,
      after = _ref7$after === void 0 ? afterUpdateBlocks : _ref7$after;
  autoload({
    getContext: getContext,
    register: register,
    unregister: unregister,
    before: before,
    after: after
  }, callback);
};
/**
 * Register a new or updated plugin.
 *
 * @param {Object}   plugin           The exported plugin module.
 * @param {String}   plugin.name      Plugin name.
 * @param {Object}   plugin.settings  Plugin configuration object.
 * @param {Object[]} [plugin.filters] Optional array of filters to bind.
 */


exports.autoloadBlocks = autoloadBlocks;

var registerPlugin = function registerPlugin(_ref8) {
  var name = _ref8.name,
      settings = _ref8.settings,
      filters = _ref8.filters;

  if (name && settings) {
    plugins.registerPlugin(name, settings);
  }

  if (filters && Array.isArray(filters)) {
    filters.forEach(function (_ref9) {
      var hook = _ref9.hook,
          namespace = _ref9.namespace;
      hooks.removeFilter(hook, namespace);
    });
  }
};
/**
 * Unregister an updated or removed plugin.
 *
 * @param {Object}   plugin           The exported plugin module.
 * @param {String}   plugin.name      Plugin name.
 * @param {Object}   plugin.settings  Plugin configuration object.
 * @param {Object[]} [plugin.filters] Optional array of filters to bind.
 */


exports.registerPlugin = registerPlugin;

var unregisterPlugin = function unregisterPlugin(_ref10) {
  var name = _ref10.name,
      settings = _ref10.settings,
      filters = _ref10.filters;

  if (name && settings) {
    plugins.unregisterPlugin(name);
  }

  if (filters && Array.isArray(filters)) {
    filters.forEach(function (_ref11) {
      var hook = _ref11.hook,
          namespace = _ref11.namespace;
      hooks.removeFilter(hook, namespace);
    });
  }
};
/**
 * Require a set of plugins and configure them for hot module replacement.
 *
 * @see autoload
 *
 * @param {Object}   options              Configuration object defining callbacks.
 * @param {Function} options.getContext   Execute and return a `require.context()` call.
 * @param {Function} options.[register]   Function to register accepted plugins.
 * @param {Function} options.[unregister] Function to unregister replaced plugins.
 * @param {Function} options.[before]     Function to run before updating plugins.
 * @param {Function} options.[after]      Function to run after updating plugins.
 * @param {Function} [callback]           A callback function which will be passed the
 *                                        generated `context` object and `loadModules`
 *                                        function, which can be used to opt-in to HMR.
 */


exports.unregisterPlugin = unregisterPlugin;

var autoloadPlugins = function autoloadPlugins(_ref12, callback) {
  var getContext = _ref12.getContext,
      _ref12$register = _ref12.register,
      register = _ref12$register === void 0 ? registerPlugin : _ref12$register,
      _ref12$unregister = _ref12.unregister,
      unregister = _ref12$unregister === void 0 ? unregisterPlugin : _ref12$unregister,
      before = _ref12.before,
      after = _ref12.after;
  autoload({
    getContext: getContext,
    register: register,
    unregister: unregister,
    before: before,
    after: after
  }, callback);
};

exports.autoloadPlugins = autoloadPlugins;
