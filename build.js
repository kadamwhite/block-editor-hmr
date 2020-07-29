"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._apply_wp_5_4_hmr_patch = exports.autoloadFormats = exports.unregisterFormat = exports.registerFormat = exports.autoloadPlugins = exports.unregisterPlugin = exports.registerPlugin = exports.autoloadBlocks = exports.afterUpdateBlocks = exports.beforeUpdateBlocks = exports.unregisterBlock = exports.registerBlock = exports.autoload = void 0;

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

/**
 * Provide helper methods to dynamically locate, load & register Blocks & Plugins.
 */
var _window$wp = window.wp,
    blocks = _window$wp.blocks,
    plugins = _window$wp.plugins,
    richText = _window$wp.richText,
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

      var isHotUpdate = cache[key];

      if (isHotUpdate) {
        console.groupCollapsed("hot update: ".concat(key)); // Module changed, and prior copy detected: unregister old module.

        unregister(cache[key]);
      } // Register new module and update cache.


      register(module);
      changed.push(module);
      cache[key] = module;

      if (isHotUpdate) {
        console.groupEnd();
      }
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
  selectedBlockId = data.select('core/block-editor').getSelectedBlockClientId();
  data.dispatch('core/block-editor').clearSelectedBlock();
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


  data.select('core/block-editor').getBlocks().forEach(function (_ref6) {
    var name = _ref6.name,
        clientId = _ref6.clientId;

    if (changedNames.includes(name)) {
      data.dispatch('core/block-editor').selectBlock(clientId);
    }
  }); // Reselect whatever was selected in the beginning.

  if (selectedBlockId) {
    data.dispatch('core/block-editor').selectBlock(selectedBlockId);
  } else {
    data.dispatch('core/block-editor').clearSelectedBlock();
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
          namespace = _ref9.namespace,
          callback = _ref9.callback;
      hooks.addFilter(hook, namespace, callback);
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
/**
 * Register a new or updated format type
 *
 * @param {Object}   format           The exported format module.
 * @param {String}   format.name      Format type name.
 * @param {Object}   format.settings  Format type configuration object.
 */


exports.autoloadPlugins = autoloadPlugins;

var registerFormat = function registerFormat(_ref13) {
  var name = _ref13.name,
      settings = _ref13.settings;

  if (name && settings) {
    richText.registerFormatType(name, settings);
  }
};
/**
 * Unregister an updated or removed format type.
 *
 * @param {Object}   format           The exported format module.
 * @param {String}   format.name      Format type name.
 * @param {Object}   format.settings  Format type configuration object.
 */


exports.registerFormat = registerFormat;

var unregisterFormat = function unregisterFormat(_ref14) {
  var name = _ref14.name,
      settings = _ref14.settings;

  if (name && settings) {
    richText.unregisterFormatType(name);
  }
};
/**
 * Require a set of format types and configure them for hot module replacement.
 *
 * @see autoload
 *
 * @param {Object}   options              Configuration object defining callbacks.
 * @param {Function} options.getContext   Execute and return a `require.context()` call.
 * @param {Function} options.[register]   Function to register accepted formats.
 * @param {Function} options.[unregister] Function to unregister replaced formats.
 * @param {Function} options.[before]     Function to run before updating formats.
 * @param {Function} options.[after]      Function to run after updating formats.
 * @param {Function} [callback]           A callback function which will be passed the
 *                                        generated `context` object and `loadModules`
 *                                        function, which can be used to opt-in to HMR.
 */


exports.unregisterFormat = unregisterFormat;

var autoloadFormats = function autoloadFormats(_ref15, callback) {
  var getContext = _ref15.getContext,
      _ref15$register = _ref15.register,
      register = _ref15$register === void 0 ? registerFormat : _ref15$register,
      _ref15$unregister = _ref15.unregister,
      unregister = _ref15$unregister === void 0 ? unregisterFormat : _ref15$unregister,
      before = _ref15.before,
      after = _ref15.after;
  autoload({
    getContext: getContext,
    register: register,
    unregister: unregister,
    before: before,
    after: after
  }, callback);
};
/**
 * Work around a full-page crash in WordPress 5.4 caused by a forced render of
 * the BlockListBlock component following the state dispatch triggered upon block
 * unregistration.
 * 
 * This function filters the BlockListBlock component to wrap it in an error
 * boundary, which catches the error when BlockListBlock tries to access a
 * property on the removed block type, suppresses the error by returning null,
 * and then schedules the BlockListBlock to try rendering again on the next
 * tick (by which point our hot-swapped block type should be available again).
 */


exports.autoloadFormats = autoloadFormats;

var _apply_wp_5_4_hmr_patch = function _apply_wp_5_4_hmr_patch() {
  var React = window.React;
  var Component = React.Component,
      Fragment = React.Fragment,
      createElement = React.createElement;
  hooks.addFilter('editor.BlockListBlock', 'block-editor-hmr/prevent-block-swapping-error', function (BlockListBlock) {
    var ErrorWrapper = /*#__PURE__*/function (_Component) {
      _inherits(ErrorWrapper, _Component);

      var _super = _createSuper(ErrorWrapper);

      function ErrorWrapper(props) {
        var _this;

        _classCallCheck(this, ErrorWrapper);

        _this = _super.call(this, props);
        _this.state = {
          hasError: false
        };
        return _this;
      }

      _createClass(ErrorWrapper, [{
        key: "componentDidUpdate",
        value: function componentDidUpdate(prevProps, prevState) {
          var _this2 = this;

          if (this.state.hasError && this.state.hasError !== prevState.hasError) {
            setTimeout(function () {
              _this2.setState({
                hasError: false
              });
            });
          }
        }
      }, {
        key: "render",
        value: function render() {
          if (this.state.hasError) {
            return null;
          }

          return createElement(Fragment, null, createElement(BlockListBlock, this.props));
        }
      }], [{
        key: "getDerivedStateFromError",
        value: function getDerivedStateFromError(error) {
          return {
            hasError: true
          };
        }
      }]);

      return ErrorWrapper;
    }(Component);

    return ErrorWrapper;
  });
};

exports._apply_wp_5_4_hmr_patch = _apply_wp_5_4_hmr_patch;
