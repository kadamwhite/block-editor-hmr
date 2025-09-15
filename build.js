/**
 * Provide helper methods to dynamically reload & reregister blocks in hot-reloading contexts.
 */
define("index", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.refreshEditor = exports.deregisterBlock = void 0;
    var _a = window.wp.blocks, unregisterBlockType = _a.unregisterBlockType, unregisterBlockStyle = _a.unregisterBlockStyle;
    var removeFilter = window.wp.hooks.removeFilter;
    var _b = window.wp.data, dispatch = _b.dispatch, select = _b.select;
    /**
     * Deregister a block that's being hot-swapped out, so that the updated version
     * can be registered afresh without "block already registered" errors.
     *
     * Also keeps track of the selected block client ID, which is needed because
     * we have to deselect a block before unregistering it to swap without error.
     * The active block will be reselected in the refresh function.
     *
     * @param hotBlockName Name of block being hot-reloaded.
     * @param variants     Dictionary of { styles, filters } arrays to optionally unbind.
     * @return Callback for module.hot.dispose() to deregister the specified block.
     */
    var deregisterBlock = function (hotBlockName, variants) {
        if (variants === void 0) { variants = {}; }
        /**
         * Callback for module.hot.dispose() to deregister the specified block.
         *
         * @param data HMR module.hot.data context object.
         */
        return function (data) {
            unregisterBlockType(hotBlockName);
            if (Array.isArray(variants === null || variants === void 0 ? void 0 : variants.styles)) {
                variants.styles.forEach(function (style) {
                    return unregisterBlockStyle(hotBlockName, style.name);
                });
            }
            if (Array.isArray(variants === null || variants === void 0 ? void 0 : variants.filters)) {
                variants.filters.forEach(function (_a) {
                    var hook = _a.hook, namespace = _a.namespace;
                    removeFilter(hook, namespace);
                });
            }
            var selectedBlockId = select('core/block-editor').getSelectedBlockClientId();
            if (selectedBlockId) {
                dispatch('core/block-editor').clearSelectedBlock();
            }
            // Pass selected ID through hot-reload cycle.
            data.value = selectedBlockId;
        };
    };
    exports.deregisterBlock = deregisterBlock;
    /**
     * Process an updated block module, refreshing the editor view as needed.
     *
     * @param {string}           hotBlockName Name of block being hot-reloaded.
     * @param {{value?: string}} [data]       HMR module.hot.data context object, if present.
     */
    var refreshEditor = function (hotBlockName, data) {
        // Refresh all copies of our changed block by iteratively selecting them.
        select('core/block-editor')
            .getBlocks()
            .forEach(function (_a) {
            var name = _a.name, clientId = _a.clientId;
            if (name === hotBlockName) {
                dispatch('core/block-editor').selectBlock(clientId);
            }
        });
        // Reselect whatever block was selected in the beginning.
        if (data === null || data === void 0 ? void 0 : data.value) {
            // Reselect within a timeout to allow other hot-reloaded blocks to finish
            // processing before changing focus.
            setTimeout(function () {
                dispatch('core/block-editor').selectBlock(data.value);
            });
        }
    };
    exports.refreshEditor = refreshEditor;
});
