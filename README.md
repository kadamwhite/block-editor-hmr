# Hot-Reloading Utilities for the WordPress Block Editor

This library aims to make hot-reloading Gutenberg editor blocks & plugins as simple as possible.

## What does this solve?

When you run a `--hot` DevServer with [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/), you may experience errors when a hot update tries to re-register an already-registered block. Removing or changing block registrations can also lead to unexpected errors if a block's editing interface is visible within the Editor area, and hot updates may not immediately be reflected in the editor until a user action prompts a re-render.

This library provides a utility which will deregister outgoing blocks as they hot-reload, allowing the new version to be restored properly. It also manages selection state, so that your selected block is reopened after the editor and any changed blocks are visually refreshed.

## Hot-Reloading Boilerplate

To use this library, a small snippet of code is required in the file where you register your custom block.

Assuming your blocks are stored in a folder organized like this:

```
src
└── blocks
    ├── block-a
    │   ├── block.json
    │   └── index.js
    ├── block-b
    │   ├── block.json
    │   └── index.js
    └── block-c
        ├── block.json
        └── index.js
```
and that you are [building your project into per-block bundles using `wp-scripts build`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/#build), you can require this package within a JS module's `if ( module.hot ) { ... }` block to facilitate hot-reloading without "block already registered" errors or jumps in the editor due to changes in what block is selected.

The standard boilerplate expected by this utility can be seen at the bottom of this example block `index.js`:

```js
import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import edit from './edit';
import save from './save';

import './style.scss';

registerBlockType( metadata.name, {
	...metadata,
	edit,
	save,
} );

// Block HMR boilerplate.
if ( module.hot ) {
	module.hot.accept();
	const { deregisterBlock, refreshEditor } = require( '../../helpers/hot-blocks.js' );
	module.hot.dispose( deregister( metadata.name ) );
	refresh( metadata.name, module.hot.data );
}
```

## API

### `deregisterBlock( blockName: string, variants: ?object )`

The `deregisterBlock` function returns a callback which should be passed to `module.hot.dispose()`, which cleans up the outgoing block before the new version gets registered. It takes the name of a block (required), and an optional object of block filters and styles to unhook.

#### Hot-swapping block styles and block editor filters

This second `variants` argument can be used when your block sets up JS-side [block styles](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-styles/) or [filter hooks](https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/) on initialization, to avoid double-registering styles or filters when re-registering the new version of the block. For example,

```js
// This is the bottom of index.js, after the normal block registration
// boilerplate as shown in the example above.

// This block declares several style variations. We need to unhook each one
// before registering the new version of the block.
const styles = [
	{
		name: 'light',
		label: __( 'Light', 'textdomain' ),
		isDefault: true,
	},
	{
		name: 'dark',
		label: __( 'Dark', 'textdomain' ),
	},
];

styles.forEach( ( style ) => registerBlockStyle( metadata.name, style ) );

// Block HMR boilerplate.
if ( module.hot ) {
	module.hot.accept();
	const { deregister, refresh } = require( '../../helpers/hot-blocks.js' );
	// Pass the styles array into `deregister()` to dispose of them correctly.
	module.hot.dispose( deregister( metadata.name, { styles } ) );
	refresh( metadata.name, module.hot.data );
}
```

This can also be done with an array of filters, passing an array of objects with `hook` and `namespace` strings to `deregister( metadata.name, { hooks: [ ... ] } )`. Here's an example of how you'd define your filters using a `hooks` array that can be passed to deregister later:

```js
const hooks = [
	{
		hook: 'blocks.registerBlockType',
		namespace: 'my-plugin/class-names/list-block',
		callback: addListBlockClassName
	},
];

hooks.forEach( ( { hook, namespace, callback } ) => {
	wp.hooks.addFilter( hook, namespace, callback );
} );
```

### `refreshEditor( blockName: string, data: object )`

The `refreshEditor` function in the HMR boilerplate above handles resetting the editor state appropriately after the new version of a block comes in. If a block is deregistered and then re-registered, it will lose focus in the editor. If the edit method for that block changes its UI on `isSelected`, this can cause unexpected layout shifts and prevent easy iteration on edit method subcomponents.

Hot-reloading will work without it, but it should be a smoother experience if you maintain this in your HMR boilerplate.

## Script Dependencies

For this to work, the bundle which utilizes these methods must be enqueued specifying `wp-blocks`, `wp-hooks`, and `wp-data` as script dependencies.

## How does it work?

If we try to register a block without unregistering it first, the block editor throws an error and refuses to process the newer version of the block. We therefore unregister each hot-block at the start of the HMR update cycle (within `module.hot.dispose()`, when the outgoing version is being processed) and then register the new block in its place.

### Can we simplify that boilerplate?

It's possible this could be simplified further, but testing to date indicates that `module.hot.accept` must be called _within_ the module file within your project, rather than being abstracted within the third-party NPM module.

## What if I do not use per-block bundles?

While we recommend following `wp-scripts`' preferred structure and bundling your JS at the level of an individual block (for both performance and maintainability reasons), if you do still use a kitchen-sink bundle for all of your blocks, [you may prefer to stick with the legacy `v0.7.0` API documented here](https://github.com/kadamwhite/block-editor-hmr/tree/684b63e60208f047703ddebf0f8f351525e4bebe/README.md).
