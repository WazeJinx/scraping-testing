import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import { apiKeyAuth } from "./app/server/plugins/apiKey.js";
import fastifyRateLimit from "@fastify/rate-limit";

import { getQuotes } from "./app/server/quotes/quotes.js";
import { getVlrMatches } from "./app/server/vlr/matches/matches.js";
import { getVlrResults } from "./app/server/vlr/results/results.js";
import { getVlrNews } from "./app/server/vlr/news/news.js";

const app = fastify({ logger: true });

await app.register(apiKeyAuth);
await app.register(fastifyRateLimit, {
  max: 10,
  timeWindow: "1 minute",
});
await app.register(fastifyCors, { origin: true });

// Swagger
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Web Scraping Testing",
      description:
        "[Playwright](https://www.scrapingbee.com/blog/playwright-web-scraping/)",
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
      description: "Valorant matches scraped from vlr.gg",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            source: { type: "string" },
            fetchedAt: { type: "number" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  teamA: { type: "string" },
                  regionA: { type: "string" },
                  teamB: { type: "string" },
                  regionB: { type: "string" },
                  time: { type: "string" },
                  event: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { page = 1, limit = 10 } = request.query;
    const result = await getVlrMatches(page, limit);

    reply.header("x-data-source", result.source);
    reply.header("x-fetched-at", new Date(result.fetchedAt).toISOString());

    return result;
  }
);

app.get(
  "/results",
  {
    schema: {
      description: "Valorant results scraped from vlr.gg",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 50, default: 50 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            source: { type: "string" },
            fetchedAt: { type: "number" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  teamA: { type: "string" },
                  teamB: { type: "string" },
                  regionA: { type: "string" },
                  regionB: { type: "string" },
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
    },
  },
  async (request, reply) => {
    const { page = 1, limit = 10 } = request.query;
    const result = await getVlrResults(page, limit);

    reply.header("x-data-source", result.source);
    reply.header("x-fetched-at", new Date(result.fetchedAt).toISOString());

    return result;
  }
);

app.get(
  "/news",
  {
    schema: {
      description: "Latest news scraped from vlr.gg",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 50, default: 30 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            source: { type: "string" },
            fetchedAt: { type: "number" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  shortDesc: { type: "string" },
                  date: { type: "string" },
                  author: { type: "string" },
                  region: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 10;

    const result = await getVlrNews(page, limit);

    reply.header("x-data-source", result.source);
    reply.header("x-fetched-at", new Date(result.fetchedAt).toISOString());

    return result;
  }
);

const PORT = process.env.PORT || 3000;
await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`swagger http://localhost:${PORT}/swagger`);
