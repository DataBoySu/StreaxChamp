/**
 * Shim for @protobufjs/inquire to avoid eval() calls in Vite/Node environments.
 * Protobufjs uses inquire to dynamically check for environment features, which triggers security warnings.
 */
module.exports = function inquire(moduleName) {
    try {
        const mod = require(moduleName);
        return mod;
    } catch (e) {
        return null;
    }
};
