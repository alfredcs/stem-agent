"use strict";
// @stem-agent/memory-system — public API
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySystemConfigSchema = exports.PgUserContextStore = exports.PgProceduralStore = exports.PgSemanticStore = exports.PgEpisodicStore = exports.runMigrations = exports.createPgPool = exports.EmbeddingError = exports.MemoryNotFoundError = exports.MemoryError = exports.OpenAIEmbeddingProvider = exports.NoOpEmbeddingProvider = exports.cosineSimilarity = exports.InMemoryUserContextStore = exports.UserContextManager = exports.InMemoryProceduralStore = exports.ProceduralMemory = exports.InMemorySemanticStore = exports.SemanticMemory = exports.InMemoryEpisodicStore = exports.EpisodicMemory = exports.MemoryIndexer = exports.MemoryManager = void 0;
// Manager (IMemoryManager facade)
var manager_js_1 = require("./manager.js");
Object.defineProperty(exports, "MemoryManager", { enumerable: true, get: function () { return manager_js_1.MemoryManager; } });
// Indexer
var indexer_js_1 = require("./indexer.js");
Object.defineProperty(exports, "MemoryIndexer", { enumerable: true, get: function () { return indexer_js_1.MemoryIndexer; } });
// Episodic memory
var index_js_1 = require("./episodic/index.js");
Object.defineProperty(exports, "EpisodicMemory", { enumerable: true, get: function () { return index_js_1.EpisodicMemory; } });
Object.defineProperty(exports, "InMemoryEpisodicStore", { enumerable: true, get: function () { return index_js_1.InMemoryEpisodicStore; } });
// Semantic memory
var index_js_2 = require("./semantic/index.js");
Object.defineProperty(exports, "SemanticMemory", { enumerable: true, get: function () { return index_js_2.SemanticMemory; } });
Object.defineProperty(exports, "InMemorySemanticStore", { enumerable: true, get: function () { return index_js_2.InMemorySemanticStore; } });
// Procedural memory
var index_js_3 = require("./procedural/index.js");
Object.defineProperty(exports, "ProceduralMemory", { enumerable: true, get: function () { return index_js_3.ProceduralMemory; } });
Object.defineProperty(exports, "InMemoryProceduralStore", { enumerable: true, get: function () { return index_js_3.InMemoryProceduralStore; } });
// User context
var index_js_4 = require("./user-context/index.js");
Object.defineProperty(exports, "UserContextManager", { enumerable: true, get: function () { return index_js_4.UserContextManager; } });
Object.defineProperty(exports, "InMemoryUserContextStore", { enumerable: true, get: function () { return index_js_4.InMemoryUserContextStore; } });
// Embeddings
var index_js_5 = require("./embeddings/index.js");
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return index_js_5.cosineSimilarity; } });
Object.defineProperty(exports, "NoOpEmbeddingProvider", { enumerable: true, get: function () { return index_js_5.NoOpEmbeddingProvider; } });
Object.defineProperty(exports, "OpenAIEmbeddingProvider", { enumerable: true, get: function () { return index_js_5.OpenAIEmbeddingProvider; } });
// Errors
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "MemoryError", { enumerable: true, get: function () { return errors_js_1.MemoryError; } });
Object.defineProperty(exports, "MemoryNotFoundError", { enumerable: true, get: function () { return errors_js_1.MemoryNotFoundError; } });
Object.defineProperty(exports, "EmbeddingError", { enumerable: true, get: function () { return errors_js_1.EmbeddingError; } });
// Persistence (PostgreSQL + pgvector)
var index_js_6 = require("./persistence/index.js");
Object.defineProperty(exports, "createPgPool", { enumerable: true, get: function () { return index_js_6.createPgPool; } });
Object.defineProperty(exports, "runMigrations", { enumerable: true, get: function () { return index_js_6.runMigrations; } });
Object.defineProperty(exports, "PgEpisodicStore", { enumerable: true, get: function () { return index_js_6.PgEpisodicStore; } });
Object.defineProperty(exports, "PgSemanticStore", { enumerable: true, get: function () { return index_js_6.PgSemanticStore; } });
Object.defineProperty(exports, "PgProceduralStore", { enumerable: true, get: function () { return index_js_6.PgProceduralStore; } });
Object.defineProperty(exports, "PgUserContextStore", { enumerable: true, get: function () { return index_js_6.PgUserContextStore; } });
// Config & store interfaces
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "MemorySystemConfigSchema", { enumerable: true, get: function () { return types_js_1.MemorySystemConfigSchema; } });
//# sourceMappingURL=index.js.map