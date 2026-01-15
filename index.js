import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import { getQuotes } from "./app/server/quotes/quotes.js";
import { getVlrMatches } from "./app/server/vlr/matches/matches.js";
import { getVlrResults } from "./app/server/vlr/results/results.js";

const app = fastify({ logger: true });

await app.register(fastifyCors, { origin: true });

// Swagger
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Web Scraping Testing",
      description: "API info",
    },
  },
});

await app.register(fastifySwaggerUi, {
  routePrefix: "/swagger",
  exposeRoute: true,
});

app.get("/", async () => ({ status: "ok" }));

app.get(
  "/quotes",
  {
    schema: {
      description: "First scraping test",
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              author: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  async () => getQuotes()
);

// vlr matches
app.get(
  "/matches",
  {
    schema: {
      description: "valoranty matches scraped from vlr.gg",
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              teamA: { type: "string" },
              teamB: { type: "string" },
              time: { type: "string" },
              event: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
  },
  async () => getVlrMatches()
);

// vlr results
app.get(
  "/results",
  {
    schema: {
      description: "valorant results scraped from vlr.gg",
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              teamA: { type: "string" },
              teamB: { type: "string" },
              scoreA: { type: "string" },
              scoreB: { type: "string" },
              time: { type: "string" },
              event: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
  },
  async () => getVlrResults()
);

const PORT = process.env.PORT || 3000;
await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`swagger http://localhost:${PORT}/swagger`);
