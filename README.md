# Hot-Reloading Utilities for the WordPress Block Editor

This library aims to make hot-reloading Gutenberg editor blocks & plugins as simple as possible.

## Auto-Loading Blocks

Assuming your blocks are stored in a folder organized like this:

```
src
├── blocks
│   ├── block-a
│   │   └── index.js
│   ├── block-b
│   │   └── index.js
│   └── block-c
│       └── index.js
└── blocks.js
```
and that your block files export at minimum a `name` string and `options` object:

```js
export const name = 'myplugin/block-a';

export const options = {
	title: 'Block A',

	description: 'An excellent example block',

	// icon, category, attributes, edit, save, etcetera
}

```

then you can put this code in `blocks.js` to automatically load and configure every block in your plugin:

```js
/**
 * blocks.js:
 * Dynamically locate, load & register all Gutenberg blocks.
 */
import { autoloadBlocks } from 'block-editor-hmr';

// Load all block index files.
autoloadBlocks(
	{
		/**
		 * Return a project-specific require.context.
		 */
		getContext: () => require.context( './blocks', true, /index\.js$/ ),
	},
	( context, loadModules ) => {
		if ( module.hot ) {
			module.hot.accept( context.id, loadModules );
		}
	}
);

```

## Block Editor Plugins

The same logic applies if you want to register block editor plugins: export a `name` and `options` from each plugin module, then use the provided `registerPlugin` and `unregisterPlugin` methods within your plugins entrypoint file.

```js
/**
 * plugins.js:
 * Dynamically locate, load & register all Gutenberg plugins.
 */
import { autoloadPlugins } from 'block-editor-hmr';

// Load all plugin index files.
autoloadPlugins(
	{
		/**
		 * Return a project-specific require.context.
		 */
		getContext: () => require.context( './plugins', true, /index\.js$/ ),
	},
	( context, loadModules ) => {
		if ( module.hot ) {
			module.hot.accept( context.id, loadModules );
		}
	}
);
```

## Need More Control?

In case you need more control over things, the library also exports a generic `autoload` function, as well as any block- or plugin-specific function that is used as a default value.

```
import {
	autoload,

	registerBlock,
	unregisterBlock,
	beforeUpdateBlocks,
	afterUpdateBlocks,

	registerPlugin,
	unregisterPlugin,
} from 'block-editor-hmr';
```

This means you can either pass select custom values to `autoloadBlocks` and `autoloadPlugins`, or roll your own autoloader via a fully custom `autoload`.  

## Script Dependencies

For this to work, the bundle which utilizes these methods must be enqueued specifying `wp-blocks`, `wp-plugins`, `wp-hooks`, and `wp-data` as script dependencies.

## How does it work?

[The `require.context` Webpack documentation is available here.](https://webpack.js.org/guides/dependency-management/#requirecontext)

`require.context` allows you to pass in a directory to search, a flag indicating whether subdirectories should be searched too, and a regular expression to match files against. The `autoload` method takes this context, uses it to load matching JS modules, then passes those modules through the `register` and `unregister` hooks as necessary. `before` and `after` hooks are provided to support things like maintaining block context, so that an update doesn't deselect the block you're working on.

It's possible this could be simplified further, but testing to date indicates that `require.context` and `module.hot.accept` _must_ be called from the entrypoint file within your project, rather than being abstracted within the third-party NPM module.

## A note on ESNext

Note that at present, this file is not transpiled and may break some build processes. A built file with wider browser compatibility is my next step for this project.
