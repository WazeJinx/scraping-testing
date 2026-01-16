export async function apiKeyAuth(app) {
  app.addHook("onRequest", async (req, reply) => {
    if (req.url === "/" || req.url.startsWith("/swagger")) {
      return;
    }

    const key = req.headers["x-api-key"];

    if (!key || key !== process.env.API_KEY) {
      reply.code(401).send({
        error: "Unauthorized",
      });
    }
  });
}
