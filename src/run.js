const log4js = require('log4js');
const color = require('ansi-colors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const termKit = require('terminal-kit').terminal;

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

const rootDirectory = path.resolve(path.join('.', 'output'));
const apiConnectDelay = 0;
const apiConnectTimeout = 20000;
const apiDefinition = {
  'gameList': ['bh3', 'hk4e', 'hkrpg', 'nap'],
  'serverList': {
    'bh3': ['cn', 'jp', 'tw', 'kr', 'sea', 'eu'],
    'hk4e': ['cn', 'os'],
    'hkrpg': ['cn', 'os'],
    'nap': ['os']
  },
  'definition': {
    'bh3': {
      'cn': {'url': 'https://bh3-launcher-static.mihoyo.com/bh3_cn/mdk/launcher/api/resource', 'id': 4, 'key': 'SyvuPnqL', 'enabled': true},
      'jp': {'url': 'https://sdk-os-static.hoyoverse.com/bh3_global/mdk/launcher/api/resource', 'id': 19, 'key': 'ojevZ0EyIyZNCy4n', 'enabled': true},
      'tw': {'url': 'https://sdk-os-static.hoyoverse.com/bh3_global/mdk/launcher/api/resource', 'id': 8, 'key': 'demhUTcW', 'enabled': true},
      'kr': {'url': 'https://sdk-os-static.hoyoverse.com/bh3_global/mdk/launcher/api/resource', 'id': 11, 'key': 'PRg571Xh', 'enabled': true},
      'sea': {'url': 'https://sdk-os-static.hoyoverse.com/bh3_global/mdk/launcher/api/resource', 'id': 9, 'key': 'tEGNtVhN', 'enabled': true},
      'eu': {'url': 'https://sdk-os-static.hoyoverse.com/bh3_global/mdk/launcher/api/resource', 'id': 10, 'key': 'dpz65xJ3', 'enabled': true}
    },
    'hk4e': {
      'cn': {'url': 'https://sdk-static.mihoyo.com/hk4e_cn/mdk/launcher/api/resource', 'id': 18, 'key': 'eYd89JmJ', 'enabled': true},
      'os': {'url': 'https://sdk-os-static.hoyoverse.com/hk4e_global/mdk/launcher/api/resource', 'id': 10, 'key': 'gcStgarh', 'enabled': true},
      'beta_os': {'url': 'https://hk4e-beta-launcher-static.hoyoverse.com/hk4e_global/mdk/launcher/api/resource', 'id': null, 'key': null, 'enabled': false}
    },
    'hkrpg': {
      'cn': {'url': 'https://api-launcher.mihoyo.com/hkrpg_cn/mdk/launcher/api/resource', 'id': 33, 'key': '6KcVuOkbcqjJomjZ', 'enabled': true},
      'os': {'url': 'https://hkrpg-launcher-static.hoyoverse.com/hkrpg_global/mdk/launcher/api/resource', 'id': 35, 'key': 'vplOVX8Vn7cwG8yb', 'enabled': true}
    },
    'nap': {
      'os': {'url': 'https://nap-launcher-static.hoyoverse.com/nap_global/mdk/launcher/api/resource', 'id': 11, 'key': 'SxKOglrUsJFxqE4I', 'enabled': true}
    }
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
    'cn': 'CN (China)',
    'cn_bilibili': 'CN BiliBili (China)',
    'os': 'Global (Overseas)',
    'jp': 'JP (Japan)',
    'tw': 'TW/HK/MO (Traditional Chinese)',
    'kr': 'KR (Korea)',
    'sea': 'SEA (Southeast Asia)',
    'eu': 'Global (Europe / America)'
  }
};

async function main () {
  logger.trace(`Running apiConnectRunner ...`);
  const apiResponseReturned = await apiConnectRunner();
  const apiResponseObj = apiResponseReturned[0];
  termKit.table(objArrToArrArr(apiResponseReturned[1]), {
    hasBorder: false,
    contentHasMarkup: true,
    // borderChars: 'lightRounded',
    // borderAttr: { color: 'white' },
    textAttr: {bgColor: 'default'},
    firstRowTextAttr: {bgColor: 'white', color: 'black'},
    width: 80,
    fit: true
  });
  logger.trace(`Returned from apiConnectRunner`);
  logger.info(`All downloads from the API are complete`)
  if (apiResponseObj && Object.keys(apiResponseObj).length === apiDefinition.gameList.length) {
    const gameListVerifiedCount = apiDefinition.gameList.reduce((count, gameNameKey) => {
      return count + (Object.keys(apiResponseObj[gameNameKey]).length === apiDefinition.serverList[gameNameKey].length ? 1 : 0);
    }, 0);
    if (gameListVerifiedCount === apiDefinition.gameList.length) {
      logger.trace(`All API response object key length has been verified`);
      logger.debug(`Reading existing local response JSON files ...`);
      logger.trace(`Running fileManageReaderRunner ...`);
      const fileManageReaderOutput = await fileManageReaderRunner(apiResponseObj);
      logger.trace(`Returned from fileManageReaderRunner`);
      logger.debug(`All local response JSON has been loaded`);
      logger.debug(`Verifying local and remote files ...`);
      logger.trace(`Running fileManageDiffVerifier ...`);
      const fileManageDiffVerifyOutput = await fileManageDiffVerifier(apiResponseObj, fileManageReaderOutput.loadedObj, fileManageReaderOutput.notExistsFileArray);
      logger.trace(`Returned from fileManageDiffVerifier`);
      logger.debug(`All local and remote response JSON has been verified`);
      // logger.trace(`Verify result:`);
      // if (logger.level == 'TRACE') console.log(fileManageDiffVerifyOutput);
      if (fileManageDiffVerifyOutput.needWriteFlagCount > 0) {
        logger.debug(`Writing response JSON to local file ...`);
        logger.trace(`Running fileManageWriterRunner ...`);
        await fileManageWriterRunner(apiResponseObj, fileManageReaderOutput.loadedObj, fileManageDiffVerifyOutput);
        logger.trace(`Returned from fileManageWriterRunner`);
        logger.debug(`Wrote response JSON to local file`);
      } else {
        logger.info(`Local writes were skipped because there were no remote updates`);
      }
      logger.info(`All process has been completed (^_^)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function apiConnectRunner () {
  logger.info(`Connecting to API ...`);
  const definitionList = new Array();
  const responseDispList = new Array();
  const responseObject = new Object();
  logger.trace(`Extracting independent API definition ...`);
  apiDefinition.gameList.forEach((gameNameKey) => {
    responseObject[gameNameKey] = {};
    apiDefinition.serverList[gameNameKey].forEach((serverNameKey) => {
      if (apiDefinition.definition[gameNameKey][serverNameKey].enabled === true) {
        definitionList.push({
          'gameName': gameNameKey,
          'serverName': serverNameKey,
          'url': apiDefinition.definition[gameNameKey][serverNameKey].url,
          'id': apiDefinition.definition[gameNameKey][serverNameKey].id,
          'key': apiDefinition.definition[gameNameKey][serverNameKey].key
        });
      }
    })
  })
  for (const definition of definitionList) {
    logger.trace(`Delaying connect ...`)
    if (apiConnectDelay !== null) await new Promise(resolve => setTimeout(resolve, apiConnectDelay));
    logger.trace(`Requesting ${definition.url.replace(/https:\/\/|\/mdk\/launcher\/api\/resource/g, '')} ...`);
    try {
      const resData = await apiConnect(`${definition.url}`, definition.id, definition.key);
      if (resData) {
        responseDispList.push({
          'game': namePrettyDefinition["gameName"][definition.gameName],
          'server': namePrettyDefinition["serverName"][definition.serverName],
          'version': resData.data.game.latest.version
        });
        responseObject[definition.gameName][definition.serverName] = resData.data;
        responseObject[definition.gameName][definition.serverName].deprecated_files.sort((a, b) => {
          const nameA = a.name.toUpperCase();
          const nameB = b.name.toUpperCase();
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });
        logger.debug(`Downloaded ${definition.url.replace(/https:\/\/|\/mdk\/launcher\/api\/resource/g, '')}`);
      }
    } catch (error) {
      logger.error(`Failed to download data from ${definition.url}`);
      process.exit(1);
      // console.error(error);
      break;
    }
  }
  if (responseDispList.length === 0) {
    logger.error(`API processing failed`);
    return null;
  } else {
    return [
      responseObject,
      responseDispList
    ];
  }
}

async function apiConnect (url, id, key) {
  let connectionTimer = process.hrtime();
  try {
    const response = await axios({
      'method': 'get',
      'url': url,
      'params': {
        'launcher_id': id,
        'key': key
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
    return error.response;
  }
}

async function fileManageReaderRunner (apiResponseObj) {
  const loadedObj = new Object();
  const notExistsFileArray = new Array();
  const masterFileExists = await checkFileExists(path.join(rootDirectory, 'master.json'));
  if (!masterFileExists) {
    notExistsFileArray.push(path.join(rootDirectory, 'master.json'));
  } else {
    loadedObj.master = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'master.json'), {encoding: 'utf8'}));
  }
  for (let i = 0; i < apiDefinition.gameList.length; i++) {
    let gameNameKey = apiDefinition.gameList[i];
    loadedObj[gameNameKey] = {};
    for (let j = 0; j < apiDefinition.serverList[gameNameKey].length; j++) {
      let serverNameKey = apiDefinition.serverList[gameNameKey][j];
      let fileExists = await checkFileExists(path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`));
      if (!fileExists) {
        notExistsFileArray.push(path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`));
      } else {
        loadedObj[gameNameKey][serverNameKey] = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`), {encoding: 'utf8'}));
      }
    }
  }
  return {
    "loadedObj": loadedObj,
    "notExistsFileArray": notExistsFileArray
  }
}

async function fileManageWriterRunner (apiResponseObj, loadedObj, needWriteFlagObj) {
  logger.trace(`Creating folder structure ...`);
  await createFolder(rootDirectory);
  await createFolder(path.join(rootDirectory, 'unique'));
  if (needWriteFlagObj.master) {
    logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))} ...`);
    await fs.promises.writeFile(path.join(rootDirectory, 'master.json'), JSON.stringify(apiResponseObj, '', '  '), {flag: 'w', encoding: 'utf8'});
    logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))}`);
  }
  for (let i = 0; i < apiDefinition.gameList.length; i++) {
    let gameNameKey = apiDefinition.gameList[i];
    for (let j = 0; j < apiDefinition.serverList[gameNameKey].length; j++) {
      let serverNameKey = apiDefinition.serverList[gameNameKey][j];
      if (needWriteFlagObj[gameNameKey][serverNameKey]) {
        logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))} ...`);
        await fs.promises.writeFile(path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`), JSON.stringify(apiResponseObj[gameNameKey][serverNameKey], '', '  '), {flag: 'w', encoding: 'utf8'});
        logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))}`);
      }
    }
  }
}

async function fileManageDiffVerifier (apiResponseObj, loadedObj, notExistsFileArray) {
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
  apiDefinition.gameList.forEach((gameNameKey) => {
    needWriteFlagObj[gameNameKey] = {};
    apiDefinition.serverList[gameNameKey].forEach((serverNameKey) => {
      if (!notExistsFileArray.includes(path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))) {
        if (JSON.stringify(apiResponseObj[gameNameKey][serverNameKey]) == JSON.stringify(loadedObj[gameNameKey][serverNameKey])) {
          needWriteFlagObj[gameNameKey][serverNameKey] = false;
        } else {
          needWriteFlagObj[gameNameKey][serverNameKey] = true;
          needWriteFlagCount += 1;
          logger.info(`Detected remote update of ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))}`);
        }
      } else {
        needWriteFlagObj[gameNameKey][serverNameKey] = true;
        needWriteFlagCount += 1;
        logger.info(`Detected remote update of ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))}`);
      }
    })
  })
  needWriteFlagObj.needWriteFlagCount = needWriteFlagCount;
  return needWriteFlagObj;
}

async function createFolder (folderPath) {
  try {
    await fs.promises.access(folderPath);
  } catch (error) {
    await fs.promises.mkdir(folderPath, {recursive: true});
  }
}

async function checkFileExists (filePath) {
  try {
    await fs.promises.access(path.resolve(filePath), fs.constants.F_OK)
    return true // exists
  } catch (error) {
    return false // not exists
  }
}

function formatFileSize (bytes, decimals = 2) {
  if (bytes === 0) return '0 byte';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// function truncateObjectByKeyDepth(obj, depth) {
//   if (depth === 0) {
//       return "truncated";
//   }
//   let newObj = {};
//   for (let key in obj) {
//       if (typeof obj[key] === 'object' && obj[key] !== null) {
//           newObj[key] = extractObjectDepth(obj[key], depth - 1);
//       } else {
//           newObj[key] = obj[key];
//       }
//   }
//   return newObj;
// }

function objArrToArrArr (objectArray) {
  let outputArr = new Array();
  outputArr.push(Object.keys(objectArray[0]));
  for (let i = 0; i < objectArray.length; i++) {
    let pushArr = new Array();
    outputArr[0].forEach((key) => {
      pushArr.push(objectArray[i][key]);
    })
    outputArr.push(pushArr);
  }
  return outputArr;
}

main();
