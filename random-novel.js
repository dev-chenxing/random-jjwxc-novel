const maxNovelId = 9000000;

import axios from "axios";
import iconv from "iconv-lite";
import cheerio from "cheerio";
import ora from "ora";
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import filter from "./filter.js";

const spinner = ora();

const randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
};

const randomChoice = (array) => {
  return array[randomInteger(0, array.length - 1)];
};

const getTags = (element) => {
  let tags = [];
  for (let i = 0; i < element.length; i++) {
    tags.push(element[i].children[0].data);
  }
  return tags;
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
        novel["url"] = url;
        novel["author"] = $("span[itemprop='author']").text();
        novel["wordCount"] = $("span[itemprop='wordCount']").text();
        novel["status"] = $("span[itemprop='updataStatus']").text();
        novel["genre"] = $("span[itemprop='genre']").text().trim();
        [
          novel["originality"],
          novel["orientation"],
          novel["era"],
          novel["category"],
        ] = novel["genre"].split("-");
        novel["oneliner"] = $("span[style='color:#F98C4D']")
          .first()
          .text()
          .split("：")[1];
        novel["tags"] = getTags(
          $("a[style='text-decoration:none;color: red;']")
        );
        const latestChapterNum = $(
          "tr[itemprop='chapter newestChapter'] td"
        )[0].children[0].data.trim();
        const latestChapterTitle = $(
          "tr[itemprop='chapter newestChapter'] span[itemprop='headline'] a"
        ).text();
        novel[
          "latestChapter"
        ] = `第${latestChapterNum}章 ${latestChapterTitle}`;
        novel["description"] =
          $("div[id='novelintro']").text().substring(0, 57) + "...";
        resolve(novel);
      })
      .catch((err) => {
        // console.log(err);
        reject(novel);
      });
  });
};

const printNovel = async (novel) => {
  console.log();
  console.log(chalk.bold(novel["title"]) + ` (${novel["url"]})`);
  console.log(chalk.green(novel["author"]));
  console.log(`${novel["wordCount"]}·${novel["status"]}`);
  console.log(novel["genre"]);
  if (novel["oneliner"]) console.log(novel["oneliner"]);
  if (novel["tags"]) console.log(chalk.green(`🏷️  ${novel["tags"].join(" ")}`));
  console.log(chalk.green("最新更新: ") + novel["latestChapter"]);
  console.log(novel["description"]);
};

const isFiltered = (novel, filterCondition) => {
  if (filterCondition.wordCount) {
    const wordCount = Number(novel["wordCount"].slice(0, -1));
    if (
      filterCondition.wordCount[">"] &&
      wordCount < filterCondition.wordCount[">"]
    )
      return true;
    if (
      filterCondition.wordCount["<"] &&
      wordCount > filterCondition.wordCount["<"]
    )
      return true;
    console.log(
      `filter: ${filterCondition.wordCount.toString()}, novel: ${wordCount}`
    );
  }
  return false;
};

const randomNovel = async (novelList, filterCondition) => {
  let randomNovel = {};
  do {
    const randomNovelId = randomChoice(novelList).id;
    const url = "https://www.jjwxc.net/onebook.php?novelid=" + randomNovelId;

    await getNovelItem(url)
      .then((novel) => {
        randomNovel = novel;
      })
      .catch((err) => {
        // console.log(err);
      });
  } while (isFiltered(randomNovel, filterCondition));
  return randomNovel;
};

const getNovelList = (url) => {
  return new Promise(async (resolve, reject) => {
    let novelList = [];
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

        const elementList = $("div[id='diss'] td");
        for (let i = 1; i < elementList.length; i++) {
          const element = elementList[i].children[1];
          const href = element.attribs.href;
          novelList.push({
            id: href.split("/")[2],
            title: element.children[0].data,
            url: "https://m.jjwxc.net" + href,
          });
        }

        resolve(novelList);
      })
      .catch((err) => {
        // console.error(err);
        reject(novelList);
      });
  });
};

const getQueryUrl = (baseUrl, argv) => {
  let url = baseUrl;
  if (argv.orientation) {
    const index = filter.orientation[argv.orientation.toLowerCase()];
    if (index) {
      url += `&xx=${index}`;
    } else {
      spinner.stop();
      throw new Error(`invalid orientation argument ${argv.orientation}`);
    }
  }
  if (argv.tag) {
    const index = filter.tag[argv.tag.toLowerCase()];
    if (index) {
      url += `&bq=${index}`;
    } else {
      spinner.stop();
      throw new Error(`invalid tag argument ${argv.tag}`);
    }
  }
  let filterCondition = {};
  if (argv.wordCount) {
    if (["<", ">"].includes(argv.wordCount[0])) {
      let numStr = argv.wordCount.substr(1);
      if (argv.wordCount[1] == "=") numStr = numStr.substr(1);
      filterCondition["wordCount"] = {};
      filterCondition["wordCount"][argv.wordCount[0]] = Number(numStr);
    } else {
      spinner.stop();
      throw new Error(`invalid wordCount argument ${argv.wordCount}`);
    }
  }
  const queryUrl = url;
  return { queryUrl, filterCondition };
};

const getNovelLists = async (argv) => {
  spinner.start();
  const baseUrl = "https://m.jjwxc.net/assort?sortType=1";
  const { queryUrl, filterCondition } = getQueryUrl(baseUrl, argv);

  let novelList = [];
  for (let i = 1; i <= 10; i++) {
    const url = `${queryUrl}&page=${i}`;
    await getNovelList(url)
      .then((list) => {
        novelList = novelList.concat(list);
      })
      .catch((err) => {
        // console.log(err);
      });
  }
  spinner.stop();
  return { novelList, filterCondition };
};

const init = async () => {
  const argv = yargs(hideBin(process.argv)).argv;
  getNovelLists(argv)
    .then(({ novelList, filterCondition }) => {
      randomNovel(novelList, filterCondition)
        .then((novel) => printNovel(novel))
        .catch((err) => {
          // console.log(err);
        });
    })
    .catch((err) => {
      // console.log(err);
    });
};
init();
