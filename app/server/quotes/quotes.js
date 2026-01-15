import axios from "axios";
import * as cheerio from "cheerio";

export async function getQuotes() {
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

      quotes.push({ text, author, tags });
    });

    return quotes;
  } catch (err) {
    console.error(err);
    return [];
  }
}
