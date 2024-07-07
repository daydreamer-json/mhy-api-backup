const fs = require('fs');
const path = require('path');
const { server } = require('typescript');

const rootDirectory = path.resolve(path.join('.', 'output_hoyoplay'));
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
  const apiMasterData = await apiDataImport();
  const generateMdTextOutput = generateMdText(apiMasterData);
  await fileUpdater(generateMdTextOutput);
}

function generateMdText (apiMasterData) {
  const outputTextArray = new Array();
  outputTextArray.push('# miHoYo Game Package API Archive\n');
  outputTextArray.push('This repository fetches game package information from the API provided by miHoYo/HoYoverse and archives it in Git.  ');
  outputTextArray.push('If you wish to refer to previous versions of the game package, please refer to the commit history.  ');
  outputTextArray.push('If you want to see the raw JSON data returned by the API, see the `output` directory.\n');
  outputTextArray.push('The old launcher is no longer supported and the API used until now has stopped being updated. For this reason, information is now fetched from the API of the HoYoPlay launcher.\n');
  Object.keys(apiMasterData).forEach(serverName => {
    apiMasterData[serverName]['game_packages'].reverse();
    apiMasterData[serverName]['game_packages'].forEach(gameObj => {
      const gameCodeName = gameObj.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[1];
      const gameServerName = gameObj.game.biz.match(new RegExp('([a-z0-9]*)_([a-z0-9]*)'))[2];
      if (Object.keys(namePrettyDefinition.gameName).includes(gameCodeName) === true && Object.keys(namePrettyDefinition.serverName).includes(gameServerName) === true) {
        outputTextArray.push(`## ${namePrettyDefinition.gameName[gameCodeName]} - ${namePrettyDefinition.serverName[gameServerName]}\n`);
        outputTextArray.push(`<img src="https://img.shields.io/badge/Game_version-${gameObj.main.major.version}-033dfc?style=flat-square" height="31"/>\n`);
        if (gameObj.main.major['game_pkgs'].length > 0) {
          outputTextArray.push(`### Full Package\n`);
          outputTextArray.push(`|Link|Size|MD5|`);
          outputTextArray.push(`|---|---|---|`);
          if (gameObj.main.major['game_pkgs'].length === 1) {
            outputTextArray.push(`|[Game](${gameObj.main.major['game_pkgs'][0].url})|${formatFileSize(gameObj.main.major['game_pkgs'][0].size, 2)}|\`${gameObj.main.major['game_pkgs'][0].md5.toLowerCase()}\`|`);
          } else {
            for (let i = 0; i < gameObj.main.major['game_pkgs'].length; i++) {
              outputTextArray.push(`|[Part ${i + 1}](${gameObj.main.major['game_pkgs'][i].url})|${formatFileSize(gameObj.main.major['game_pkgs'][i].size, 2)}|\`${gameObj.main.major['game_pkgs'][i].md5.toLowerCase()}\`|`);
            }
          }
          outputTextArray.push('');
        }
        if (gameObj.main.major['audio_pkgs'].length > 0) {
          outputTextArray.push(`### Audio Package\n`);
          outputTextArray.push(`|Link|Size|MD5|`);
          outputTextArray.push(`|---|---|---|`);
          for (let i = 0; i < gameObj.main.major['audio_pkgs'].length; i++) {
            outputTextArray.push(`|[${langDispName(gameObj.main.major['audio_pkgs'][i].language)}](${gameObj.main.major['audio_pkgs'][i].url})|${formatFileSize(gameObj.main.major['audio_pkgs'][i].size, 2)}|\`${gameObj.main.major['audio_pkgs'][i].md5.toLowerCase()}\`|`);
          }
          outputTextArray.push('');
        }
        if (gameObj.main.patches.length > 0) {
          outputTextArray.push(`### Update Diff Package\n`);
          for (let i = 0; i < gameObj.main.patches.length; i++) {
            if (gameObj.main.patches[i]['game_pkgs'].length > 0 || gameObj.main.patches[i]['audio_pkgs'].length > 0) {
              outputTextArray.push(`|From|Link|Size|MD5|`);
              outputTextArray.push(`|---|---|---|---|`);
              if (gameObj.main.patches[i]['game_pkgs'].length > 0) {
                if (gameObj.main.patches[i]['game_pkgs'].length === 1) {
                  outputTextArray.push(`|${gameObj.main.patches[i].version}|[Game](${gameObj.main.patches[i]['game_pkgs'][0].url})|${formatFileSize(gameObj.main.patches[i]['game_pkgs'][0].size, 2)}|\`${gameObj.main.patches[i]['game_pkgs'][0].md5.toLowerCase()}\`|`);
                } else {
                  for (let j = 0; j < gameObj.main.patches[i]['game_pkgs'].length; j++) {
                    outputTextArray.push(`|${gameObj.main.patches[i].version}|[Game - Part ${j + 1}](${gameObj.main.patches[i]['game_pkgs'][j].url})|${formatFileSize(gameObj.main.patches[i]['game_pkgs'][j].size, 2)}|\`${gameObj.main.patches[i]['game_pkgs'][j].md5.toLowerCase()}\`|`);
                  }
                }
              }
              if (gameObj.main.patches[i]['audio_pkgs'].length > 0) {
                for (let j = 0; j < gameObj.main.patches[i]['audio_pkgs'].length; j++) {
                  outputTextArray.push(`|${gameObj.main.patches[i].version}|[Audio - ${langDispName(gameObj.main.patches[i]['audio_pkgs'][j].language)}](${gameObj.main.patches[i]['audio_pkgs'][j].url})|${formatFileSize(gameObj.main.patches[i]['audio_pkgs'][j].size, 2)}|\`${gameObj.main.patches[i]['audio_pkgs'][j].md5.toLowerCase()}\`|`);
                }
              }
              outputTextArray.push('');
            }
          }
        }
        if (gameObj['pre_download'] !== null && gameObj['pre_download'].major !== null) {
          outputTextArray.push(`### Pre-download Package\n`);
          outputTextArray.push(`<img src="https://img.shields.io/badge/Pre--download_version-${gameObj['pre_download'].major.version}-033dfc?style=flat-square" height="31"/>\n`);
          if (gameObj['pre_download'].major['game_pkgs'].length > 0) {
            outputTextArray.push(`#### Full Package\n`);
            outputTextArray.push(`|Link|Size|MD5|`);
            outputTextArray.push(`|---|---|---|`);
            if (gameObj['pre_download'].major['game_pkgs'].length === 1) {
              outputTextArray.push(`|[Game](${gameObj['pre_download'].major['game_pkgs'][0].url})|${formatFileSize(gameObj['pre_download'].major['game_pkgs'][0].size, 2)}|\`${gameObj['pre_download'].major['game_pkgs'][0].md5.toLowerCase()}\`|`);
            } else {
              for (let i = 0; i < gameObj['pre_download'].major['game_pkgs'].length; i++) {
                outputTextArray.push(`|[Part ${i + 1}](${gameObj['pre_download'].major['game_pkgs'][i].url})|${formatFileSize(gameObj['pre_download'].major['game_pkgs'][i].size, 2)}|\`${gameObj['pre_download'].major['game_pkgs'][i].md5.toLowerCase()}\`|`);
              }
            }
            outputTextArray.push('');
          }
          if (gameObj['pre_download'].major['audio_pkgs'].length > 0) {
            outputTextArray.push(`#### Audio Package\n`);
            outputTextArray.push(`|Link|Size|MD5|`);
            outputTextArray.push(`|---|---|---|`);
            for (let i = 0; i < gameObj['pre_download'].major['audio_pkgs'].length; i++) {
              outputTextArray.push(`|[${langDispName(gameObj['pre_download'].major['audio_pkgs'][i].language)}](${gameObj['pre_download'].major['audio_pkgs'][i].url})|${formatFileSize(gameObj['pre_download'].major['audio_pkgs'][i].size, 2)}|\`${gameObj['pre_download'].major['audio_pkgs'][i].md5.toLowerCase()}\`|`);
            }
            outputTextArray.push('');
          }
          if (gameObj['pre_download'].patches.length > 0) {
            outputTextArray.push(`#### Update Diff Package\n`);
            for (let i = 0; i < gameObj['pre_download'].patches.length; i++) {
              if (gameObj['pre_download'].patches[i]['game_pkgs'].length > 0 || gameObj['pre_download'].patches[i]['audio_pkgs'].length > 0) {
                outputTextArray.push(`|From|Link|Size|MD5|`);
                outputTextArray.push(`|---|---|---|---|`);
                if (gameObj['pre_download'].patches[i]['game_pkgs'].length > 0) {
                  if (gameObj['pre_download'].patches[i]['game_pkgs'].length === 1) {
                    outputTextArray.push(`|${gameObj['pre_download'].patches[i].version}|[Game](${gameObj['pre_download'].patches[i]['game_pkgs'][0].url})|${formatFileSize(gameObj['pre_download'].patches[i]['game_pkgs'][0].size, 2)}|\`${gameObj['pre_download'].patches[i]['game_pkgs'][0].md5.toLowerCase()}\`|`);
                  } else {
                    for (let j = 0; j < gameObj['pre_download'].patches[i]['game_pkgs'].length; j++) {
                      outputTextArray.push(`|${gameObj['pre_download'].patches[i].version}|[Game - Part ${j + 1}](${gameObj['pre_download'].patches[i]['game_pkgs'][j].url})|${formatFileSize(gameObj['pre_download'].patches[i]['game_pkgs'][j].size, 2)}|\`${gameObj['pre_download'].patches[i]['game_pkgs'][j].md5.toLowerCase()}\`|`);
                    }
                  }
                }
                if (gameObj['pre_download'].patches[i]['audio_pkgs'].length > 0) {
                  for (let j = 0; j < gameObj['pre_download'].patches[i]['audio_pkgs'].length; j++) {
                    outputTextArray.push(`|${gameObj['pre_download'].patches[i].version}|[Audio - ${langDispName(gameObj['pre_download'].patches[i]['audio_pkgs'][j].language)}](${gameObj['pre_download'].patches[i]['audio_pkgs'][j].url})|${formatFileSize(gameObj['pre_download'].patches[i]['audio_pkgs'][j].size, 2)}|\`${gameObj['pre_download'].patches[i]['audio_pkgs'][j].md5.toLowerCase()}\`|`);
                  }
                }
                outputTextArray.push('');
              }
            }
          }
        }
      }
    })
  })
  return outputTextArray.join('\n');
}

async function apiDataImport () {
  let apiMasterData = null;
  if (await checkFileExists(path.join(rootDirectory, 'master.json'))) {
    apiMasterData = JSON.parse(await fs.promises.readFile(path.join(rootDirectory, 'master.json'), {encoding: 'utf8'}));
    return apiMasterData;
  } else {
    throw new Error('API master output data not found');
  }
}

async function checkFileExists (filePath) {
  try {
    await fs.promises.access(path.resolve(filePath), fs.constants.F_OK);
    return true // exists
  } catch (error) {
    return false // not exists
  }
}

async function fileUpdater (outputText) {
  let isNeedWrite = true;
  if (await checkFileExists(path.resolve(path.join(rootDirectory, '../', 'README.md'))) === false) {
    isNeedWrite = true;
  } else {
    const loadedFileData = await fs.promises.readFile(path.resolve(path.join(rootDirectory, '../', 'README.md')), {encoding: 'utf8'});
    if (loadedFileData === outputText) {
      isNeedWrite = false;
    } else {
      isNeedWrite = true;
    }
  }
  if (isNeedWrite === true) {
    await fs.promises.writeFile(path.resolve(path.join(rootDirectory, '../', 'README.md')), outputText, {flag: 'w', encoding: 'utf8'});
  }
}

function langDispName (inputText, displayLanguage = 'en-us') {
  const nameFunc = new Intl.DisplayNames([displayLanguage], {'type': 'language'});
  return nameFunc.of(inputText);
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
