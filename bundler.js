const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const babel = require('babel-core');
const traverse = require('babel-traverse').default;

let ID = 0;

// reads in a file, generates its AST, and extracts deps info
function createAsset(filename) {
    const content = fs.readFileSync(filename, 'utf-8');

    const ast = babylon.parse(content, {
        sourceType: 'module'
    });

    const dependencies = [];

    // find all imports in the ast
    // TODO: For fun, implement this by hand
    traverse(ast, {
        ImportDeclaration: ({node}) => {
            // ES modules are static, so we can always count
            // on them to be strings. No runtime eval needed to resolve
            // the module name.
            dependencies.push(node.source.value);
        }
    });

    const id = ID++;

    const {code} = babel.transformFromAst(ast, null, {
        presets: ['env']
    });

    return {
        id,
        filename,
        dependencies,
        code
    };
}

// TODO: Circular deps?
function depsGraphBuilder(entryPoint) {
    const mainAsset = createAsset(entryPoint);
    let depsGraph = [mainAsset];

    for (const asset of depsGraph) {
        const dirname = path.dirname(asset.filename);
        asset.mapping = {};

        asset.dependencies.forEach(relativePath => {
            const absPath = path.join(dirname, relativePath);
            const child = createAsset(absPath);
            asset.mapping[relativePath] = child.id;
            depsGraph.push(child);
        });
    }

    return depsGraph;
}

function bundle(graph) {
    let modules = '';

    graph.forEach(node => {
        modules += `${node.id}: [
            function (require, module, exports) {
                ${node.code}
            },
            ${JSON.stringify(node.mapping)}
        ],`
    });

    const result = `
        (function(modules){
            function require(id) {
                const [fn, mapping] = modules[id];

                function localRequire(relPath) {
                    return require(mapping[relPath]);
                }

                const module = {
                    exports: {}
                };

                fn(localRequire, module, module.exports);

                return module.exports;
            }

            require(0);
        })({${modules}})
    `;

    return result;
}

const graph = depsGraphBuilder('./example/entry.js');
const result = bundle(graph);
console.log(result);
