import * as puppeteer from "puppeteer";
import * as fs from "fs";

let browser: puppeteer.Browser;

const main = async () => {
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      height: 1020,
      width: 1080,
    },
  });

  const items = await scrapeRestaurant("mc donalds");

  fs.writeFileSync("myfitnesspal.json", JSON.stringify(items, null, 2));
};

const scrapeRestaurant = async (searchTerm = "mc donalds") => {
  const search = encodeURIComponent(searchTerm);

  const page = await browser.newPage();

  await page.goto(`https://www.myfitnesspal.com/food/search?search=${search}`);

  const finalItems = [];

  for (let i = 0; i < 5; i++) {
    const products = await page.evaluate(() => {
      const items = document.querySelectorAll("section ~div:not(:last-child)");

      const foodItems = Array.from(items).map((food) => {
        const title = food.querySelector("div > div");
        const restaurantSel = food.querySelector("div > div:nth-child(2)");
        const nutrition = food.querySelector("div > div:nth-child(3)");

        const nut = nutrition.textContent.split("•");

        const mappedNut = nut.map((nutEl) => nutEl.replace(/\D/g, ""));

        const [calories, carbs, fat, protein] = mappedNut;

        let restaurant = "";
        let amount = "";

        if (restaurantSel) {
          const txt = restaurantSel.textContent;
          const index = txt.indexOf(",");
          restaurant = txt.substr(0, index);
          amount = txt.substr(index + 2);
        }

        return {
          title: title?.textContent,
          restaurant: restaurant,
          calories,
          carbs,
          fat,
          protein,
          amount,
        };
      });

      return foodItems;
    });
    finalItems.push(...products);

    // pagination part

    await page.evaluate(() => {
      const el: HTMLAnchorElement = document.querySelector(
        'a[title="next page"]'
      );
      el.click();
    });

    await page.waitForSelector(
      "section ~div:not(:last-child) .recharts-surface"
    );
  }

  console.log("foodItems", finalItems);
  return finalItems;
};

main();
