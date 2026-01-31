import { z } from "zod";

/**
 * tenantRecordSchema is the Zod schema for TenantRecord.
 */
export const tenantRecordSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  plan: z.string().optional(),
  apiKey: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

/**
 * createTenantParamsSchema is the Zod schema for CreateTenantParams.
 */
export const createTenantParamsSchema = tenantRecordSchema.omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  apiKey: true,
});

/**
 * updateTenantParamsSchema is the Zod schema for UpdateTenantParams.
 */
export const updateTenantParamsSchema = createTenantParamsSchema
  .partial()
  .omit({ id: true });

/**
 * inviteRecordSchema is the Zod schema for InviteRecord.
 */
export const inviteRecordSchema = z.object({
  code: z.string(),
  createdAt: z.number(),
  redeemedBy: z.string().optional(),
  redeemedAt: z.number().optional(),
});

/**
 * createInviteParamsSchema is the Zod schema for CreateInviteParams.
 */
export const createInviteParamsSchema = z.object({
  code: z.string().optional(),
});

/**
 * worldRecordSchema is the Zod schema for WorldRecord.
 */
export const worldRecordSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  label: z.string(),
  description: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

/**
 * createWorldParamsSchema is the Zod schema for CreateWorldParams.
 */
export const createWorldParamsSchema = worldRecordSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

/**
 * updateWorldParamsSchema is the Zod schema for UpdateWorldParams.
 */
export const updateWorldParamsSchema = createWorldParamsSchema.partial();

/**
 * SparqlValue represents a value in a SPARQL result.
 */
export const sparqlValueSchema = z.object({
  type: z.enum(["uri", "literal", "bnode"]),
  value: z.string(),
  "xml:lang": z.string().optional(),
  datatype: z.string().optional(),
});

/**
 * SparqlSelectResults represents the results of a SPARQL SELECT query.
 */
export const sparqlSelectResultsSchema = z.object({
  head: z.object({
    vars: z.array(z.string()),
    link: z.array(z.string()).optional(),
  }),
  results: z.object({
    bindings: z.array(z.record(z.string(), sparqlValueSchema)),
  }),
  boolean: z.undefined().optional(),
});

/**
 * SparqlAskResults represents the results of a SPARQL ASK query.
 */
export const sparqlAskResultsSchema = z.object({
  head: z.object({
    link: z.array(z.string()).optional(),
  }),
  boolean: z.boolean(),
  results: z.undefined().optional(),
});

/**
 * SparqlQuad represents a single quad result (for CONSTRUCT/DESCRIBE).
 */
export const sparqlQuadSchema = z.object({
  subject: z.object({
    type: z.enum(["uri", "bnode"]),
    value: z.string(),
  }),
  predicate: z.object({
    type: z.literal("uri"),
    value: z.string(),
  }),
  object: sparqlValueSchema,
  graph: z.object({
    type: z.enum(["default", "uri"]),
    value: z.string(),
  }),
});

/**
 * SparqlQuadsResults represents the results of a SPARQL CONSTRUCT/DESCRIBE query.
 */
export const sparqlQuadsResultsSchema = z.object({
  head: z.object({
    link: z.array(z.string()).optional(),
  }),
  results: z.object({
    quads: z.array(sparqlQuadSchema),
  }),
  boolean: z.undefined().optional(),
});

/**
 * SparqlResult represents the result of a SPARQL query.
 */
export const sparqlResultSchema = z.union([
  sparqlSelectResultsSchema,
  sparqlAskResultsSchema,
  sparqlQuadsResultsSchema,
]);
