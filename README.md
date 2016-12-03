# restrict-imports-plugin
Check es6 imports with WebPack

*Using example:*

```
var restrictImportsPlugin = new RestrictImportsPlugin({
	chunks: [ // restrict by chunk name
		{
			name: 'applicationEntry',
			disallowedImports: ['/components/web/'],
			disallowedImportsExceptions: [
				'...some path',
			]
		}
	],
	folders: [ // restrict by folder name
		{
			match: 'src/commons',
			allowedImports: [
				'/commons/',
			]
		}
	]
})
```