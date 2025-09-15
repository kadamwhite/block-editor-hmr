/**
 * Provide helper methods to dynamically reload & reregister blocks in hot-reloading contexts.
 */

declare global {
	interface Window {
		wp: {
			blocks: {
				unregisterBlockType: ( name: string ) => void;
				unregisterBlockStyle: ( blockName: string, styleName: string ) => void;
			};
			hooks: {
				removeFilter: ( hook: string, namespace: string ) => void;
			};
			data: {
				dispatch: ( store: string ) => any;
				select: ( store: string ) => any;
			};
		};
	}
}

type HMRContextData = {
	value?: string,
};

type Variants = {
	styles?: {
		name: string,
	}[],
	filters?: {
		hook: string,
		namespace: string,
	}[],
};

const { unregisterBlockType, unregisterBlockStyle } = window.wp.blocks;
const { removeFilter } = window.wp.hooks;
const { dispatch, select } = window.wp.data;

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
export const deregisterBlock = ( hotBlockName: string, variants: Variants = {} ): (data: object) => void => {
	/**
	 * Callback for module.hot.dispose() to deregister the specified block.
	 *
	 * @param data HMR module.hot.data context object.
	 */
	return ( data: HMRContextData ) => {
		unregisterBlockType( hotBlockName );

		if ( Array.isArray( variants?.styles ) ) {
			variants.styles.forEach( ( style ) =>
				unregisterBlockStyle( hotBlockName, style.name )
			);
		}

		if ( Array.isArray( variants?.filters ) ) {
			variants.filters.forEach( ( { hook, namespace } ) => {
				removeFilter( hook, namespace );
			} );
		}

		const selectedBlockId = select( 'core/block-editor' ).getSelectedBlockClientId();

		if ( selectedBlockId ) {
			dispatch( 'core/block-editor' ).clearSelectedBlock();
		}

		// Pass selected ID through hot-reload cycle.
		data.value = selectedBlockId;
	};
};

/**
 * Process an updated block module, refreshing the editor view as needed.
 *
 * @param {string}           hotBlockName Name of block being hot-reloaded.
 * @param {{value?: string}} [data]       HMR module.hot.data context object, if present.
 */
export const refreshEditor = ( hotBlockName: string, data: HMRContextData ) => {
	// Refresh all copies of our changed block by iteratively selecting them.
	select( 'core/block-editor' )
		.getBlocks()
		.forEach( ( { name, clientId }: { name: string, clientId: string } ) => {
			if ( name === hotBlockName ) {
				dispatch( 'core/block-editor' ).selectBlock( clientId );
			}
		} );

	// Reselect whatever block was selected in the beginning.
	if ( data?.value ) {
		// Reselect within a timeout to allow other hot-reloaded blocks to finish
		// processing before changing focus.
		setTimeout( () => {
			dispatch( 'core/block-editor' ).selectBlock( data.value );
		} );
	}
};
