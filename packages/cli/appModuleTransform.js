// @ts-check

/**
 * @typedef {import('jscodeshift').Node & { decorators?: import('jscodeshift').Decorator[] }} ClassDeclarationNode
 */

const { addOrUpdateImport } = require('./utils');

/**
 * 
 * @param {import('jscodeshift').FileInfo} fileInfo 
 * @param {import('jscodeshift').API} api 
 * @returns 
 */
module.exports = function(fileInfo, api) {
    const root = api.jscodeshift(fileInfo.source);
    
    const moduleClassDeclaration = getModuleClassDeclaration(api, root);
    const moduleDecorator = getModuleDecorator(moduleClassDeclaration);
    const providersProperty = getProvidersProperty(api, moduleDecorator);

    addOrUpdateImport(api, root, 'zod', ['ZodError']);
    addOrUpdateImport(api, root, '@nestjs/core', ['APP_PIPE', 'APP_INTERCEPTOR', 'APP_FILTER', 'BaseExceptionFilter']);
    addOrUpdateImport(api, root, '@nestjs/common', ['HttpException', 'ArgumentsHost', 'Logger', 'Catch']);
    addOrUpdateImport(api, root, 'nestjs-zod', ['ZodValidationPipe', 'ZodSerializerInterceptor', 'ZodSerializationException']);

    assert(providersProperty.value.type === 'ArrayExpression');

    // Add the app pipe provider to the providers array
    if (!alreadyHasProvider(providersProperty, { providerName: 'APP_PIPE', providerValue: 'ZodValidationPipe' })) {
        providersProperty.value.elements.push(createAppPipeProvider(api));
    }

    // Add the app interceptor provider to the providers array
    if (!alreadyHasProvider(providersProperty, { providerName: 'APP_INTERCEPTOR', providerValue: 'ZodSerializerInterceptor' })) {
        providersProperty.value.elements.push(createAppInterceptorProvider(api));
    }

    // Add the http exception filter provider to the providers array
    if (!alreadyHasProvider(providersProperty, { providerName: 'APP_FILTER', providerValue: 'HttpExceptionFilter' })) {
        providersProperty.value.elements.push(createHttpExceptionFilterProvider(api));
    }

    if (!alreadyHasClass(api, root, 'HttpExceptionFilter')) {
        const httpExceptionFilter = createHttpExceptionFilter(api);
        
        // Find the ExportNamedDeclaration containing AppModule and insert HttpExceptionFilter before it
        const appModuleExport = root.find(api.j.ExportNamedDeclaration).filter(path => 
            path.node.declaration?.type === 'ClassDeclaration' && 
            path.node.declaration.id?.name === 'AppModule'
        );
        
        assert(appModuleExport.length > 0);
        appModuleExport.insertBefore([httpExceptionFilter]);
    }

    return root.toSource();
};



/**
 * Check if the providers array already contains a provider with the given name and value
 * @param {import('jscodeshift').ObjectProperty} providersProperty - The providers property from the Module decorator
 * @param {{ providerName: string, providerValue: string }} provider - The provider to search for
 * @returns {boolean}
 */
function alreadyHasProvider(providersProperty, { providerName, providerValue }) {
    assert(providersProperty?.type === 'ObjectProperty');
    assert(providersProperty.value.type === 'ArrayExpression');

    return providersProperty.value.elements.some(element => {
        if (element?.type !== 'ObjectExpression') return false;
        
        const provideProperty = element.properties.find(p => 
            p.type === 'ObjectProperty' && 
            p.key.type === 'Identifier' && 
            p.key.name === 'provide'
        );
        
        const useClassProperty = element.properties.find(p => 
            p.type === 'ObjectProperty' && 
            p.key.type === 'Identifier' && 
            p.key.name === 'useClass'
        );
        
        return provideProperty?.type === 'ObjectProperty' && 
               provideProperty?.value.type === 'Identifier' && 
               provideProperty.value.name === providerName &&
               useClassProperty?.type === 'ObjectProperty' && 
               useClassProperty?.value.type === 'Identifier' && 
               useClassProperty.value.name === providerValue;
    });
}

/**
 * Check if a class with the given name exists
 * @param {import('jscodeshift').API} api 
 * @param {import('jscodeshift').Collection} root 
 * @param {string} className - The name of the class to search for
 * @returns {boolean}
 */
function alreadyHasClass(api, root, className) {
    const classDeclarations = root.find(api.j.ClassDeclaration);
    return classDeclarations.some(path => 
        path.node.id?.type === 'Identifier' && 
        path.node.id.name === className
    );
}

/**
 * @param {import('jscodeshift').API} api
 * @param {import('jscodeshift').Collection} root
 * @returns {ClassDeclarationNode}
 */
function getModuleClassDeclaration(api, root) {
    const classDeclarations = root.find(api.j.ClassDeclaration);
    const moduleClasses = classDeclarations.filter(path => {
        const node = path.node;
        return /** @type {any} */ (node).decorators?.some(decorator => 
            decorator.expression.type === 'CallExpression' && 
            decorator.expression.callee.type === 'Identifier' && 
            decorator.expression.callee.name === 'Module'
        );
    });
    
    assert(moduleClasses.length === 1);
    return moduleClasses.nodes()[0];
}

/**
 * @param {ClassDeclarationNode} node
 * @returns {import('jscodeshift').Decorator}
 */
function getModuleDecorator(node) {
    const decorator = node.decorators?.find(d => {
        return d.expression.type === 'CallExpression' && d.expression.callee.type === 'Identifier' && d.expression.callee.name === 'Module';
    });
    assert(decorator);

    return decorator;
}

/**
 * @param {import('jscodeshift').API} api
 * @param {import('jscodeshift').Decorator} decorator 
 * @returns {import('jscodeshift').ObjectProperty}
 */
function getProvidersProperty(api, decorator) {
    const objectExpression = api.j(decorator.expression).find(api.j.ObjectExpression);    
    assert(objectExpression.length >= 1);

    const properties = objectExpression.nodes()[0].properties;
    const providersProperty = properties.find(p => {
        return p.type === 'ObjectProperty' && p.key.type === 'Identifier' && p.key.name === 'providers';
    });
    assert(providersProperty?.type === 'ObjectProperty');
    assert(providersProperty.value.type === 'ArrayExpression');

    return providersProperty;
}

/**
 * @param {import('jscodeshift').API} api
 */
function createAppPipeProvider(api) {
    return api.j.objectExpression([
        api.j.property('init', api.j.identifier('provide'), api.j.identifier('APP_PIPE')),
        api.j.property('init', api.j.identifier('useClass'), api.j.identifier('ZodValidationPipe'))
    ]);
}

/**
 * 
 * @param {import('jscodeshift').API} api 
 */
function createAppInterceptorProvider(api) {
    return api.j.objectExpression([
        api.j.property('init', api.j.identifier('provide'), api.j.identifier('APP_INTERCEPTOR')),
        api.j.property('init', api.j.identifier('useClass'), api.j.identifier('ZodSerializerInterceptor'))
    ]);
}

/**
 * @param {import('jscodeshift').API} api 
 */
function createHttpExceptionFilterProvider(api) {
    return api.j.objectExpression([
        api.j.property('init', api.j.identifier('provide'), api.j.identifier('APP_FILTER')),
        api.j.property('init', api.j.identifier('useClass'), api.j.identifier('HttpExceptionFilter'))
    ]);
}

/**
 * @param {import('jscodeshift').API} api 
 */
function createHttpExceptionFilter(api) {
    const httpExceptionFilter = api.j.classDeclaration(
        api.j.identifier('HttpExceptionFilter'),
        api.j.classBody([
            (() => {
                const loggerProperty = api.j.classProperty(
                    api.j.identifier('logger'),
                    api.j.newExpression(
                        api.j.identifier('Logger'),
                        [api.j.memberExpression(
                            api.j.identifier('HttpExceptionFilter'),
                            api.j.identifier('name')
                        )]
                    )
                );
                /** @type {any} */ (loggerProperty).accessibility = 'private';
                return loggerProperty;
            })(),
            (() => {
                const catchMethod = api.j.classMethod(
                    'method',
                    api.j.identifier('catch'),
                    [
                        api.j.identifier('exception'),
                        api.j.identifier('host')
                    ],
                    api.j.blockStatement([
                        api.j.ifStatement(
                            api.j.binaryExpression(
                                'instanceof',
                                api.j.identifier('exception'),
                                api.j.identifier('ZodSerializationException')
                            ),
                            api.j.blockStatement([
                                api.j.variableDeclaration('const', [
                                    api.j.variableDeclarator(
                                        api.j.identifier('zodError'),
                                        api.j.callExpression(
                                            api.j.memberExpression(
                                                api.j.identifier('exception'),
                                                api.j.identifier('getZodError')
                                            ),
                                            []
                                        )
                                    )
                                ]),
                                api.j.ifStatement(
                                    api.j.binaryExpression(
                                        'instanceof',
                                        api.j.identifier('zodError'),
                                        api.j.identifier('ZodError')
                                    ),
                                    api.j.blockStatement([
                                        api.j.expressionStatement(
                                            api.j.callExpression(
                                                api.j.memberExpression(
                                                    api.j.memberExpression(
                                                        api.j.thisExpression(),
                                                        api.j.identifier('logger')
                                                    ),
                                                    api.j.identifier('error')
                                                ),
                                                [api.j.templateLiteral(
                                                    [
                                                        api.j.templateElement({cooked: 'ZodSerializationException: ', raw: 'ZodSerializationException: '}, false),
                                                        api.j.templateElement({cooked: '', raw: ''}, true)
                                                    ],
                                                    [api.j.memberExpression(
                                                        api.j.identifier('zodError'),
                                                        api.j.identifier('message')
                                                    )]
                                                )]
                                            )
                                        )
                                    ])
                                )
                            ])
                        ),
                        api.j.expressionStatement(
                            api.j.callExpression(
                                api.j.memberExpression(
                                    api.j.super(),
                                    api.j.identifier('catch')
                                ),
                                [api.j.identifier('exception'), api.j.identifier('host')]
                            )
                        )
                    ])
                );

                // Manually add TypeScript type annotations to parameters
                /** @type {any} */ (catchMethod.params[0]).typeAnnotation = {
                    type: 'TSTypeAnnotation',
                    typeAnnotation: {
                        type: 'TSTypeReference',
                        typeName: {
                            type: 'Identifier',
                            name: 'HttpException'
                        }
                    }
                };

                /** @type {any} */ (catchMethod.params[1]).typeAnnotation = {
                    type: 'TSTypeAnnotation',
                    typeAnnotation: {
                        type: 'TSTypeReference',
                        typeName: {
                            type: 'Identifier',
                            name: 'ArgumentsHost'
                        }
                    }
                };

                return catchMethod;
            })()
        ]),
        api.j.identifier('BaseExceptionFilter')
    );

    // Add the decorator to the class
    /** @type {any} */ (httpExceptionFilter).decorators = [
        api.j.decorator(
            api.j.callExpression(
                api.j.identifier('Catch'),
                [api.j.identifier('HttpException')]
            )
        )
    ];

    return httpExceptionFilter;
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