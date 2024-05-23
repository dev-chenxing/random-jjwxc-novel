const maxNovelId = 9000000;

const axios = require("axios");

const randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
};

const getNovelItem = (url) => {
  return new Promise(async (resolve, reject) => {
    let novel = {};
    await axios
      .get(url, { responseType: "arraybuffer" })
      .then((response) => {
        // if no data returned, return cache
        if (!response) reject(novel);

        // decode non-utf8 response
        const htmlString = iconv.decode(response.data, "gbk");

        if (!htmlString) reject(novel);

        // parse the html string
        const $ = cheerio.load(htmlString);

        novel["author"] = $("span[itemprop='author']").text();
        novel["title"] = $("span[itemprop='articleSection']").text();
        novel["url"] = url;
        novel["genre"] = $("span[itemprop='genre']").text().trim();
        novel["status"] = $("span[itemprop='updataStatus']").text();
        novel["wordCount"] = $("span[itemprop='wordCount']").text();
        novel["credits"] = $("span[itemprop='collectedCount']")[0]
          .next.next.next.data.trim()
          .split("：")
          .slice(-1)[0];

        resolve(novel);
      })
      .catch((err) => {
        console.log(`axois.get(${url}) errored.`);
        reject(novel);
      });
  });
};

const randomNovel = () => {
  const randomNovelId = randomInteger(1, maxNovelId);
  const url = `https://www.jjwxc.net/onebook.php?novelid=${randomNovelId}`;
  const randomNovel = getNovelItem(url);
  document.getElementById("novel").innerText = randomNovelId;
};
