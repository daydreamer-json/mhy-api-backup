const log4js = require('log4js');
const color = require('ansi-colors');
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
if (logger.level != 'TRACE') {
  console.log(`Logs with levels less than '${logger.level}' are truncated`);
}
logger.trace('Program has been started');

const rootDirectory = path.resolve(path.join('.', 'output'));
const apiConnectDelay = 100;
const apiDefinition = JSON.parse(atob('eyJnYW1lTGlzdCI6WyJiaDMiLCJoazRlIiwiaGtycGciLCJuYXAiXSwic2VydmVyTGlzdCI6eyJiaDMiOlsiY24iLCJqcCIsInR3Iiwia3IiLCJzZWEiLCJldSJdLCJoazRlIjpbImNuIiwib3MiXSwiaGtycGciOlsiY24iLCJvcyJdLCJuYXAiOlsib3MiXX0sImRlZmluaXRpb24iOnsiYmgzIjp7ImNuIjp7InVybCI6Imh0dHBzOi8vYmgzLWxhdW5jaGVyLXN0YXRpYy5taWhveW8uY29tL2JoM19jbi9tZGsvbGF1bmNoZXIvYXBpL3Jlc291cmNlIiwiaWQiOjQsImtleSI6IlN5dnVQbnFMIiwiZW5hYmxlZCI6dHJ1ZX0sImpwIjp7InVybCI6Imh0dHBzOi8vc2RrLW9zLXN0YXRpYy5ob3lvdmVyc2UuY29tL2JoM19nbG9iYWwvbWRrL2xhdW5jaGVyL2FwaS9yZXNvdXJjZSIsImlkIjoxOSwia2V5Ijoib2pldlowRXlJeVpOQ3k0biIsImVuYWJsZWQiOnRydWV9LCJ0dyI6eyJ1cmwiOiJodHRwczovL3Nkay1vcy1zdGF0aWMuaG95b3ZlcnNlLmNvbS9iaDNfZ2xvYmFsL21kay9sYXVuY2hlci9hcGkvcmVzb3VyY2UiLCJpZCI6OCwia2V5IjoiZGVtaFVUY1ciLCJlbmFibGVkIjp0cnVlfSwia3IiOnsidXJsIjoiaHR0cHM6Ly9zZGstb3Mtc3RhdGljLmhveW92ZXJzZS5jb20vYmgzX2dsb2JhbC9tZGsvbGF1bmNoZXIvYXBpL3Jlc291cmNlIiwiaWQiOjExLCJrZXkiOiJQUmc1NzFYaCIsImVuYWJsZWQiOnRydWV9LCJzZWEiOnsidXJsIjoiaHR0cHM6Ly9zZGstb3Mtc3RhdGljLmhveW92ZXJzZS5jb20vYmgzX2dsb2JhbC9tZGsvbGF1bmNoZXIvYXBpL3Jlc291cmNlIiwiaWQiOjksImtleSI6InRFR050VmhOIiwiZW5hYmxlZCI6dHJ1ZX0sImV1Ijp7InVybCI6Imh0dHBzOi8vc2RrLW9zLXN0YXRpYy5ob3lvdmVyc2UuY29tL2JoM19nbG9iYWwvbWRrL2xhdW5jaGVyL2FwaS9yZXNvdXJjZSIsImlkIjoxMCwia2V5IjoiZHB6NjV4SjMiLCJlbmFibGVkIjp0cnVlfX0sImhrNGUiOnsiY24iOnsidXJsIjoiaHR0cHM6Ly9zZGstc3RhdGljLm1paG95by5jb20vaGs0ZV9jbi9tZGsvbGF1bmNoZXIvYXBpL3Jlc291cmNlIiwiaWQiOjE4LCJrZXkiOiJlWWQ4OUptSiIsImVuYWJsZWQiOnRydWV9LCJvcyI6eyJ1cmwiOiJodHRwczovL3Nkay1vcy1zdGF0aWMuaG95b3ZlcnNlLmNvbS9oazRlX2dsb2JhbC9tZGsvbGF1bmNoZXIvYXBpL3Jlc291cmNlIiwiaWQiOjEwLCJrZXkiOiJnY1N0Z2FyaCIsImVuYWJsZWQiOnRydWV9LCJiZXRhX29zIjp7InVybCI6Imh0dHBzOi8vaGs0ZS1iZXRhLWxhdW5jaGVyLXN0YXRpYy5ob3lvdmVyc2UuY29tL2hrNGVfZ2xvYmFsL21kay9sYXVuY2hlci9hcGkvcmVzb3VyY2UiLCJpZCI6bnVsbCwia2V5IjpudWxsLCJlbmFibGVkIjpmYWxzZX19LCJoa3JwZyI6eyJjbiI6eyJ1cmwiOiJodHRwczovL2FwaS1sYXVuY2hlci5taWhveW8uY29tL2hrcnBnX2NuL21kay9sYXVuY2hlci9hcGkvcmVzb3VyY2UiLCJpZCI6MzMsImtleSI6IjZLY1Z1T2tiY3FqSm9taloiLCJlbmFibGVkIjp0cnVlfSwib3MiOnsidXJsIjoiaHR0cHM6Ly9oa3JwZy1sYXVuY2hlci1zdGF0aWMuaG95b3ZlcnNlLmNvbS9oa3JwZ19nbG9iYWwvbWRrL2xhdW5jaGVyL2FwaS9yZXNvdXJjZSIsImlkIjozNSwia2V5IjoidnBsT1ZYOFZuN2N3Rzh5YiIsImVuYWJsZWQiOnRydWV9fSwibmFwIjp7Im9zIjp7InVybCI6Imh0dHBzOi8vbmFwLWxhdW5jaGVyLXN0YXRpYy5ob3lvdmVyc2UuY29tL25hcF9nbG9iYWwvbWRrL2xhdW5jaGVyL2FwaS9yZXNvdXJjZSIsImlkIjoxMSwia2V5IjoiU3hLT2dsclVzSkZ4cUU0SSIsImVuYWJsZWQiOnRydWV9fX19'));
const namePrettyDefinition = JSON.parse(atob('eyJnYW1lTmFtZSI6eyJiaDMiOiJIb25rYWkgSW1wYWN0IDNyZCIsImhrNGUiOiJHZW5zaGluIEltcGFjdCIsImhrcnBnIjoiSG9ua2FpOiBTdGFyIFJhaWwiLCJuYXAiOiJaZW5sZXNzIFpvbmUgWmVybyJ9LCJzZXJ2ZXJOYW1lIjp7ImNuIjoiQ04gKENoaW5hKSIsImNuX2JpbGliaWxpIjoiQ04gQmlsaUJpbGkgKENoaW5hKSIsIm9zIjoiR2xvYmFsIChPdmVyc2VhcykiLCJqcCI6IkpQIChKYXBhbikiLCJ0dyI6IlRXL0hLL01PIChUcmFkaXRpb25hbCBDaGluZXNlKSIsImtyIjoiS1IgKEtvcmVhKSIsInNlYSI6IlNFQSAoU291dGhlYXN0IEFzaWEpIiwiZXUiOiJHbG9iYWwgKEV1cm9wZSAvIEFtZXJpY2EpIn19'));

async function apiConnect (url, id, key) {
  try {
    const response = await axios({
      'method': 'get',
      'url': url,
      'params': {
        'launcher_id': id,
        'key': key
      },
      'headers': {
        'User-Agent': 'Mozilla/5.0'
      },
      'timeout': 10000,
    });
    return response.data;
  } catch (error) {
    logger.error(`API Request Failed: ${error.code}`);
    // console.error(error);
    throw error;
    return error.response;
  }
}

async function main () {
  logger.trace(`Running apiConnectRunner ...`);
  const apiResponseReturned = await apiConnectRunner();
  const apiResponseObj = apiResponseReturned[0];
  logger.trace(`Returned from apiConnectRunner`);
  if (apiResponseObj && Object.keys(apiResponseObj).length === apiDefinition.gameList.length) {
    const gameListVerifiedCount = apiDefinition.gameList.reduce((count, gameNameKey) => {
      return count + (Object.keys(apiResponseObj[gameNameKey]).length === apiDefinition.serverList[gameNameKey].length ? 1 : 0);
    }, 0);
    if (gameListVerifiedCount === apiDefinition.gameList.length) {
      await fileManageWriterRunner(apiResponseObj);
    }
  }
}

async function apiConnectRunner () {
  logger.debug(`Connecting to API ...`);
  logger.trace(`API connection delay: ${apiConnectDelay} ms`);
  // const loadedData = await fs.promises.readFile('in.md', {encoding: 'utf8'});
  // const responseHtml = await apiConnect(loadedData);
  // await fs.promises.writeFile('README.html', responseHtml, {flag: 'w', encoding: 'utf8'});
  // logger.info(`Wrote data to README.html`);
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

async function fileManageWriterRunner (apiResponseObj) {
  logger.trace(`Creating folder structure ...`);
  await createFolder(rootDirectory);
  await createFolder(path.join(rootDirectory, 'unique'));
  logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))} ...`);
  await fs.promises.writeFile(path.join(rootDirectory, 'master.json'), JSON.stringify(apiResponseObj, '', '  '), {flag: 'w', encoding: 'utf8'});
  logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'master.json'))}`);
  for (let i = 0; i < apiDefinition.gameList.length; i++) {
    let gameNameKey = apiDefinition.gameList[i];
    for (let j = 0; j < apiDefinition.serverList[gameNameKey].length; j++) {
      let serverNameKey = apiDefinition.serverList[gameNameKey][j];
      logger.trace(`Writing to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))} ...`);
      await fs.promises.writeFile(path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`), JSON.stringify(apiResponseObj[gameNameKey][serverNameKey], '', '  '), {flag: 'w', encoding: 'utf8'});
      logger.debug(`Wrote data to ${path.relative(path.resolve(process.cwd()), path.join(rootDirectory, 'unique', `${gameNameKey}_${serverNameKey}.json`))}`);
    }
  }
}

async function createFolder (folderPath) {
  try {
    await fs.promises.access(folderPath);
  } catch (error) {
    await fs.promises.mkdir(folderPath, {recursive: true});
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

main();