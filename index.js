/**
 * Provide helper methods to dynamically locate, load & register Blocks & Plugins.
 */
const {
	blocks,
	plugins,
	richText,
	hooks,
	data,
} = window.wp;

/**
 * No-op function for use as a default argument value.
 */
const noop = () => {};

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
export const autoload = (
	{
		getContext,
		register,
		unregister,
		before = noop,
		after = noop,
	},
	callback = noop
) => {
	const cache = {};
	const loadModules = () => {
		before();

		const context = getContext();
		const changed = [];
		context.keys().forEach( ( key ) => {
			const module = context( key );
			if ( module === cache[ key ] ) {
				// Module unchanged: no further action needed.
				return;
			}
			const isHotUpdate = cache[ key ];
			if ( isHotUpdate && console.groupCollapsed ) {
				console.groupCollapsed( `hot update: ${ key }` );
			}
			if ( isHotUpdate ) {
				// Module changed, and prior copy detected: unregister old module.
				unregister( cache[ key ] );
			}
			// Register new module and update cache.
			register( module );
			changed.push( module );
			cache[ key ] = module;

			if ( isHotUpdate && console.groupCollapsed ) {
				console.groupEnd();
			}
		} );

		after( changed );

		// Return the context for HMR initialization.
		return context;
	};

	const context = loadModules();

	callback( context, loadModules );
};

// Maintain the selected block ID across HMR updates.
let selectedBlockId = null;

/**
 * Register a new or updated block, filters, or style variations.
 *
 * @param {Object}   block            The exported block module.
 * @param {String}   block.name       Block name. May be included in configuration object.
 * @param {Object}   [block.settings] Optional block configuration object.
 * @param {Object[]} [block.filters]  Optional array of filters to bind.
 * @param {Object[]} [block.styles]   Optional array of block styles to bind.
 */
export const registerBlock = ( { name, settings, filters, styles } ) => {
	if ( ( name || settings?.name ) && settings ) {
		blocks.registerBlockType( ( name || settings?.name ), settings );
	}

	if ( filters && Array.isArray( filters ) ) {
		filters.forEach( ( { hook, namespace, callback } ) => {
			hooks.addFilter( hook, namespace, callback );
		} );
	}

	if ( styles && Array.isArray( styles ) ) {
		styles.forEach( ( style ) => blocks.registerBlockStyle( name, style ) );
	}
};

/**
 * Unregister an updated or removed block, filters, or style variations.
 *
 * @param {Object}   block            The exported block module.
 * @param {String}   block.name       Block name. May be included in configuration object.
 * @param {Object}   [block.settings] Optional block configuration object.
 * @param {Object[]} [block.filters]  Optional array of filters to bind.
 * @param {Object[]} [block.styles]   Optional array of block styles to bind.
 */
export const unregisterBlock = ( { name, settings, filters, styles } ) => {
	if ( ( name || settings?.name ) && settings ) {
		blocks.unregisterBlockType( ( name || settings?.name ) );
	}

	if ( filters && Array.isArray( filters ) ) {
		filters.forEach( ( { hook, namespace } ) => {
			hooks.removeFilter( hook, namespace );
		} );
	}

	if ( styles && Array.isArray( styles ) ) {
		styles.forEach( ( style ) => blocks.unregisterBlockStyle( name, style.name ) );
	}
};

/**
 * Store the selected block to persist selection across block-swaps.
 */
export const beforeUpdateBlocks = () => {
	selectedBlockId = data.select( 'core/block-editor' ).getSelectedBlockClientId();
	data.dispatch( 'core/block-editor' ).clearSelectedBlock();
};

/**
 * Trigger a re-render on all blocks which have changed.
 *
 * @param {Object[]} changed Array of changed module objects.
 */
export const afterUpdateBlocks = ( changed = [] ) => {
	const changedNames = changed.map( ( module ) => module.name );

	if ( ! changedNames.length ) {
		return;
	}

	// Refresh all blocks by iteratively selecting each one that has changed.
	data.select( 'core/block-editor' ).getBlocks().forEach( ( { name, clientId } ) => {
		if ( changedNames.includes( name ) ) {
			data.dispatch( 'core/block-editor' ).selectBlock( clientId );
		}
	} );

	// Reselect whatever was selected in the beginning.
	if ( selectedBlockId ) {
		data.dispatch( 'core/block-editor' ).selectBlock( selectedBlockId );
	} else {
		data.dispatch( 'core/block-editor' ).clearSelectedBlock();
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
export const autoloadBlocks = (
	{
		getContext,
		register = registerBlock,
		unregister = unregisterBlock,
		before = beforeUpdateBlocks,
		after = afterUpdateBlocks,
	},
	callback
) => {
	autoload(
		{
			getContext,
			register,
			unregister,
			before,
			after,
		},
		callback
	);
};

/**
 * Register a new or updated plugin.
 *
 * @param {Object}   plugin           The exported plugin module.
 * @param {String}   plugin.name      Plugin name.
 * @param {Object}   plugin.settings  Plugin configuration object.
 * @param {Object[]} [plugin.filters] Optional array of filters to bind.
 */
export const registerPlugin = ( { name, settings, filters } ) => {
	if ( name && settings ) {
		plugins.registerPlugin( name, settings );
	}

	if ( filters && Array.isArray( filters ) ) {
		filters.forEach( ( { hook, namespace, callback } ) => {
			hooks.addFilter( hook, namespace, callback );
		} );
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
export const unregisterPlugin = ( { name, settings, filters } ) => {
	if ( name && settings ) {
		plugins.unregisterPlugin( name );
	}

	if ( filters && Array.isArray( filters ) ) {
		filters.forEach( ( { hook, namespace } ) => {
			hooks.removeFilter( hook, namespace );
		} );
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
export const autoloadPlugins = (
	{
		getContext,
		register = registerPlugin,
		unregister = unregisterPlugin,
		before,
		after,
	},
	callback
) => {
	autoload(
		{
			getContext,
			register,
			unregister,
			before,
			after,
		},
		callback
	);
};

/**
 * Register a new or updated format type
 *
 * @param {Object}   format           The exported format module.
 * @param {String}   format.name      Format type name.
 * @param {Object}   format.settings  Format type configuration object.
 */
export const registerFormat = ( { name, settings } ) => {
	if ( name && settings ) {
		richText.registerFormatType( name, settings );
	}
};

/**
 * Unregister an updated or removed format type.
 *
 * @param {Object}   format           The exported format module.
 * @param {String}   format.name      Format type name.
 * @param {Object}   format.settings  Format type configuration object.
 */
export const unregisterFormat = ( { name, settings } ) => {
	if ( name && settings ) {
		richText.unregisterFormatType( name );
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
export const autoloadFormats = (
	{
		getContext,
		register = registerFormat,
		unregister = unregisterFormat,
		before,
		after,
	},
	callback
) => {
	autoload(
		{
			getContext,
			register,
			unregister,
			before,
			after,
		},
		callback
	);
};

/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
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
export const _apply_wp_5_4_hmr_patch = () => {
	/* eslint-enable */
	const React = window.React;
	const { Component, Fragment, createElement } = React;

	hooks.addFilter(
		'editor.BlockListBlock',
		'block-editor-hmr/prevent-block-swapping-error',
		( BlockListBlock ) => {
			class ErrorWrapper extends Component {
				constructor( props ) {
					super( props );
					this.state = { hasError: false };
				}

				// eslint-disable-next-line no-unused-vars
				static getDerivedStateFromError( error ) {
					return { hasError: true };
				}

				componentDidUpdate( prevProps, prevState ) {
					if ( this.state.hasError && this.state.hasError !== prevState.hasError ) {
						setTimeout( () => {
							this.setState( { hasError: false } );
						} );
					}
				}

				render() {
					if ( this.state.hasError ) {
						return null;
					}

					return createElement(
						Fragment,
						null,
						createElement( BlockListBlock, this.props )
					);
				}
			}

			return ErrorWrapper;
		}
	);
};
