import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

export const app = new OpenAPIHono();

const storeSchema = z.object({
  id: z.string(),
});

app.openapi(
  createRoute({
    method: "get",
    path: "/stores/{id}",
    responses: {
      200: {
        description: "Get a store",
        content: {
          "application/json": {
            schema: storeSchema,
          },
        },
      },
    },
  }),
  (ctx) => {
    return ctx.json({ id: "1" });
  },
);
