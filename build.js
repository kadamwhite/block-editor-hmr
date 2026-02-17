"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.refreshEditor = exports.deregisterBlock = void 0;
/**
 * Provide helper methods to dynamically reload & reregister blocks in hot-reloading contexts.
 */
const {
  unregisterBlockType,
  unregisterBlockStyle
} = window.wp.blocks;
const {
  removeFilter
} = window.wp.hooks;
const {
  dispatch,
  select
} = window.wp.data;

/**
 * Deregister a block that's being hot-swapped out, so that the updated version
 * can be registered afresh without "block already registered" errors.
 *
 * Also keeps track of the selected block client ID, which is needed because
 * we have to deselect a block before unregistering it to swap without error.
 * The active block will be reselected in the refresh function.
 *
 * @param {string} hotBlockName Name of block being hot-reloaded.
 * @param {object} [variants]   Dictionary of { styles, filters } arrays to optionally unbind.
 * @returns {(data: object) => void} Callback for module.hot.dispose() to deregister the specified block.
 */
const deregisterBlock = (hotBlockName, variants = {}) => data => {
  unregisterBlockType(hotBlockName);
  if (Array.isArray(variants?.styles)) {
    variants.styles.forEach(style => {
      unregisterBlockStyle(hotBlockName, style.name);
    });
  }
  if (Array.isArray(variants?.filters)) {
    variants.filters.forEach(({
      hook,
      namespace
    }) => {
      removeFilter(hook, namespace);
    });
  }
  const selectedBlockId = select('core/block-editor').getSelectedBlockClientId();
  if (selectedBlockId) {
    dispatch('core/block-editor').clearSelectedBlock();
  }

  // Pass selected ID through hot-reload cycle.
  data.value = selectedBlockId;
};

/**
 * Process an updated block module, refreshing the editor view as needed.
 *
 * @param {string}           hotBlockName Name of block being hot-reloaded.
 * @param {{value?: string}} [data]       HMR module.hot.data context object, if present.
 */
exports.deregisterBlock = deregisterBlock;
const refreshEditor = (hotBlockName, data) => {
  // Refresh all copies of our changed block by iteratively selecting them.
  select('core/block-editor').getBlocks().forEach(({
    name,
    clientId
  }) => {
    if (name === hotBlockName) {
      dispatch('core/block-editor').selectBlock(clientId);
    }
  });

  // Reselect whatever block was selected in the beginning.
  if (data?.value) {
    // Reselect after a timeout to finish hot-block processing before changing focus.
    setTimeout(() => {
      dispatch('core/block-editor').selectBlock(data.value);
    });
  }
};
exports.refreshEditor = refreshEditor;
