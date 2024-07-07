const log4js = require('log4js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
    'global': {'url': 'https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages', 'id': 'VYTpXlbWo8', 'enabled': true},
    'cn': {'url': 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages', 'id': 'jGHBHlcOq1', 'enabled': true}
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
  }
};

async function main () {
  const apiResponseObj = await apiConnectRunner();
  // console.log(apiResponseObj);
  const fileManageReaderOutput = await fileManageReader();
  const fileManageDiffVerifyOutput = await fileManageDiffVerifier(apiResponseObj, fileManageReaderOutput.loadedObj, fileManageReaderOutput.notExistsFileArray);
  if (fileManageDiffVerifyOutput.needWriteFlagCount > 0) {
    logger.debug(`Writing response JSON to local file ...`);
    await fileManageWriter(apiResponseObj, fileManageDiffVerifyOutput);
    logger.debug(`Wrote response JSON to local file`);
  } else {
    logger.info(`Local writes were skipped because there were no remote updates`);
  }
  logger.info(`All process has been completed (^_^)`);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function apiConnectRunner () {
  const definitionList = new Array();
  const responseObject = new Object();
  apiDefinition.serverList.forEach(serverNameKey => {
    if (apiDefinition.definition[serverNameKey].enabled === true) {
      definitionList.push({'serverName': serverNameKey, ...apiDefinition.definition[serverNameKey]});
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

async function apiConnect (url, id) {
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

async function fileManageReader () {
  const loadedObj = new Object();
  const notExistsFileArray = new Array();
  const masterFileExists = await checkFileExists(path.join(rootDirectory, 'master.json'));
  if (!masterFileExists) {
    notExistsFileArray.push(path.join(rootDirectory, 'master.json'));
  } else {
    loadedObj.master = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'master.json'), {encoding: 'utf8'}));
  }
  for (let i = 0; i < apiDefinition.serverList.length; i++) {
    let serverNameKey = apiDefinition.serverList[i];
    let fileExists = await checkFileExists(path.join(rootDirectory, 'unique', `${serverNameKey}.json`));
    if (!fileExists) {
      notExistsFileArray.push(path.join(rootDirectory, 'unique', `${serverNameKey}.json`));
    } else {
      loadedObj[serverNameKey] = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'unique', `${serverNameKey}.json`), {encoding: 'utf8'}));
    }
  }
  return {
    "loadedObj": loadedObj,
    "notExistsFileArray": notExistsFileArray
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

async function fileManageWriter (apiResponseObj, needWriteFlagObj) {
  logger.trace(`Creating folder structure ...`);
  await createFolder(rootDirectory);
  await createFolder(path.join(rootDirectory, 'unique'));
  if (needWriteFlagObj.master) {
    logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))} ...`);
    await fs.promises.writeFile(path.join(rootDirectory, 'master.json'), JSON.stringify(apiResponseObj, '', '  '), {flag: 'w', encoding: 'utf8'});
    logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))}`);
  }
  for (let i = 0; i < apiDefinition.serverList.length; i++) {
    let serverNameKey = apiDefinition.serverList[i];
    if (needWriteFlagObj[serverNameKey]) {
      logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${serverNameKey}.json`))} ...`);
      await fs.promises.writeFile(path.join(rootDirectory, 'unique', `${serverNameKey}.json`), JSON.stringify(apiResponseObj[serverNameKey], '', '  '), {flag: 'w', encoding: 'utf8'});
      logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${serverNameKey}.json`))}`);
    }
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

async function createFolder (folderPath) {
  try {
    await fs.promises.access(folderPath);
  } catch (error) {
    await fs.promises.mkdir(folderPath, {recursive: true});
  }
}


main();
