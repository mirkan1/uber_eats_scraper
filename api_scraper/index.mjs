import {
  print,
  createDriver,
  waitForElementId,
  getCookieString,
  getUberSearchFeed,
  writeJson,
  pause,
} from "./helper.js";

import { categories, regions } from "./data.js";
let locations = [];

regions.forEach((region) => {
  const localeCode = region.href.split("/")[1];
  locations = locations.concat(
    region.cities.map((city) => ({
      title: `${city.title}, ${region.title}`,
      localeCode,
    }))
  );
});

for (const i in locations) {
  const { title: location, localeCode } = locations[i];

  const driver = await createDriver();
  await driver.get(`https://ubereats.com/${localeCode}`);

  const locationInput = await waitForElementId(
    driver,
    "#location-typeahead-home-input"
  );
  locationInput.sendKeys(location);
  driver.executeScript("arguments[0].click();", locationInput);

  const locationItem0 = await waitForElementId(
    driver,
    "#location-typeahead-home-item-0"
  );
  driver.executeScript("arguments[0].click();", locationItem0);

  await waitForElementId(driver, "#search-suggestions-typeahead-input", 5000);

  const cookieString = await getCookieString(driver);

  driver.close();

  for (const i in categories) {
    const fileName = `searchResults${location.replace(", ", "")}.json`;
    let {
      status,
      data: { feedItems, meta },
    } = await getUberSearchFeed(cookieString, categories[i], localeCode);

    if (status !== "success") continue;

    writeJson(
      fileName,
      feedItems.map(({ store }) => ({
        title: store?.title?.text,
        url: `https://ubereats.com/${localeCode}${store?.actionUrl}`,
        image: store?.image,
      }))
    );

    while (meta?.hasMore) {
      let {
        status,
        data: { feedItems, meta },
      } = await getUberSearchFeed(
        cookieString,
        categories[i],
        localeCode,
        meta?.offset
      );
      if (status !== "success") break;

      writeJson(
        fileName,
        feedItems.map(({ store }) => ({
          title: store?.title?.text,
          url: `https://ubereats.com/${localeCode}${store?.actionUrl}`,
          image: store?.image,
        }))
      );

      pause(250);
    }
  }
}