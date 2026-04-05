import { z } from "zod";
/** Episodic memory record — a single interaction or event. */
export declare const EpisodeSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodNumber;
    actors: z.ZodArray<z.ZodString, "many">;
    actions: z.ZodArray<z.ZodString, "many">;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    outcome: z.ZodOptional<z.ZodString>;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    importance: z.ZodDefault<z.ZodNumber>;
    summary: z.ZodOptional<z.ZodString>;
    /** Dynamic utility score updated from outcome feedback (ATLAS). */
    utility: z.ZodOptional<z.ZodNumber>;
    /** Number of times this memory was retrieved. */
    retrievalCount: z.ZodOptional<z.ZodNumber>;
    /** Timestamp of last retrieval. */
    lastRetrieved: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: number;
    actors: string[];
    actions: string[];
    context: Record<string, unknown>;
    importance: number;
    outcome?: string | undefined;
    embedding?: number[] | undefined;
    summary?: string | undefined;
    utility?: number | undefined;
    retrievalCount?: number | undefined;
    lastRetrieved?: number | undefined;
}, {
    id: string;
    timestamp: number;
    actors: string[];
    actions: string[];
    context?: Record<string, unknown> | undefined;
    outcome?: string | undefined;
    embedding?: number[] | undefined;
    importance?: number | undefined;
    summary?: string | undefined;
    utility?: number | undefined;
    retrievalCount?: number | undefined;
    lastRetrieved?: number | undefined;
}>;
export type Episode = z.infer<typeof EpisodeSchema>;
/** Semantic memory — a knowledge triple. */
export declare const KnowledgeTripleSchema: z.ZodObject<{
    id: z.ZodString;
    subject: z.ZodString;
    predicate: z.ZodString;
    object: z.ZodString;
    confidence: z.ZodDefault<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    version: z.ZodDefault<z.ZodNumber>;
    /** Dynamic utility score updated from outcome feedback (ATLAS). */
    utility: z.ZodOptional<z.ZodNumber>;
    /** Number of source episodes merged into this triple. */
    sourceCount: z.ZodOptional<z.ZodNumber>;
    /** Number of times this triple was retrieved. */
    retrievalCount: z.ZodOptional<z.ZodNumber>;
    /** Timestamp of last retrieval. */
    lastRetrieved: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    object: string;
    id: string;
    version: number;
    subject: string;
    predicate: string;
    confidence: number;
    createdAt: number;
    updatedAt: number;
    embedding?: number[] | undefined;
    utility?: number | undefined;
    retrievalCount?: number | undefined;
    lastRetrieved?: number | undefined;
    source?: string | undefined;
    sourceCount?: number | undefined;
}, {
    object: string;
    id: string;
    subject: string;
    predicate: string;
    createdAt: number;
    updatedAt: number;
    version?: number | undefined;
    embedding?: number[] | undefined;
    utility?: number | undefined;
    retrievalCount?: number | undefined;
    lastRetrieved?: number | undefined;
    confidence?: number | undefined;
    source?: string | undefined;
    sourceCount?: number | undefined;
}>;
export type KnowledgeTriple = z.infer<typeof KnowledgeTripleSchema>;
/** Procedural memory — a learned procedure or skill. */
export declare const ProcedureSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    steps: z.ZodArray<z.ZodString, "many">;
    preconditions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    postconditions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    successRate: z.ZodDefault<z.ZodNumber>;
    executionCount: z.ZodDefault<z.ZodNumber>;
    lastUsed: z.ZodOptional<z.ZodNumber>;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    description: string;
    tags: string[];
    steps: string[];
    preconditions: string[];
    postconditions: string[];
    successRate: number;
    executionCount: number;
    embedding?: number[] | undefined;
    lastUsed?: number | undefined;
}, {
    name: string;
    id: string;
    description: string;
    steps: string[];
    tags?: string[] | undefined;
    embedding?: number[] | undefined;
    preconditions?: string[] | undefined;
    postconditions?: string[] | undefined;
    successRate?: number | undefined;
    executionCount?: number | undefined;
    lastUsed?: number | undefined;
}>;
export type Procedure = z.infer<typeof ProcedureSchema>;
/** Caller/user profile (from design doc Sec 7.2). */
export declare const CallerProfileSchema: z.ZodObject<{
    callerId: z.ZodString;
    philosophy: z.ZodObject<{
        pragmatismVsIdealism: z.ZodDefault<z.ZodNumber>;
        simplicityVsCompleteness: z.ZodDefault<z.ZodNumber>;
        depthVsBreadth: z.ZodDefault<z.ZodNumber>;
        riskTolerance: z.ZodDefault<z.ZodNumber>;
        innovationOrientation: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        pragmatismVsIdealism: number;
        simplicityVsCompleteness: number;
        depthVsBreadth: number;
        riskTolerance: number;
        innovationOrientation: number;
    }, {
        pragmatismVsIdealism?: number | undefined;
        simplicityVsCompleteness?: number | undefined;
        depthVsBreadth?: number | undefined;
        riskTolerance?: number | undefined;
        innovationOrientation?: number | undefined;
    }>;
    style: z.ZodObject<{
        formality: z.ZodDefault<z.ZodNumber>;
        verbosity: z.ZodDefault<z.ZodNumber>;
        technicalDepth: z.ZodDefault<z.ZodNumber>;
        examplesPreference: z.ZodDefault<z.ZodNumber>;
        preferredOutputFormat: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        formality: number;
        verbosity: number;
        technicalDepth: number;
        examplesPreference: number;
        preferredOutputFormat: string;
    }, {
        formality?: number | undefined;
        verbosity?: number | undefined;
        technicalDepth?: number | undefined;
        examplesPreference?: number | undefined;
        preferredOutputFormat?: string | undefined;
    }>;
    habits: z.ZodObject<{
        typicalSessionLength: z.ZodDefault<z.ZodNumber>;
        iterationTendency: z.ZodDefault<z.ZodNumber>;
        questionAsking: z.ZodDefault<z.ZodNumber>;
        contextProviding: z.ZodDefault<z.ZodNumber>;
        peakHours: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        commonTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        typicalSessionLength: number;
        iterationTendency: number;
        questionAsking: number;
        contextProviding: number;
        peakHours: number[];
        commonTopics: string[];
    }, {
        typicalSessionLength?: number | undefined;
        iterationTendency?: number | undefined;
        questionAsking?: number | undefined;
        contextProviding?: number | undefined;
        peakHours?: number[] | undefined;
        commonTopics?: string[] | undefined;
    }>;
    principles: z.ZodDefault<z.ZodObject<{
        communicationStyle: z.ZodDefault<z.ZodString>;
        detailLevel: z.ZodDefault<z.ZodEnum<["brief", "standard", "detailed"]>>;
        preferredResponseFormat: z.ZodDefault<z.ZodString>;
        domainExpertise: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        interactionGoals: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        communicationStyle: string;
        detailLevel: "brief" | "standard" | "detailed";
        preferredResponseFormat: string;
        domainExpertise: Record<string, number>;
        interactionGoals: string[];
    }, {
        communicationStyle?: string | undefined;
        detailLevel?: "brief" | "standard" | "detailed" | undefined;
        preferredResponseFormat?: string | undefined;
        domainExpertise?: Record<string, number> | undefined;
        interactionGoals?: string[] | undefined;
    }>>;
    confidence: z.ZodDefault<z.ZodNumber>;
    totalInteractions: z.ZodDefault<z.ZodNumber>;
    satisfactionScores: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    createdAt: z.ZodDefault<z.ZodNumber>;
    updatedAt: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    callerId: string;
    confidence: number;
    createdAt: number;
    updatedAt: number;
    philosophy: {
        pragmatismVsIdealism: number;
        simplicityVsCompleteness: number;
        depthVsBreadth: number;
        riskTolerance: number;
        innovationOrientation: number;
    };
    style: {
        formality: number;
        verbosity: number;
        technicalDepth: number;
        examplesPreference: number;
        preferredOutputFormat: string;
    };
    habits: {
        typicalSessionLength: number;
        iterationTendency: number;
        questionAsking: number;
        contextProviding: number;
        peakHours: number[];
        commonTopics: string[];
    };
    principles: {
        communicationStyle: string;
        detailLevel: "brief" | "standard" | "detailed";
        preferredResponseFormat: string;
        domainExpertise: Record<string, number>;
        interactionGoals: string[];
    };
    totalInteractions: number;
    satisfactionScores: number[];
}, {
    callerId: string;
    philosophy: {
        pragmatismVsIdealism?: number | undefined;
        simplicityVsCompleteness?: number | undefined;
        depthVsBreadth?: number | undefined;
        riskTolerance?: number | undefined;
        innovationOrientation?: number | undefined;
    };
    style: {
        formality?: number | undefined;
        verbosity?: number | undefined;
        technicalDepth?: number | undefined;
        examplesPreference?: number | undefined;
        preferredOutputFormat?: string | undefined;
    };
    habits: {
        typicalSessionLength?: number | undefined;
        iterationTendency?: number | undefined;
        questionAsking?: number | undefined;
        contextProviding?: number | undefined;
        peakHours?: number[] | undefined;
        commonTopics?: string[] | undefined;
    };
    confidence?: number | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    principles?: {
        communicationStyle?: string | undefined;
        detailLevel?: "brief" | "standard" | "detailed" | undefined;
        preferredResponseFormat?: string | undefined;
        domainExpertise?: Record<string, number> | undefined;
        interactionGoals?: string[] | undefined;
    } | undefined;
    totalInteractions?: number | undefined;
    satisfactionScores?: number[] | undefined;
}>;
export type CallerProfile = z.infer<typeof CallerProfileSchema>;
/** Session-scoped caller context. */
export declare const CallerContextSchema: z.ZodObject<{
    callerId: z.ZodString;
    sessionId: z.ZodString;
    currentGoals: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    activeTasks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    role: z.ZodDefault<z.ZodString>;
    profile: z.ZodOptional<z.ZodObject<{
        callerId: z.ZodString;
        philosophy: z.ZodObject<{
            pragmatismVsIdealism: z.ZodDefault<z.ZodNumber>;
            simplicityVsCompleteness: z.ZodDefault<z.ZodNumber>;
            depthVsBreadth: z.ZodDefault<z.ZodNumber>;
            riskTolerance: z.ZodDefault<z.ZodNumber>;
            innovationOrientation: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            pragmatismVsIdealism: number;
            simplicityVsCompleteness: number;
            depthVsBreadth: number;
            riskTolerance: number;
            innovationOrientation: number;
        }, {
            pragmatismVsIdealism?: number | undefined;
            simplicityVsCompleteness?: number | undefined;
            depthVsBreadth?: number | undefined;
            riskTolerance?: number | undefined;
            innovationOrientation?: number | undefined;
        }>;
        style: z.ZodObject<{
            formality: z.ZodDefault<z.ZodNumber>;
            verbosity: z.ZodDefault<z.ZodNumber>;
            technicalDepth: z.ZodDefault<z.ZodNumber>;
            examplesPreference: z.ZodDefault<z.ZodNumber>;
            preferredOutputFormat: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            formality: number;
            verbosity: number;
            technicalDepth: number;
            examplesPreference: number;
            preferredOutputFormat: string;
        }, {
            formality?: number | undefined;
            verbosity?: number | undefined;
            technicalDepth?: number | undefined;
            examplesPreference?: number | undefined;
            preferredOutputFormat?: string | undefined;
        }>;
        habits: z.ZodObject<{
            typicalSessionLength: z.ZodDefault<z.ZodNumber>;
            iterationTendency: z.ZodDefault<z.ZodNumber>;
            questionAsking: z.ZodDefault<z.ZodNumber>;
            contextProviding: z.ZodDefault<z.ZodNumber>;
            peakHours: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            commonTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            typicalSessionLength: number;
            iterationTendency: number;
            questionAsking: number;
            contextProviding: number;
            peakHours: number[];
            commonTopics: string[];
        }, {
            typicalSessionLength?: number | undefined;
            iterationTendency?: number | undefined;
            questionAsking?: number | undefined;
            contextProviding?: number | undefined;
            peakHours?: number[] | undefined;
            commonTopics?: string[] | undefined;
        }>;
        principles: z.ZodDefault<z.ZodObject<{
            communicationStyle: z.ZodDefault<z.ZodString>;
            detailLevel: z.ZodDefault<z.ZodEnum<["brief", "standard", "detailed"]>>;
            preferredResponseFormat: z.ZodDefault<z.ZodString>;
            domainExpertise: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            interactionGoals: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            communicationStyle: string;
            detailLevel: "brief" | "standard" | "detailed";
            preferredResponseFormat: string;
            domainExpertise: Record<string, number>;
            interactionGoals: string[];
        }, {
            communicationStyle?: string | undefined;
            detailLevel?: "brief" | "standard" | "detailed" | undefined;
            preferredResponseFormat?: string | undefined;
            domainExpertise?: Record<string, number> | undefined;
            interactionGoals?: string[] | undefined;
        }>>;
        confidence: z.ZodDefault<z.ZodNumber>;
        totalInteractions: z.ZodDefault<z.ZodNumber>;
        satisfactionScores: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        createdAt: z.ZodDefault<z.ZodNumber>;
        updatedAt: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        callerId: string;
        confidence: number;
        createdAt: number;
        updatedAt: number;
        philosophy: {
            pragmatismVsIdealism: number;
            simplicityVsCompleteness: number;
            depthVsBreadth: number;
            riskTolerance: number;
            innovationOrientation: number;
        };
        style: {
            formality: number;
            verbosity: number;
            technicalDepth: number;
            examplesPreference: number;
            preferredOutputFormat: string;
        };
        habits: {
            typicalSessionLength: number;
            iterationTendency: number;
            questionAsking: number;
            contextProviding: number;
            peakHours: number[];
            commonTopics: string[];
        };
        principles: {
            communicationStyle: string;
            detailLevel: "brief" | "standard" | "detailed";
            preferredResponseFormat: string;
            domainExpertise: Record<string, number>;
            interactionGoals: string[];
        };
        totalInteractions: number;
        satisfactionScores: number[];
    }, {
        callerId: string;
        philosophy: {
            pragmatismVsIdealism?: number | undefined;
            simplicityVsCompleteness?: number | undefined;
            depthVsBreadth?: number | undefined;
            riskTolerance?: number | undefined;
            innovationOrientation?: number | undefined;
        };
        style: {
            formality?: number | undefined;
            verbosity?: number | undefined;
            technicalDepth?: number | undefined;
            examplesPreference?: number | undefined;
            preferredOutputFormat?: string | undefined;
        };
        habits: {
            typicalSessionLength?: number | undefined;
            iterationTendency?: number | undefined;
            questionAsking?: number | undefined;
            contextProviding?: number | undefined;
            peakHours?: number[] | undefined;
            commonTopics?: string[] | undefined;
        };
        confidence?: number | undefined;
        createdAt?: number | undefined;
        updatedAt?: number | undefined;
        principles?: {
            communicationStyle?: string | undefined;
            detailLevel?: "brief" | "standard" | "detailed" | undefined;
            preferredResponseFormat?: string | undefined;
            domainExpertise?: Record<string, number> | undefined;
            interactionGoals?: string[] | undefined;
        } | undefined;
        totalInteractions?: number | undefined;
        satisfactionScores?: number[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    role: string;
    callerId: string;
    sessionId: string;
    currentGoals: string[];
    activeTasks: string[];
    permissions: string[];
    profile?: {
        callerId: string;
        confidence: number;
        createdAt: number;
        updatedAt: number;
        philosophy: {
            pragmatismVsIdealism: number;
            simplicityVsCompleteness: number;
            depthVsBreadth: number;
            riskTolerance: number;
            innovationOrientation: number;
        };
        style: {
            formality: number;
            verbosity: number;
            technicalDepth: number;
            examplesPreference: number;
            preferredOutputFormat: string;
        };
        habits: {
            typicalSessionLength: number;
            iterationTendency: number;
            questionAsking: number;
            contextProviding: number;
            peakHours: number[];
            commonTopics: string[];
        };
        principles: {
            communicationStyle: string;
            detailLevel: "brief" | "standard" | "detailed";
            preferredResponseFormat: string;
            domainExpertise: Record<string, number>;
            interactionGoals: string[];
        };
        totalInteractions: number;
        satisfactionScores: number[];
    } | undefined;
}, {
    callerId: string;
    sessionId: string;
    role?: string | undefined;
    currentGoals?: string[] | undefined;
    activeTasks?: string[] | undefined;
    permissions?: string[] | undefined;
    profile?: {
        callerId: string;
        philosophy: {
            pragmatismVsIdealism?: number | undefined;
            simplicityVsCompleteness?: number | undefined;
            depthVsBreadth?: number | undefined;
            riskTolerance?: number | undefined;
            innovationOrientation?: number | undefined;
        };
        style: {
            formality?: number | undefined;
            verbosity?: number | undefined;
            technicalDepth?: number | undefined;
            examplesPreference?: number | undefined;
            preferredOutputFormat?: string | undefined;
        };
        habits: {
            typicalSessionLength?: number | undefined;
            iterationTendency?: number | undefined;
            questionAsking?: number | undefined;
            contextProviding?: number | undefined;
            peakHours?: number[] | undefined;
            commonTopics?: string[] | undefined;
        };
        confidence?: number | undefined;
        createdAt?: number | undefined;
        updatedAt?: number | undefined;
        principles?: {
            communicationStyle?: string | undefined;
            detailLevel?: "brief" | "standard" | "detailed" | undefined;
            preferredResponseFormat?: string | undefined;
            domainExpertise?: Record<string, number> | undefined;
            interactionGoals?: string[] | undefined;
        } | undefined;
        totalInteractions?: number | undefined;
        satisfactionScores?: number[] | undefined;
    } | undefined;
}>;
export type CallerContext = z.infer<typeof CallerContextSchema>;
export interface IMemoryManager {
    /** Store an episode in episodic memory. */
    remember(episode: Episode): Promise<void>;
    /** Recall relevant memories for a query. */
    recall(query: string, limit?: number): Promise<Episode[]>;
    /** Learn a new procedure from a successful execution. */
    learn(procedure: Procedure): Promise<void>;
    /** Assemble context for a caller within a token budget. */
    getContext(callerId: string, sessionId: string): Promise<CallerContext>;
    /** Delete caller data (GDPR forget-me). */
    forget(callerId: string): Promise<void>;
    /** Store or update a knowledge triple. */
    storeKnowledge(triple: KnowledgeTriple): Promise<void>;
    /** Search knowledge by similarity. */
    searchKnowledge(query: string, limit?: number): Promise<KnowledgeTriple[]>;
    /** Get or create a caller profile. */
    getCallerProfile(callerId: string): Promise<CallerProfile>;
    /** Update caller profile from interaction. */
    updateCallerProfile(callerId: string, interaction: Record<string, unknown>): Promise<void>;
    /** Get best matching procedure for a task. */
    getBestProcedure(taskDescription: string): Promise<Procedure | null>;
    /** Update utility score for a retrieved episodic memory from outcome reward (ATLAS feedback loop). */
    updateEpisodeUtility(id: string, reward: number): Promise<void>;
    /** Update utility score for a retrieved semantic memory from outcome reward (ATLAS feedback loop). */
    updateKnowledgeUtility(id: string, reward: number): Promise<void>;
    /** Shutdown and flush. */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=memory.d.ts.map