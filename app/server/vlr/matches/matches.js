import { chromium } from "playwright";
import { cleanText } from "../../../utils/formatter.js";

export const getVlrMatches = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.vlr.gg/matches");
    await page.waitForSelector(".match-item", { timeout: 10000 });

    const rawMatches = await page.$$eval(".match-item", (items) => {
      return items.map((el) => {
        // Find date
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

        const time = el.querySelector(".match-item-time")?.textContent;
        const event = el.querySelector(".match-item-event")?.textContent;

        return { date, teams, time, event };
      });
    });

    const matches = rawMatches
      .filter((m) => m.teams.length === 2)
      .map((m) => ({
        date: cleanText(m.date),
        teamA: cleanText(m.teams[0]),
        teamB: cleanText(m.teams[1]),
        time: cleanText(m.time),
        event: cleanText(m.event),
      }));

    return matches;
  } catch (err) {
    console.error(err);
    return [];
  } finally {
    await browser.close();
  }
};
