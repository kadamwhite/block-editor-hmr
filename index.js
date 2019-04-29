/**
 * Provide helper methods to dynamically locate, load & register Blocks & Plugins.
 */
const {
	blocks,
	plugins,
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
 * @param {Function} options.[before]   Function to run before updating moules.
 * @param {Function} options.[after]    Function to run after updating moules.
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
		context.keys().forEach( key => {
			const module = context( key );
			if ( module === cache[ key ] ) {
				// Module unchanged: no further action needed.
				return;
			}
			if ( cache[ key ] ) {
				// Module changed, and prior copy detected: unregister old module.
				unregister( cache[ key ] );
			}
			// Register new module and update cache.
			register( module );
			changed.push( module );
			cache[ key ] = module;
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
 * Register a new or updated block.
 */
export const registerBlock = ( { name, options, filters, styles } ) => {
	if ( name && options ) {
		blocks.registerBlockType( name, options );
	}

	if ( filters && Array.isArray( filters ) ) {
		filters.forEach( ( { hook, namespace, callback } ) => {
			hooks.addFilter( hook, namespace, callback );
		} );
	}

	if ( styles && Array.isArray( styles ) ) {
		styles.forEach( style => blocks.registerBlockStyle( name, style ) );
	}
};

/**
 * Unregister an updated or removed block.
 */
export const unregisterBlock = ( { name, options, filters, styles } ) => {
	if ( name && options ) {
		blocks.unregisterBlockType( name );
	}

	if ( filters && Array.isArray( filters ) ) {
		filters.forEach( ( { hook, namespace } ) => {
			hooks.removeFilter( hook, namespace );
		} );
	}

	if ( styles && Array.isArray( styles ) ) {
		styles.forEach( style => blocks.unregisterBlockStyle( name, style.name ) );
	}
};

/**
 * Store the selected block to persist selection across block-swaps.
 */
export const beforeUpdateBlocks = () => {
	selectedBlockId = data.select( 'core/editor' ).getSelectedBlockClientId();
	data.dispatch( 'core/editor' ).clearSelectedBlock();
};

/**
 * Trigger a re-render on all blocks which have changed.
 *
 * @param {Object[]} changed Array of changed module objects.
 */
export const afterUpdateBlocks = ( changed = [] ) => {
	const changedNames = changed.map( module => module.name );

	if ( ! changedNames.length ) {
		return;
	}

	// Refresh all blocks by iteratively selecting each one that has changed.
	data.select( 'core/editor' ).getBlocks().forEach( ( { name, clientId } ) => {
		if ( changedNames.includes( name ) ) {
			data.dispatch( 'core/editor' ).selectBlock( clientId );
		}
	} );

	// Reselect whatever was selected in the beginning.
	if ( selectedBlockId ) {
		data.dispatch( 'core/editor' ).selectBlock( selectedBlockId );
	} else {
		data.dispatch( 'core/editor' ).clearSelectedBlock();
	}
	selectedBlockId = null;
};

/**
 * Register a new or updated plugin.
 */
export const registerPlugin = ( { name, options, filters, styles } ) => {
	if ( name && options ) {
		plugins.registerPlugin( name, options );
	}
};

/**
 * Unregister an updated or removed plugin.
 */
export const unregisterPlugin = ( { name, options, filters, styles } ) => {
	if ( name && options ) {
		plugins.unregisterPlugin( name );
	}
};
