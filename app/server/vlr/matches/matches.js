import { chromium } from "playwright";
import { cleanText } from "../../../utils/formatter.js";

export const getVlrMatches = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "UTC",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const page = await context.newPage();

  try {
    // Block heavy assets for speed
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) return route.abort();
      return route.continue();
    });

    // Disable animations
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
          scroll-behavior: auto !important;
        }
      `;
      document.documentElement.appendChild(style);
    });

    await page.goto("https://www.vlr.gg/matches", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForSelector(".match-item", { timeout: 10_000 });

    const rawMatches = await page.$$eval(".match-item", (items) => {
      return items.map((el) => {
        // Find date
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

        const teams = Array.from(
          el.querySelectorAll(".match-item-vs-team-name .text-of")
        ).map((t) => t.textContent);

        const time = el.querySelector(".match-item-time")?.textContent;
        const event = el.querySelector(".match-item-event")?.textContent;

        return { date, teams, time, event };
      });
    });

    return rawMatches
      .filter((m) => m.teams.length === 2)
      .map((m) => ({
        date: cleanText(m.date),
        teamA: cleanText(m.teams[0]),
        teamB: cleanText(m.teams[1]),
        time: cleanText(m.time),
        event: cleanText(m.event),
      }));
  } catch (err) {
    console.error(err);
    return [];
  } finally {
    await context.close();
    await browser.close();
  }
};
