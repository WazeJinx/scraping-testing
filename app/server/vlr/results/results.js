import { chromium } from "playwright";
import { cleanText } from "../../../utils/formatter.js";
import { cache } from "../../../utils/cache.js";

const cacheInterval = 5 * 60 * 1000; // 5 minutes
const itemsPage = 50; // site page size

export const getVlrResults = async (page = 1, limit = itemsPage) => {
  const cacheKey = `vlrResults_page${page}`;
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
        ? "https://www.vlr.gg/matches/results"
        : `https://www.vlr.gg/matches/results/?page=${page}`;

    await pageObj.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await pageObj.waitForSelector(".match-item", { timeout: 10_000 });

    const rawResults = await pageObj.$$eval(".match-item", (items) =>
      items
        .map((el) => {
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
          if (teamEls.length !== 2) return null;

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

          const scores = Array.from(
            el.querySelectorAll(".match-item-vs-team-score")
          ).map((s) => s.textContent || "");

          const status =
            el.querySelector(".ml-status")?.textContent ||
            el.querySelector(".match-item-vs-status")?.textContent ||
            "";

          const time =
            el.querySelector(".match-item-time")?.textContent?.trim() || "";
          const event =
            el.querySelector(".match-item-event")?.textContent?.trim() || "";

          return { date, teams, scores, status, time, event };
        })
        .filter(Boolean)
    );

    const results = rawResults.map((r) => ({
      date: cleanText(r.date),
      teamA: cleanText(r.teams[0].name),
      regionA: cleanText(r.teams[0].region),
      teamB: cleanText(r.teams[1].name),
      regionB: cleanText(r.teams[1].region),
      scoreA: cleanText(r.scores[0] || ""),
      scoreB: cleanText(r.scores[1] || ""),
      time: /^[0-9]{1,2}:[0-9]{2}/.test(r.time) ? cleanText(r.time) : "",
      event: cleanText(r.event),
      status: cleanText(r.status),
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
      data: results,
      lastFetched: now,
      totalPages,
    };

    const pageResults =
      limit < results.length ? results.slice(0, limit) : results;

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
