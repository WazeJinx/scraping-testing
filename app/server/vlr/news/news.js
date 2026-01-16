import { chromium } from "playwright";
import { cleanText } from "../../../utils/formatter.js";
import { cache } from "../../../utils/cache.js";

const cacheInterval = 5 * 60 * 1000; // 5 minutes
const itemsPage = 30;

export const getVlrNews = async (page = 1, limit = itemsPage) => {
  const cacheKey = `vlrNews_page${page}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].lastFetched < cacheInterval) {
    const cached = { ...cache[cacheKey] };
    const pageResults =
      limit < cached.data.length ? cached.data.slice(0, limit) : cached.data;

    return {
      source: "cache",
      fetchedAt: cached.lastFetched,
      page,
      limit,
      totalPages: cached.totalPages,
      data: pageResults,
    };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "UTC",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  const pageObj = await context.newPage();

  try {
    const url =
      page === 1
        ? "https://www.vlr.gg/news"
        : `https://www.vlr.gg/news/?page=${page}`;

    await pageObj.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pageObj.waitForSelector(".wf-module-item", { timeout: 10000 });

    const rawNews = await pageObj.$$eval(".wf-module-item", (items) =>
      items.map((el) => {
        const headline =
          el.querySelector("div[style*='font-weight: 700']")?.textContent || "";
        const shortDesc =
          el.querySelector("div[style*='font-size: 13px']")?.textContent || "";
        const metaEl = el.querySelector(".ge-text-light");

        let date = "Unknown";
        let author = "Unknown";
        let region = "Unknown";

        if (metaEl) {
          const metaText = metaEl.textContent || "";
          const dateMatch = metaText.match(/(\w+ \d{1,2}, \d{4})/);
          const authorMatch = metaText.match(/by\s+(.+)$/);
          date = dateMatch ? dateMatch[1].trim() : "Unknown";
          author = authorMatch ? authorMatch[1].trim() : "Unknown";

          const flagEl = metaEl.querySelector("i.flag");
          if (flagEl) {
            const cls = Array.from(flagEl.classList).find((c) =>
              c.startsWith("mod-")
            );
            if (cls) region = cls.replace("mod-", "").toUpperCase();
          }
        }

        return {
          headline: headline.trim(),
          shortDesc: shortDesc.trim(),
          date,
          author,
          region,
        };
      })
    );

    const totalPages = await pageObj.$$eval(
      ".action-container-pages .btn.mod-page",
      (els) => {
        let max = 1;
        els.forEach((el) => {
          const n = parseInt(el.textContent);
          if (!isNaN(n) && n > max) max = n;
        });
        return max;
      }
    );

    const news = rawNews.map((n) => ({
      headline: cleanText(n.headline),
      shortDesc: cleanText(n.shortDesc),
      date: cleanText(n.date),
      author: cleanText(n.author),
      region: cleanText(n.region),
    }));

    cache[cacheKey] = {
      data: news,
      lastFetched: now,
      totalPages,
    };

    const pageResults = limit < news.length ? news.slice(0, limit) : news;

    return {
      source: "scrape",
      fetchedAt: now,
      page,
      limit,
      totalPages,
      data: pageResults,
    };
  } catch (err) {
    console.error(err);
    return cache[cacheKey]
      ? {
          source: "error",
          fetchedAt: cache[cacheKey].lastFetched,
          page,
          limit,
          totalPages: cache[cacheKey].totalPages,
          data: cache[cacheKey].data.slice(0, limit),
        }
      : {
          source: "error",
          fetchedAt: now,
          page,
          limit,
          totalPages: 0,
          data: [],
        };
  } finally {
    await pageObj.close();
    await context.close();
    await browser.close();
  }
};
