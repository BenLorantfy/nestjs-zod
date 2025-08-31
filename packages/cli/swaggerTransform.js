// @ts-check

const { addOrUpdateImport } = require('./utils');

/**
 * 
 * @param {import('jscodeshift').FileInfo} fileInfo 
 * @param {import('jscodeshift').API} api 
 * @returns 
 */
module.exports = function(fileInfo, api) {
    const root = api.jscodeshift(fileInfo.source);

    addOrUpdateImport(api, root, '@nestjs/swagger', ['SwaggerModule', 'DocumentBuilder']);
    addOrUpdateImport(api, root, 'nestjs-zod', ['cleanupOpenApiDoc']);

    if (!checkAlreadyCreatingOpenApiDoc(api, root)) {
        const appDeclaration = findAppDeclaration(api, root);
        const openApiDoc = createOpenApiDoc(api);
        const swaggerSetup = createSwaggerSetup(api);

        appDeclaration.insertAfter(swaggerSetup);
        appDeclaration.insertAfter(openApiDoc);

        return root.toSource();
    }

    // Find SwaggerModule.setup call
    const swaggerSetupCall = root.find(api.j.CallExpression).filter(path => {
        const callee = path.node.callee;
        return callee?.type === 'MemberExpression' &&
               callee.object?.type === 'Identifier' &&
               callee.object.name === 'SwaggerModule' &&
               callee.property?.type === 'Identifier' &&
               callee.property.name === 'setup';
    });

    if (swaggerSetupCall.length > 0) {
        // Get the openApiDoc argument
        const setupCall = swaggerSetupCall.get();
        const openApiDocArg = setupCall.node.arguments[2];
        
        // Only wrap if not already wrapped
        if (!(openApiDocArg.type === 'CallExpression' && 
              openApiDocArg.callee.type === 'Identifier' &&
              openApiDocArg.callee.name === 'cleanupOpenApiDoc')) {
            
            setupCall.node.arguments[2] = api.j.callExpression(
                api.j.identifier('cleanupOpenApiDoc'),
                [openApiDocArg]
            );
        }
    }

    return root.toSource();
};

/**
 * @param {import('jscodeshift').API} api 
 * @param {import('jscodeshift').Collection} root 
 * @returns {boolean} Whether an OpenAPI doc is already being created
 */
function checkAlreadyCreatingOpenApiDoc(api, root) {
    const existingOpenApiDoc = root.find(api.j.VariableDeclarator).filter(path => {
        const init = path.node.init;
        return init?.type === 'CallExpression' &&
               init.callee?.type === 'MemberExpression' &&
               init.callee.object?.type === 'Identifier' &&
               init.callee.object.name === 'SwaggerModule' &&
               init.callee.property?.type === 'Identifier' &&
               init.callee.property.name === 'createDocument';
    });

    return existingOpenApiDoc.length > 0;
}

/**
 * @param {import('jscodeshift').API} api 
 * @param {import('jscodeshift').Collection} root 
 */
function findAppDeclaration(api, root) {
    const appDeclarations = root.find(api.j.VariableDeclaration).filter(path => {
        const declaration = path.node.declarations[0];
        if (!('init' in declaration)) {
            return false;
        }

        return declaration.init?.type === 'AwaitExpression' && 
               declaration.init.argument?.type === 'CallExpression' &&
               declaration.init.argument.callee?.type === 'MemberExpression' &&
               declaration.init.argument.callee.object?.type === 'Identifier' &&
               declaration.init.argument.callee.object.name === 'NestFactory' &&
               declaration.init.argument.callee.property?.type === 'Identifier' &&
               declaration.init.argument.callee.property.name === 'create';
    });

    assert(appDeclarations.length === 1);

    return appDeclarations;
}

function createOpenApiDoc(api) {
    return api.j.variableDeclaration('const', [
        api.j.variableDeclarator(
            api.j.identifier('openApiDoc'),
            api.j.callExpression(
                api.j.memberExpression(
                    api.j.identifier('SwaggerModule'),
                    api.j.identifier('createDocument')
                ),
                [
                    api.j.identifier('app'),
                    api.j.callExpression(
                        api.j.memberExpression(
                            api.j.callExpression(
                                api.j.memberExpression(
                                    api.j.callExpression(
                                        api.j.memberExpression(
                                            api.j.callExpression(
                                                api.j.memberExpression(
                                                    api.j.newExpression(
                                                        api.j.identifier('DocumentBuilder'),
                                                        []
                                                    ),
                                                    api.j.identifier('setTitle')
                                                ),
                                                [api.j.literal('Example API')]
                                            ),
                                            api.j.identifier('setDescription')
                                        ),
                                        [api.j.literal('Example API description')]
                                    ),
                                    api.j.identifier('setVersion')
                                ),
                                [api.j.literal('1.0')]
                            ),
                            api.j.identifier('build')
                        ),
                        []
                    )
                ]
            )
        )
    ])
}

/**
 * @param {import('jscodeshift').API} api 
 */
function createSwaggerSetup(api) {
    return api.j.expressionStatement(
        api.j.callExpression(
            api.j.memberExpression(
                api.j.identifier('SwaggerModule'),
                api.j.identifier('setup')
            ),
            [
                api.j.literal('api'),
                api.j.identifier('app'),
                api.j.callExpression(
                    api.j.identifier('cleanupOpenApiDoc'),
                    [api.j.identifier('openApiDoc')]
                )
            ]
        )
    )
}

/**
 * @param {unknown} value
 * @returns {asserts value}
 */
function assert(value) {
    if (!value) {
        throw new Error('[nestjs-zod] An error occurred running the codemod to integrate nestjs-zod.  Please see the manual installation steps in the README.');
    }
}