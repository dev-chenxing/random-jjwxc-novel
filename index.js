const maxNovelId = 9000000;

import axios from "axios";
import iconv from "iconv-lite";
import cheerio from "cheerio";
import ora from "ora";
import chalk from "chalk";

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

                novel["title"] = $("span[itemprop='articleSection']").text();
                const title = novel["title"];
                if (!title || title == "") {
                    reject(novel);
                } else {
                    novel["author"] = $("span[itemprop='author']").text();
                    novel["url"] = url;
                    novel["genre"] = $("span[itemprop='genre']").text().trim();
                    novel["status"] = $("span[itemprop='updataStatus']").text();
                    novel["wordCount"] = $("span[itemprop='wordCount']").text();
                    novel["credits"] = $("span[itemprop='collectedCount']")[0].next.next.next.data.trim().split("：").slice(-1)[0];

                    resolve(novel);
                }
            })
            .catch((err) => {
                reject(novel);
            });
    });
};

const printNovel = async (novel) => {
    const title = novel["title"];
    const author = novel["author"];
    const wordCount = novel["wordCount"];
    const status = novel["status"];
    const genre = novel["genre"];
    console.log(chalk.bold(title));
    console.log(author);
    console.log(`${wordCount}·${status}`);
    console.log(genre);
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
            .catch((err) => {});
    } while (!randomNovel["title"] || randomNovel["title"] == "");
    spinner.stop();
    return randomNovel;
};

randomNovel().then((novel) => printNovel(novel));
