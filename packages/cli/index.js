#!/usr/bin/env node

const {run: jscodeshift} = require('jscodeshift/src/Runner')
const path = require('node:path');
const { exec } = require('node:child_process');
const fs = require('fs');
const Enquirer = require('enquirer');
const enquirer = new Enquirer();

const options = {
  // dry: true,
  // print: true,
  // verbose: 1,
  parser: 'ts',
  silent: true,
  verbose: 0
}

class Logger {
  info(message) {
    console.log(`\x1b[34mi\x1b[0m ${message}`);
  }

  error(message) {
    console.error(`\x1b[31mError: ${message}\x1b[0m`);
  }

  success(message) {
    console.log(`\x1b[32m✓\x1b[0m ${message}`);
  }
}
const logger = new Logger();


async function main() {
  if (process.argv.includes('--help')) {
    console.log(`Usage: nestjs-zod-cli [path/to/nestjs/project/folder]`)
    console.log("")
    console.log("Runs codemod(s) to automatically setup nestjs-zod in a nestjs project");
    process.exit(0);
  }

  await logHeader();

  const projectFolder = getProjectFolder();

  if (!fs.existsSync(path.join(projectFolder, 'src', 'main.ts'))) {
    logger.error('src/main.ts does not exist.  Are you sure this is a NestJS project?');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(projectFolder, 'src', 'app.module.ts'))) {
    logger.error('src/app.module.ts does not exist.  Are you sure this is a NestJS project?');
    process.exit(1);
  }

  await tryInstallMissingPackages(projectFolder);

  const updatedFiles = [path.join('src', 'app.module.ts')];
  logger.info('Updating app.module.ts');
  try {
    const result1 = await jscodeshift(
      path.join(__dirname, 'appModuleTransform.js'),
      [path.join(projectFolder, 'src', 'app.module.ts')], 
      options
    )
    if (result1.error > 0) {
      throw new Error('jscodeshift error');
    }
  } catch {
    logger.error("An error occurred while trying to update src/app.module.ts.  You may need to continue setup manually.  Please check the nestjs-zod README for more details");
    process.exit(1);
  }

  logger.success('Updated app.module.ts')

  if (await checkShouldUpdateMain(projectFolder)) {
    logger.info('Updating main.ts');
    try {
      const result2 = await jscodeshift(
        path.join(__dirname, 'swaggerTransform.js'), 
        [path.join(projectFolder, 'src', 'main.ts')], 
        options
      )
      if (result2.error > 0) {
        throw new Error('jscodeshift error');
      }
    } catch {
      logger.error("An error occurred while trying to update src/main.ts.  You may need to continue setup manually.  Please check the nestjs-zod README for more details");
      process.exit(1);
    }
    logger.success('Updated main.ts');
    updatedFiles.push([path.join('src', 'main.ts')])
  }

  if (await shouldFormatFiles(projectFolder)) {
    logger.info('Running formatter')
    try {
      await execAsync(`cd ${projectFolder} && npx prettier ${updatedFiles.join(" ")} --write`)
    } catch (err) {
      logger.error("An error occurred while trying to run prettier to format the changed files");
      process.exit(1);
    }
    logger.success('Ran formatter')
  }
  console.log("");
  console.log("\x1b[32mSuccessfully setup nestjs-zod\x1b[0m")
}

async function tryInstallMissingPackages(projectFolder) {
  const pkgInfo = getProjectPackageJson(projectFolder);

  /**
   * @type {Array<'nestjs-zod'|'zod'>}
   */
  const uninstalledPackages = [];

  if (!Boolean(pkgInfo.dependencies['nestjs-zod'])) uninstalledPackages.push('nestjs-zod');
  if (!Boolean(pkgInfo.dependencies['zod'])) uninstalledPackages.push('zod');
  if (uninstalledPackages.length === 0) return;

  const inferredPackageManager = inferPackageManager(projectFolder);

  const userResponse = await enquirer.prompt({
    type: 'select',
    name: 'install',
    message: `${uninstalledPackages.join(' and ')} ${uninstalledPackages.length > 1 ? 'are' : 'is'} not installed.  Would you like to install ${uninstalledPackages.length > 1 ? 'them' : 'it'} using ${inferredPackageManager}?`,
    choices: [
      'Yes', 
      inferredPackageManager !== 'npm' ? 'Yes, but use npm' : null,
      inferredPackageManager !== 'pnpm' ? 'Yes, but use pnpm' : null,
      inferredPackageManager !== 'yarn' ? 'Yes, but use yarn' : null,
      'No'
    ].filter(Boolean)
  });

  if (userResponse.install === 'No') {
    logger.info('Skipping installation of missing packages');
    return
  }

  const actualPackageManager = userResponse.install === 'Yes' ? inferredPackageManager : userResponse.install === 'Yes, but use npm' ? 'npm' : userResponse.install === 'Yes, but use pnpm' ? 'pnpm' : 'yarn';

  logger.info(`Installing ${uninstalledPackages.join(' and ')} using ${actualPackageManager}`);
  try {
    await execAsync(`cd ${projectFolder} && ${actualPackageManager} ${actualPackageManager === 'yarn' ? 'add' : 'install'} ${uninstalledPackages.map(packageName => `${packageName}@latest`).join(' ')}`);
    logger.success(`Installed ${uninstalledPackages.join(' and ')} using ${actualPackageManager}`);
  } catch (error) {
    logger.error(`Failed to install ${uninstalledPackages.join(' and ')} using ${actualPackageManager}`);
    process.exit(1);
  }
}

/**
 * @param {string} projectFolder 
 * @returns {boolean}
 */
async function checkShouldUpdateMain(projectFolder) {
  const alreadyUsingSwagger = fs.readFileSync(path.join(projectFolder, 'src', 'main.ts'), 'utf8').includes('@nestjs/swagger');
  if (alreadyUsingSwagger) {
    return true;
  }

  const userResponse = await enquirer.prompt({
    type: 'select',
    name: 'install',
    message: 'Do you want to setup automatic swagger/openapi generation?',
    choices: [
      'Yes', 
      'No'
    ].filter(Boolean)
  });

  return userResponse.install === 'Yes';
}

/**
 * Checks if we should format the files.  We should only format the files if the
 * user's format command is prettier and they have prettier installed as a
 * devDependency
 *
 * @param {string} projectFolder 
 * @returns {boolean}
 */
async function shouldFormatFiles(projectFolder) {
  const pkgInfo = getProjectPackageJson(projectFolder);
  return Boolean(pkgInfo.scripts.format?.includes('prettier')) && Boolean(pkgInfo.devDependencies['prettier']);
}

/**
 * @param {string} command 
 */
async function execAsync(command) {
  await new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function getProjectFolder() {
  const argv = process.argv;
  const projectFolder = argv[argv.length - 1];

  try {
    if (!fs.statSync(projectFolder).isDirectory()) {
      logger.error("First argument must be a path to a nestjs project");
      process.exit(1);
    }
  } catch {
    logger.error("First argument must be a path to a nestjs project");
    process.exit(1);
  }


  const absoluteProjectFolder = path.resolve(projectFolder);

  let pkgJson;
  try {
    pkgJson = fs.readFileSync(path.join(absoluteProjectFolder, 'package.json'), 'utf8');
  } catch (error) {
    logger.error("First argument must be a path to a nestjs project");
    process.exit(1);
  }

  let pkgInfo;
  try {
    pkgInfo = JSON.parse(pkgJson)
  } catch (error) {
    logger.error("An json parsing error occurred while trying to read package.json");
    process.exit(1);
  }

  if (!pkgInfo.dependencies['@nestjs/core']) {
    logger.error("Project does not have @nestjs/core as a dependency.  Are you sure this is a NestJS project?");
    process.exit(1);
  }

  return absoluteProjectFolder;
}

/**
 * @param {string} projectFolder  
 */
function getProjectPackageJson(projectFolder) {
  const pkgJson = fs.readFileSync(path.join(projectFolder, 'package.json'), 'utf8');
  return JSON.parse(pkgJson);
}

/**
 * @param {string} projectFolder 
 * @returns {'npm'|'pnpm'|'yarn'}
 */
function inferPackageManager(projectFolder) {
  if (fs.existsSync(path.join(projectFolder, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  
  if (fs.existsSync(path.join(projectFolder, 'yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

async function delayAndLog(message) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log(message);
}

async function logHeader() {
  console.log("");
  await delayAndLog("\x1b[31m                   @@+            \x1b[0m                   "+            "  \x1b[34m                                            \x1b[0m");
  await delayAndLog("\x1b[31m                   -@@@@#         \x1b[0m                   "+            "  \x1b[34m         .#*##*################*##*#*       \x1b[0m");
  await delayAndLog("\x1b[31m          *@@@@@@+  @##@@         \x1b[0m                   "+            "  \x1b[34m        -***#%%@@@@@@@@@@@@@@@@%@%**+*      \x1b[0m");
  await delayAndLog("\x1b[31m       @@@@@%##@@@@@@###@@        \x1b[0m                   "+            "  \x1b[34m        ++*:                       #+++     \x1b[0m");
  await delayAndLog("\x1b[31m     @@@%##############@@  @@     \x1b[0m\x1b[35m          @@@@       \x1b[0m\x1b[34m       +++-                         #+*     \x1b[0m");
  await delayAndLog("\x1b[31m  @@@@%##############%@@  @@@@    \x1b[0m\x1b[35m          @##@       \x1b[0m\x1b[34m      .+==                           *+*    \x1b[0m");
  await delayAndLog("\x1b[31m  @@@################%  @@@%#@@   \x1b[0m\x1b[35m          @##@       \x1b[0m\x1b[34m      *+=--=+*********##+-.          ==*+   \x1b[0m");
  await delayAndLog("\x1b[31m   @@@@@@@@@@@#######%@@@%###@@   \x1b[0m\x1b[35m    @@@@@@@##@@@@@@@ \x1b[0m\x1b[34m     *@@@@@@@@@@@@@@@@@@*          .===+%   \x1b[0m");
  await delayAndLog("\x1b[31m     @       @@@##############@@  \x1b[0m\x1b[35m    @@@@@@@##@@@@@@@ \x1b[0m\x1b[34m     @@@@@@@@@@@@@@@*:          .-*@@@@@@+  \x1b[0m");
  await delayAndLog("\x1b[31m               @@#############@@  \x1b[0m\x1b[35m          @##@       \x1b[0m\x1b[34m     =@@@@@@@@@@@@+         :=+@@@@@@@@@@   \x1b[0m");
  await delayAndLog("\x1b[31m                @@############@@  \x1b[0m\x1b[35m          @##@       \x1b[0m\x1b[34m       *@%#+++-           :-+@@@@@@@@@@=    \x1b[0m");
  await delayAndLog("\x1b[31m         @@      @@@@#########@#  \x1b[0m\x1b[35m          @@@@       \x1b[0m\x1b[34m         +@%#=                  -*#@@-      \x1b[0m");
  await delayAndLog("\x1b[31m       .@@@    @@@@ @######@@@@   \x1b[0m                   "+            "  \x1b[34m           =@@@@*            :#%@@@-        \x1b[0m");
  await delayAndLog("\x1b[31m         @@@@@@@@@= @#####@@ @    \x1b[0m                   "+            "  \x1b[34m             -@@@@%        -@@@@@.          \x1b[0m");
  await delayAndLog("\x1b[31m         @@@@@@@  @@##@@@@+       \x1b[0m                   "+            "  \x1b[34m               .@@@@@    :@@@@@             \x1b[0m");
  await delayAndLog("\x1b[31m                  @@#@@@ @.       \x1b[0m                   "+            "  \x1b[34m                  %@@@@#@@@@%               \x1b[0m");
  await delayAndLog("\x1b[31m                   @@@  @         \x1b[0m                   "+            "  \x1b[34m                    #@@@@@#                 \x1b[0m");
  await delayAndLog("\x1b[31m                *@@               \x1b[0m                   "+            "  \x1b[34m                      -+-                   \x1b[0m");
  console.log("");                                                                                                  
  console.log("                               ✨ \x1b[35mnestjs-zod automatic setup\x1b[0m ✨")
  console.log("");
}

main();
