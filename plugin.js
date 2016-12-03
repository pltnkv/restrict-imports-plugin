function RestrictImportsPlugin(options) {
	this.userOptions = options
}

RestrictImportsPlugin.prototype.apply = function (compiler) {
	var options = this.userOptions

	compiler.plugin("emit", function (compilation, callback) {
		var stats = compilation.getStats().toJson();
		var allowedImportsByChunk = {}
		var restrictedImportsByChunk = {}
		var ignoredRestrictedImportsByChunk = {}

		stats.chunks.forEach((chunk) => {
			var currentChunkName = chunk.names[0]
			var opt = options.chunks.find((o) => o.name === currentChunkName)
			if (opt) {
				allowedImportsByChunk[chunk.id] = opt.allowedImports // не реализовано
				restrictedImportsByChunk[chunk.id] = opt.disallowedImports
				ignoredRestrictedImportsByChunk[chunk.id] = opt.disallowedImportsExceptions
			}
		})

		function getChunkNameById(id) {
			return (stats.chunks.find(chunk => chunk.id === id) || {names: ['undefined']}).names[0]
		}

		function isIgnored(name, chunkId) {
			var ignoredRestrictedImports = ignoredRestrictedImportsByChunk[chunkId]
			return ignoredRestrictedImports.some(ignoredRestrictedImport => name.indexOf(ignoredRestrictedImport) !== -1)
		}

		function checkByChunk(module) {
			var name = module.name
			module.chunks.forEach(chunkId => {
				var restrictedImports = restrictedImportsByChunk[chunkId]
				if (restrictedImports) {
					restrictedImports.forEach((restriction) => {
						if (name.indexOf(restriction) !== -1 && !isIgnored(name, chunkId)) {
							var e = new Error(`'${name}' can not be imported in '${getChunkNameById(chunkId)}' chunk because restrictedImports includes '${restriction}'`)
							compilation.errors.push(e)
						}
					})
				}
			})
		}

		var invertedDepListByFolders = {}

		function buildInvertedList(module) {
			module.reasons.forEach(reason => {
				addInvertedDep(reason.moduleName, module.name)
			})
		}

		function addInvertedDep(importing, imported) {
			options.folders.forEach(folder => {
				var folderName = folder.match
				if (importing.indexOf(folderName) !== -1) {
					if (!invertedDepListByFolders[folderName]) {
						invertedDepListByFolders[folderName] = {}
					}
					if (!invertedDepListByFolders[folderName][importing]) {
						invertedDepListByFolders[folderName][importing] = []
					}
					invertedDepListByFolders[folderName][importing].push(imported)
				}
			})
		}

		function checkByFolders() {
			for (var folderName in invertedDepListByFolders) {
				var allowedImports = options.folders.find(folder => folder.match === folderName).allowedImports
				var modulesFromFolder = invertedDepListByFolders[folderName]
				for (var importingModuleName in modulesFromFolder) {
					var importedModulesNames = modulesFromFolder[importingModuleName]
					var notAllowedImports = importedModulesNames.filter((importedModuleName) => {
						return allowedImports.every((allowedImport) => importedModuleName.indexOf(allowedImport) === -1)
					})
					notAllowedImports.forEach((notAllowedImport) => {
						var e = new Error(`'${importingModuleName}' can not import '${notAllowedImport}'`)
						compilation.errors.push(e)
					})
				}
			}
		}

		stats.modules.forEach((module) => {
			checkByChunk(module)
			buildInvertedList(module)
		})
		checkByFolders()
		callback()
	})
}

module.exports = RestrictImportsPlugin

