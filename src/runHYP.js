const log4js = require('log4js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

log4js.configure({
  appenders: {
    System: {
      type: 'stdout'
    }
  },
  categories: {
    default: {
      appenders: ['System'],
      level: 'trace'
    }
  }
})
const logger = log4js.getLogger('System');
console.log(`Logger started (level: ${logger.level})`);
if (logger.level != 'TRACE') console.log(`Logs with levels less than '${logger.level}' are truncated`);
logger.trace('Program has been started');

const rootDirectory = path.resolve(path.join('.', 'output_hoyoplay'));
const apiConnectDelay = null;
const apiConnectTimeout = 30000;
const apiDefinition = {
  'serverList': ['global', 'cn'],
  'definition': {
    'global': { 'url': 'https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages', 'id': 'VYTpXlbWo8', 'enabled': true },
    'cn': { 'url': 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages', 'id': 'jGHBHlcOq1', 'enabled': true }
  }
};
const namePrettyDefinition = {
  'gameName': {
    'bh3': 'Honkai Impact 3rd',
    'hk4e': 'Genshin Impact',
    'hkrpg': 'Honkai: Star Rail',
    'nap': 'Zenless Zone Zero'
  },
  'serverName': {
    'cn': 'China',
    'global': 'Global',
  },
  'emoji': {

  }
};
const discordWebhookUrlArrayEncrypted = [
  {
    iv: 'e0706f6c81ba0d2ca9bbb2bb06760be7',
    encryptedData: '2nacPaPQ5ReFJat09gt0Bcj32Ys5ef9p+IePpWifLZLv16IZK9TNGEJAW8upu9MM3+NnaVmwGZCHXT3gox8t/Y+RXydgAoFn4WlETOTzYoS5Es/tDGFFmmJShAAhNFH2exR3S6r9/PbAO7+N6VA78DwUdn1hDNmA/otUT8Y95uU='
  }
];

async function main() {
  const apiResponseObj = await apiConnectRunner();
  // console.log(apiResponseObj);
  const fileManageReaderOutput = await fileManageReader();
  const fileManageDiffVerifyOutput = await fileManageDiffVerifier(apiResponseObj, fileManageReaderOutput.loadedObj, fileManageReaderOutput.notExistsFileArray);
  if (fileManageDiffVerifyOutput.needWriteFlagCount > 0) {
    logger.debug(`Writing response JSON to local file ...`);
    await fileManageWriter(apiResponseObj, fileManageDiffVerifyOutput);
    logger.debug(`Wrote response JSON to local file`);
    await discordWebhookPush(apiResponseObj, fileManageReaderOutput.loadedObj, fileManageReaderOutput.notExistsFileArray);
  } else {
    logger.info(`Local writes were skipped because there were no remote updates`);
  }
  logger.info(`All process has been completed (^_^)`);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function apiConnectRunner() {
  const definitionList = new Array();
  const responseObject = new Object();
  apiDefinition.serverList.forEach(serverNameKey => {
    if (apiDefinition.definition[serverNameKey].enabled === true) {
      definitionList.push({ 'serverName': serverNameKey, ...apiDefinition.definition[serverNameKey] });
    }
  });
  for (const definition of definitionList) {
    if (apiConnectDelay !== null) await new Promise(resolve => setTimeout(resolve, apiConnectDelay));
    logger.trace(`Requesting ${definition.url.replace('https://', '')} ...`);
    try {
      const resData = await apiConnect(`${definition.url}`, definition.id);
      if (resData) {
        responseObject[definition.serverName] = resData.data;
        logger.debug(`Downloaded ${definition.url.replace('https://', '')}`);
      }
    } catch (error) {
      logger.error(`Failed to download data from ${definition.url.replace('https://', '')}`);
      process.exit(1);
      // console.error(error);
      break;
    }
  }
  if (!responseObject) {
    logger.error(`API processing failed`);
    return null;
  } else {
    return responseObject;
  }
}

async function discordWebhookPush(apiResponseObj, loadedObj, notExistsFileArray) {
  const discordWebhookEmbedArray = new Array();
  if (notExistsFileArray.length !== 0) throw new Error('old file not exists. Cannot verify difference');
  for (const serverNameKey of apiDefinition.serverList) {
    const gamePackagesNewArray = apiResponseObj[serverNameKey].game_packages;
    const gamePackagesOldArray = loadedObj.master[serverNameKey].game_packages;
    for (let i = 0; i < gamePackagesNewArray.length; i++) {
      let gamePackageNew = gamePackagesNewArray[i];
      let gamePackageOld = gamePackagesOldArray[i];
      if (gamePackageNew.main.major.version !== gamePackageOld.main.major.version) {
        discordWebhookEmbedArray.push({
          "title": ":white_check_mark: Game updated!",
          "description": (() => {
            const gameCodeName = gamePackageNew.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[1];
            const gameServerName = gamePackageNew.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[2];
            return `${namePrettyDefinition.gameName[gameCodeName]} (${namePrettyDefinition.serverName[gameServerName]})`;
          })(),
          "color": 65280,
          "fields": [
            {
              "name": "Game Version",
              "value": `**${gamePackageNew.main.major.version}**`,
              "inline": false
            },
            {
              "name": "Full Pack Size",
              "value": [
                `Game: **${formatFileSize(gamePackageNew.main.major.game_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((acc, f) => acc + f, 0), 2)}**`,
                ...(() => {
                  const tmpArr = new Array();
                  if (gamePackageNew.main.major.audio_pkgs.length !== 0) {
                    // tmpArr.push(`Audio: **${formatFileSize(gamePackageNew.main.major.audio_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((a, b) => Math.max(a, b)), 2)}** max`);
                    gamePackageNew.main.major.audio_pkgs.forEach((obj) => {
                      tmpArr.push(`Audio :flag_${obj.language.slice(-2)}:: **${formatFileSize(obj.decompressed_size - obj.size, 2)}**`);
                    })
                  }
                  return tmpArr;
                })()
              ].join('\n'),
              "inline": false
            },
            ...(() => {
              const tmpBigArr = new Array();
              gamePackageNew.main.patches.forEach((patchObj) => {
                tmpBigArr.push({
                  "name": `Diff ${patchObj.version} Size`,
                  "value": [
                    `Game: **${formatFileSize(patchObj.game_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((acc, f) => acc + f, 0), 2)}**`,
                    ...(() => {
                      const tmpArr = new Array();
                      if (patchObj.audio_pkgs.length !== 0) {
                        // tmpArr.push(`Audio: **${formatFileSize(patchObj.audio_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((a, b) => Math.max(a, b)), 2)}** max`);
                        patchObj.audio_pkgs.forEach((obj) => {
                          tmpArr.push(`Audio :flag_${obj.language.slice(-2)}:: **${formatFileSize(obj.decompressed_size - obj.size, 2)}**`);
                        })
                      }
                      return tmpArr;
                    })()
                  ].join('\n'),
                  "inline": false
                })
              });
              return tmpBigArr;
            })()
          ],
          "thumbnail": {
            "url": (() => {
              const gameCodeName = gamePackageNew.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[1];
              return `https://ghp.ci/raw.githubusercontent.com/daydreamer-json/mhy-api-backup/main/res/${gameCodeName}.jpg`;
            })()
          }
        });
      }
      if (gamePackageNew.pre_download.major !== null && gamePackageOld.pre_download.major === null) {
        discordWebhookEmbedArray.push({
          "title": ":information_source: Pre-download is available!",
          "description": (() => {
            const gameCodeName = gamePackageNew.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[1];
            const gameServerName = gamePackageNew.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[2];
            return `${namePrettyDefinition.gameName[gameCodeName]} (${namePrettyDefinition.serverName[gameServerName]})`;
          })(),
          "color": 36095,
          "fields": [
            {
              "name": "Game Version",
              "value": `**${gamePackageNew.pre_download.major.version}**`,
              "inline": false
            },
            {
              "name": "Full Pack Size",
              "value": [
                `Game: **${formatFileSize(gamePackageNew.pre_download.major.game_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((acc, f) => acc + f, 0), 2)}**`,
                ...(() => {
                  const tmpArr = new Array();
                  if (gamePackageNew.pre_download.major.audio_pkgs.length !== 0) {
                    // tmpArr.push(`Audio: **${formatFileSize(gamePackageNew.pre_download.major.audio_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((a, b) => Math.max(a, b)), 2)}** max`);
                    gamePackageNew.pre_download.major.audio_pkgs.forEach((obj) => {
                      tmpArr.push(`Audio :flag_${obj.language.slice(-2)}:: **${formatFileSize(obj.decompressed_size - obj.size, 2)}**`);
                    })
                  }
                  return tmpArr;
                })()
              ].join('\n'),
              "inline": false
            },
            ...(() => {
              const tmpBigArr = new Array();
              gamePackageNew.pre_download.patches.forEach((patchObj) => {
                tmpBigArr.push({
                  "name": `Diff ${patchObj.version} Size`,
                  "value": [
                    `Game: **${formatFileSize(patchObj.game_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((acc, f) => acc + f, 0), 2)}**`,
                    ...(() => {
                      const tmpArr = new Array();
                      if (patchObj.audio_pkgs.length !== 0) {
                        // tmpArr.push(`Audio: **${formatFileSize(patchObj.audio_pkgs.map((obj) => parseInt(obj.decompressed_size) - parseInt(obj.size)).reduce((a, b) => Math.max(a, b)), 2)}** max`);
                        patchObj.audio_pkgs.forEach((obj) => {
                          tmpArr.push(`Audio :flag_${obj.language.slice(-2)}:: **${formatFileSize(obj.decompressed_size - obj.size, 2)}**`);
                        })
                      }
                      return tmpArr;
                    })()
                  ].join('\n'),
                  "inline": false
                })
              });
              return tmpBigArr;
            })()
          ],
          "thumbnail": {
            "url": (() => {
              const gameCodeName = gamePackageNew.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[1];
              return `https://ghp.ci/raw.githubusercontent.com/daydreamer-json/mhy-api-backup/main/res/${gameCodeName}.jpg`;
            })()
          }
        });
      }
    }
  }
  const discordWebhookBody = {
    "content": "",
    "tts": false,
    "embeds": discordWebhookEmbedArray,
    "components": [],
    "actions": {},
    "username": "miHoYo Package Update",
    "avatar_url": "https://ghp.ci/raw.githubusercontent.com/daydreamer-json/mhy-api-backup/main/res/hoyo_circle.png"
  };
  for (const discordWebhookUrlEncryptedObj of discordWebhookUrlArrayEncrypted) {
    logger.debug('Sending Discord webhook ...');
    let connectionTimer = process.hrtime();
    try {
      const response = await axios({
        'method': 'post',
        'url': await aes256cbcCipher.decrypt(discordWebhookUrlEncryptedObj, 'fuckyoumihoyo'),
        'timeout': apiConnectTimeout,
        'data': discordWebhookBody
      });
      let connectionTimeResult = process.hrtime(connectionTimer);
      logger.trace(`API connection time: ${(connectionTimeResult[0] * 1e9 + connectionTimeResult[1]) / 1e6} ms`);
      return response.data;
    } catch (error) {
      let connectionTimeResult = process.hrtime(connectionTimer);
      logger.trace(`API connection time: ${(connectionTimeResult[0] * 1e9 + connectionTimeResult[1]) / 1e6} ms`);
      logger.error(`API request failed: ${error.code}`);
      // console.error(error);
      throw error;
    }
  }
}

async function apiConnect(url, id) {
  let connectionTimer = process.hrtime();
  try {
    const response = await axios({
      'method': 'get',
      'url': url,
      'params': {
        'launcher_id': id,
      },
      'headers': {
        'User-Agent': 'Mozilla/5.0',
        'Cache-Control': 'no-cache'
      },
      'timeout': apiConnectTimeout,
    });
    let connectionTimeResult = process.hrtime(connectionTimer);
    logger.trace(`API connection time: ${(connectionTimeResult[0] * 1e9 + connectionTimeResult[1]) / 1e6} ms`);
    return response.data;
  } catch (error) {
    let connectionTimeResult = process.hrtime(connectionTimer);
    logger.trace(`API connection time: ${(connectionTimeResult[0] * 1e9 + connectionTimeResult[1]) / 1e6} ms`);
    logger.error(`API request failed: ${error.code}`);
    // console.error(error);
    throw error;
  }
}

async function fileManageReader() {
  const loadedObj = new Object();
  const notExistsFileArray = new Array();
  const masterFileExists = await checkFileExists(path.join(rootDirectory, 'master.json'));
  if (!masterFileExists) {
    notExistsFileArray.push(path.join(rootDirectory, 'master.json'));
  } else {
    loadedObj.master = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'master.json'), { encoding: 'utf8' }));
  }
  for (let i = 0; i < apiDefinition.serverList.length; i++) {
    let serverNameKey = apiDefinition.serverList[i];
    let fileExists = await checkFileExists(path.join(rootDirectory, 'unique', `${serverNameKey}.json`));
    if (!fileExists) {
      notExistsFileArray.push(path.join(rootDirectory, 'unique', `${serverNameKey}.json`));
    } else {
      loadedObj[serverNameKey] = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'unique', `${serverNameKey}.json`), { encoding: 'utf8' }));
    }
  }
  return {
    "loadedObj": loadedObj,
    "notExistsFileArray": notExistsFileArray
  }
}

async function fileManageDiffVerifier(apiResponseObj, loadedObj, notExistsFileArray) {
  let needWriteFlagCount = 0;
  const needWriteFlagObj = new Object();
  if (!notExistsFileArray.includes(path.join(rootDirectory, 'master.json'))) {
    if (JSON.stringify(apiResponseObj) == JSON.stringify(loadedObj.master)) {
      needWriteFlagObj.master = false;
    } else {
      needWriteFlagObj.master = true;
      needWriteFlagCount += 1;
      logger.info(`Detected remote update of ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))}`);
    }
  } else {
    needWriteFlagObj.master = true;
    needWriteFlagCount += 1;
    logger.info(`Detected remote update of ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))}`);
  }
  apiDefinition.serverList.forEach((serverNameKey) => {
    if (!notExistsFileArray.includes(path.join(rootDirectory, 'unique', `${serverNameKey}.json`))) {
      if (JSON.stringify(apiResponseObj[serverNameKey]) == JSON.stringify(loadedObj[serverNameKey])) {
        needWriteFlagObj[serverNameKey] = false;
      } else {
        needWriteFlagObj[serverNameKey] = true;
        needWriteFlagCount += 1;
        logger.info(`Detected remote update of ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${serverNameKey}.json`))}`);
      }
    } else {
      needWriteFlagObj[serverNameKey] = true;
      needWriteFlagCount += 1;
      logger.info(`Detected remote update of ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${serverNameKey}.json`))}`);
    }
  });
  needWriteFlagObj.needWriteFlagCount = needWriteFlagCount;
  return needWriteFlagObj;
}

async function fileManageWriter(apiResponseObj, needWriteFlagObj) {
  logger.trace(`Creating folder structure ...`);
  await createFolder(rootDirectory);
  await createFolder(path.join(rootDirectory, 'unique'));
  if (needWriteFlagObj.master) {
    logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))} ...`);
    await fs.promises.writeFile(path.join(rootDirectory, 'master.json'), JSON.stringify(apiResponseObj, '', '  '), { flag: 'w', encoding: 'utf8' });
    logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))}`);
  }
  for (let i = 0; i < apiDefinition.serverList.length; i++) {
    let serverNameKey = apiDefinition.serverList[i];
    if (needWriteFlagObj[serverNameKey]) {
      logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${serverNameKey}.json`))} ...`);
      await fs.promises.writeFile(path.join(rootDirectory, 'unique', `${serverNameKey}.json`), JSON.stringify(apiResponseObj[serverNameKey], '', '  '), { flag: 'w', encoding: 'utf8' });
      logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${serverNameKey}.json`))}`);
    }
  }
}

async function checkFileExists(filePath) {
  try {
    await fs.promises.access(path.resolve(filePath), fs.constants.F_OK)
    return true // exists
  } catch (error) {
    return false // not exists
  }
}

async function createFolder(folderPath) {
  try {
    await fs.promises.access(folderPath);
  } catch (error) {
    await fs.promises.mkdir(folderPath, { recursive: true });
  }
}

function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 byte';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const aes256cbcCipher = {
  encrypt: (async (text, password) => {
    const algorithm = 'aes-256-cbc';
    const key = await util.promisify(crypto.scrypt)(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
  }),
  decrypt: (async (encryptedObj, password) => {
    const algorithm = 'aes-256-cbc';
    const key = await util.promisify(crypto.scrypt)(password, 'salt', 32);
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedObj.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  })
};



main();
