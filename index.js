import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import axios from "axios";
import * as cheerio from "cheerio";

const app = fastify({ logger: true });
await app.register(fastifyCors, { origin: true });

app.get("/", async () => ({ status: "ok" }));

app.get("/quotes", async () => {
  try {
    const { data } = await axios.get("http://quotes.toscrape.com/");
    const $ = cheerio.load(data);

    const quotes = [];

    $(".quote").each((_, el) => {
      const text = $(el).find(".text").text().trim();
      const author = $(el).find(".author").text().trim();

      const tags = $(el)
        .find(".tags .tag")
        .map((_, t) => $(t).text().trim())
        .get();

      quotes.push({
        text,
        author,
        tags,
      });
    });

    return quotes;
  } catch (err) {
    console.error(err);
    return [];
  }
});

const PORT = process.env.PORT || 3000;
await app.listen({ port: PORT, host: "0.0.0.0" });
