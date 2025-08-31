// @ts-check

/**
 * @param {import('jscodeshift').API} api
 * @param {import('jscodeshift').Collection} root
 * @param {string} moduleName
 * @param {string[]} identifierNames 
 */
module.exports.addOrUpdateImport = function(api, root, moduleName, identifierNames) {
    const existingImport = root
        .find(api.j.ImportDeclaration)
        .filter(path => path.node.source.value === moduleName);

    if (existingImport.length) {
        const specifiers = existingImport.get().node.specifiers;
        const existingNames = specifiers.map(s => s.local.name);
        const newNames = identifierNames.filter(name => !existingNames.includes(name));
        
        if (newNames.length) {
            existingImport.get().node.specifiers = [
                ...specifiers,
                ...newNames.map(name => api.j.importSpecifier(api.j.identifier(name)))
            ];
        }
    } else {
        root.get().node.program.body.unshift(
            createImportDeclaration(api, identifierNames, moduleName)
        );
    }
}

/**
 * @param {import('jscodeshift').API} api 
 * @param {string[]} identifierNames
 * @param {string} moduleName
 */
function createImportDeclaration(api, identifierNames, moduleName) {
    return api.j.importDeclaration(
        identifierNames.map(name => api.j.importSpecifier(api.j.identifier(name))),
        api.j.literal(moduleName)
    )
}
