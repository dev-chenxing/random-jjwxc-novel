const maxNovelId = 9000000;

import axios from "axios";
import iconv from "iconv-lite";
import cheerio from "cheerio";
import ora from "ora";
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const spinner = ora();

const randomInteger = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
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
                const title = novel["title"];
                if (!title || title == "") {
                    reject(novel);
                } else {
                    novel["url"] = url;
                    novel["author"] = $("span[itemprop='author']").text();
                    novel["wordCount"] = $("span[itemprop='wordCount']").text();
                    novel["status"] = $("span[itemprop='updataStatus']").text();
                    novel["genre"] = $("span[itemprop='genre']").text().trim();
                    [novel["originality"], novel["orientation"], novel["era"], novel["category"]] = novel["genre"].split("-");
                    novel["oneliner"] = $("span[style='color:#F98C4D']").first().text().split("：")[1];
                    novel["tags"] = getTags($("a[style='text-decoration:none;color: red;']"));
                    const latestChapterNum = $("tr[itemprop='chapter newestChapter'] td")[0].children[0].data.trim();
                    const latestChapterTitle = $("tr[itemprop='chapter newestChapter'] span[itemprop='headline'] a").text();
                    novel["latestChapter"] = `第${latestChapterNum}章 ${latestChapterTitle}`;
                    novel["description"] = $("div[id='novelintro']").text().substring(0, 57) + "...";
                    resolve(novel);
                }
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

const isValidNovel = (novel) => {
    return novel["title"] && novel["title"] !== "" && novel["tags"];
};

const isFiltered = (novel) => {
    if (argv.orientation && argv.orientation !== novel["orientation"]) return true;
    if (argv.tag && !novel["tags"].includes(argv.tag)) return true;
    return false;
};

const randomNovel = async () => {
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
    } while (!isValidNovel(randomNovel) || isFiltered(randomNovel));

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
                    novelList.push({ title: element.children[0].data, url: "https://m.jjwxc.net" + element.attribs.href });
                }

                resolve(novelList);
            })
            .catch((err) => {
                console.error(err);
                reject(novelList);
            });
    });
};

const orientationOptions = {
    言情: 1,
    纯爱: 2,
    百合: 3,
    无cp: 5,
};

const getQueryUrl = (baseUrl, argv) => {
    let url = baseUrl;
    if (argv.orientation) {
        const orientationIndex = orientationOptions[argv.orientation.toLowerCase()];
        if (orientationIndex) {
            url += `&xx=${orientationIndex}`;
        } else {
            spinner.stop();
            throw new Error(`invalid orientation argument ${argv.orientation}`);
        }
    }
    return url;
};

const getNovelLists = async (argv) => {
    spinner.start();
    const baseUrl = "https://m.jjwxc.net/assort?sortType=1";
    const queryUrl = getQueryUrl(baseUrl, argv);
    let novelList = [];
    for (let i = 1; i <= 10; i++) {
        const url = `${queryUrl}&page=${i}`;
        await getNovelList(url)
            .then((list) => {
                novelList = novelList.concat(list);
            })
            .catch((err) => {
                console.log(err);
            });
    }
    spinner.stop();
    return novelList;
};

const init = async () => {
    const argv = yargs(hideBin(process.argv)).argv;
    getNovelLists(argv)
        .then((novelList) => console.log(novelList))
        .catch((err) => {
            console.log(err);
        });

    /* randomNovel()
        .then((novel) => printNovel(novel))
        .catch((err) => {
            console.log(err);
        }); */
    /* await getNovelItem("https://www.jjwxc.net/onebook.php?novelid=1782640")
    .then((novel) => {
      if (!isFiltered(novel)) printNovel(novel);
    })
    .catch((err) => {
      console.log(err);
    }); */
};
init();
