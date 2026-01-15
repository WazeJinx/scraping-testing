import { chromium } from "playwright";
import { cleanText } from "../../../utils/formatter.js";

export const getVlrResults = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.vlr.gg/matches/results");
    await page.waitForSelector(".match-item", { timeout: 10000 });

    const rawResults = await page.$$eval(".match-item", (items) => {
      return items
        .map((el) => {
          const dateEls =
            el
              .closest(".col-container")
              ?.querySelectorAll(".wf-label.mod-large") || [];
          let date = "";
          for (let i = dateEls.length - 1; i >= 0; i--) {
            const rect = dateEls[i].getBoundingClientRect();
            const matchRect = el.getBoundingClientRect();
            if (rect.top < matchRect.top) {
              date = dateEls[i].textContent;
              break;
            }
          }

          const teams = Array.from(
            el.querySelectorAll(".match-item-vs-team-name .text-of")
          ).map((t) => t.textContent);

          if (teams.length !== 2) return null;

          const scores = Array.from(
            el.querySelectorAll(".match-item-vs-team-score")
          ).map((s) => s.textContent);

          const status =
            el.querySelector(".ml-status")?.textContent ||
            el.querySelector(".match-item-vs-status")?.textContent ||
            "";

          const time = el.querySelector(".match-item-time")?.textContent;
          const event = el.querySelector(".match-item-event")?.textContent;

          return { date, teams, scores, status, time, event };
        })
        .filter(Boolean);
    });

    const results = rawResults.map((r) => ({
      date: cleanText(r.date),
      teamA: cleanText(r.teams[0]),
      teamB: cleanText(r.teams[1]),
      scoreA: cleanText(r.scores[0] || ""),
      scoreB: cleanText(r.scores[1] || ""),
      time: cleanText(r.time),
      event: cleanText(r.event),
      status: cleanText(r.status),
    }));

    return results;
  } catch (err) {
    console.error(err);
    return [];
  } finally {
    await browser.close();
  }
};
