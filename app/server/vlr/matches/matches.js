import { chromium } from "playwright";
import { cleanText, safeTime } from "../../../utils/formatter.js";
import { cache } from "../../../utils/cache.js";

const cacheInterval = 5 * 60 * 1000; // 5 minutes
const itemsPage = 30; // site page size

export const getVlrMatches = async (page = 1, limit = 30) => {
  const now = Date.now();
  const cacheKey = `vlrMatches_page${page}_limit${limit}`;

  if (cache[cacheKey] && now - cache[cacheKey].lastFetched < cacheInterval) {
    return {
      source: "cache",
      fetchedAt: cache[cacheKey].lastFetched,
      page,
      limit,
      totalPages: cache[cacheKey].totalPages,
      data: cache[cacheKey].data,
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
    const sitePage = page;
    const url =
      sitePage === 1
        ? "https://www.vlr.gg/matches"
        : `https://www.vlr.gg/matches/?page=${sitePage}`;

    await pageObj.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pageObj.waitForSelector(".match-item", { timeout: 10000 });

    // scrape matches
    const rawMatches = await pageObj.$$eval(".match-item", (items) =>
      items.map((el) => {
        const dateEls =
          el
            .closest(".col-container")
            ?.querySelectorAll(".wf-label.mod-large") || [];
        let date = "";
        for (let i = dateEls.length - 1; i >= 0; i--) {
          if (
            dateEls[i].getBoundingClientRect().top <
            el.getBoundingClientRect().top
          ) {
            date = dateEls[i].textContent;
            break;
          }
        }

        const teamEls = Array.from(
          el.querySelectorAll(".match-item-vs-team-name .text-of")
        );
        const teams = teamEls.map((t) => {
          const name = t.textContent.replace(/\n/g, "").trim();
          const flagEl = t.querySelector("span.flag");
          const region = flagEl
            ? Array.from(flagEl.classList)
                .find((c) => c.startsWith("mod-"))
                ?.replace("mod-", "")
                .toUpperCase() || "Unknown"
            : "Unknown";
          return { name, region };
        });

        const time = el.querySelector(".match-item-time")?.textContent || "";
        const event = el.querySelector(".match-item-event")?.textContent || "";
        const status = el.querySelector(".ml-status")?.textContent || "";

        return { date, teams, time, event, status };
      })
    );

    const matches = rawMatches
      .filter((m) => m.teams.length === 2)
      .map((m) => ({
        date: cleanText(m.date),
        teamA: cleanText(m.teams[0].name),
        regionA: cleanText(m.teams[0].region),
        teamB: cleanText(m.teams[1].name),
        regionB: cleanText(m.teams[1].region),
        time: safeTime(m.time),
        event: cleanText(m.event),
        status: cleanText(m.status),
      }));

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

    cache[cacheKey] = {
      data: matches,
      lastFetched: now,
      totalPages,
    };

    return {
      source: "scrape",
      fetchedAt: now,
      page,
      limit: itemsPage,
      totalPages,
      data: matches,
    };
  } catch (err) {
    console.error(err);
    return {
      source: "error",
      fetchedAt: now,
      data: [],
    };
  } finally {
    await pageObj.close();
    await context.close();
    await browser.close();
  }
};
