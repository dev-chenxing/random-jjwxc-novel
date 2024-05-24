const maxNovelId = 9000000;

import axios from "axios";
import iconv from "iconv-lite";
import cheerio from "cheerio";
import ora from "ora";
import chalk from "chalk";

const randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
};

const getTags = (element) => {
  let tags = [""];
  for (let i = 0; i < element.length; i++) {
    tags.push(element[i].children[0].data);
  }
  return tags.join(" ");
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

        novel["title"] = $("span[itemprop='articleSection']").text();
        const title = novel["title"];
        if (!title || title == "") {
          reject(novel);
        } else {
          novel["url"] = url;
          novel["author"] = $("span[itemprop='author']").text();
          novel["wordCount"] = $("span[itemprop='wordCount']").text();
          novel["status"] = $("span[itemprop='updataStatus']").text();
          novel["genre"] = $("span[itemprop='genre']").text().trim();
          novel["oneliner"] = $("span[style='color:#F98C4D']")
            .first()
            .text()
            .split("：")[1];
          novel["tags"] = getTags(
            $("a[style='text-decoration:none;color: red;']")
          );
          resolve(novel);
        }
      })
      .catch((err) => {
        // console.log(err);
        reject(novel);
      });
  });
};

const printNovel = async (novel, url) => {
  console.log(chalk.bold(novel["title"]) + ` (${novel["url"]})`);
  console.log(novel["author"]);
  console.log(`${novel["wordCount"]}·${novel["status"]}`);
  console.log(novel["genre"]);
  if (novel["oneliner"]) console.log(novel["oneliner"]);
  if (novel["tags"]) console.log(chalk.green(`🏷️ ${novel["tags"]}`));
};

const randomNovel = async () => {
  const spinner = ora().start();
  let randomNovel = {};
  do {
    const randomNovelId = randomInteger(1, maxNovelId);
    const url = `https://www.jjwxc.net/onebook.php?novelid=${randomNovelId}`;
    await getNovelItem(url)
      .then((novel) => {
        randomNovel = novel;
      })
      .catch((err) => {
        // console.log(err);
      });
  } while (
    !randomNovel["title"] ||
    randomNovel["title"] == "" ||
    !randomNovel["tags"]
  );
  spinner.stop();
  return randomNovel;
};

const init = async () => {
  randomNovel().then((novel) => printNovel(novel));
  // await getNovelItem("https://www.jjwxc.net/onebook.php?novelid=7535916").then((novel) => printNovel(novel));
};
init();
