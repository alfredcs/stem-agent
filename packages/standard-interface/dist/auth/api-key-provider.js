"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyProvider = void 0;
/**
 * Authenticates requests using a static API key store.
 * Keys are matched against a configured map of key -> principal metadata.
 */
class ApiKeyProvider {
    type = "api_key";
    keys;
    constructor(config) {
        this.keys = config.keys;
    }
    async authenticate(credential) {
        if (credential.type !== "api_key")
            return null;
        const entry = this.keys[credential.value];
        if (!entry)
            return null;
        return {
            id: entry.id,
            type: "service",
            attributes: {},
            roles: entry.roles ?? [],
            permissions: entry.permissions ?? [],
            credential,
        };
    }
}
exports.ApiKeyProvider = ApiKeyProvider;
//# sourceMappingURL=api-key-provider.js.map