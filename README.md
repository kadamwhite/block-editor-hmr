# Hot-Reloading Utilities for the WordPress Block Editor

This library aims to make hot-reloading Gutenberg editor blocks & plugins as simple as possible.

## Auto-Loading Blocks

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
	const { deregister, refresh } = require( '../../helpers/hot-blocks.js' );
	module.hot.dispose( deregister( metadata.name ) );
	refresh( metadata.name, module.hot.data );
}
```

## Script Dependencies

For this to work, the bundle which utilizes these methods must be enqueued specifying `wp-blocks`, `wp-hooks`, and `wp-data` as script dependencies.

## How does it work?

If we try to register a block without unregistering it first, the block editor throws an error and refuses to process the newer version of the block. We therefore unregister each hot-block at the start of the HMR update cycle (within `module.hot.dispose()`, when the outgoing version is being processed) and then register the new block in its place.

### Can we simplify that boilerplate?

It's possible this could be simplified further, but testing to date indicates that `module.hot.accept` _must_ be called from the entrypoint file within your project, rather than being abstracted within the third-party NPM module.

## What if I do not use per-block bundles?

While we recommend following `wp-scripts`' preferred structure and bundling your JS at the level of an individual block (for both performance and maintainability reasons), if you do still use a kitchen-sink bundle for all of your blocks, [you may prefer to stick with the legacy `v0.7.0` API documented here](https://github.com/kadamwhite/block-editor-hmr/tree/684b63e60208f047703ddebf0f8f351525e4bebe/README.md).
