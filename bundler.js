const fs = require('fs');
const babylon = require('babylon');
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

    return {
        id,
        filename,
        dependencies
    };
}

const mainAsset = createAsset('./example/entry.js');
console.log(mainAsset);