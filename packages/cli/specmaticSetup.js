// @ts-check

const fs = require('fs');
const path = require('node:path');

const GITIGNORE_ENTRIES = [
  '.specmatic',
  'build/reports/specmatic',
  '.specmatic-readiness-probe.json',
];

/**
 * Scaffolds Specmatic contract testing (https://specmatic.io/) into a NestJS project
 * that already has swagger/openapi generation set up via `cleanupOpenApiDoc`.
 *
 * Unlike the jscodeshift transforms in this package, this step mostly creates
 * brand-new files rather than editing existing ones, so it's implemented with
 * plain `fs` calls instead of a codemod.
 *
 * @param {string} projectFolder
 * @param {{
 *   logger: { info: (msg: string) => void, error: (msg: string) => void, success: (msg: string) => void },
 *   enquirer: import('enquirer'),
 *   tryInstallMissingPackages: (projectFolder: string, packages: Array<{ name: string, target: 'dependencies' | 'devDependencies' }>) => Promise<void>,
 *   getProjectPackageJson: (projectFolder: string) => any,
 * }} deps
 * @returns {Promise<{ setUp: boolean, createdFiles: string[] }>}
 */
async function setupSpecmatic(projectFolder, { logger, enquirer, tryInstallMissingPackages, getProjectPackageJson }) {
  const scriptsDir = path.join(projectFolder, 'scripts');
  const generateOpenApiPath = path.join(scriptsDir, 'generate-openapi.ts');
  const examplesDir = path.join(projectFolder, 'specmatic-examples');

  if (fs.existsSync(generateOpenApiPath) && fs.existsSync(examplesDir)) {
    logger.info('Specmatic already set up, skipping');
    return { setUp: false, createdFiles: [] };
  }

  const userResponse = await enquirer.prompt({
    type: 'select',
    name: 'setup',
    message: 'Do you want to setup Specmatic contract testing?  This adds a script to generate your OpenAPI spec and verify your running API against it.',
    choices: ['Yes', 'No'],
  });

  if (userResponse.setup === 'No') {
    logger.info('Skipping Specmatic setup');
    return { setUp: false, createdFiles: [] };
  }

  await tryInstallMissingPackages(projectFolder, [
    { name: 'specmatic', target: 'devDependencies' },
    { name: 'ts-node', target: 'devDependencies' },
    { name: 'tsconfig-paths', target: 'devDependencies' },
  ]);

  logger.info('Scaffolding Specmatic contract testing');

  const pkgInfo = getProjectPackageJson(projectFolder);
  const port = detectPort(projectFolder);

  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(generateOpenApiPath, createGenerateOpenApiScript(pkgInfo.name));

  fs.mkdirSync(examplesDir, { recursive: true });
  const readmePath = path.join(examplesDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, createExamplesReadme());
  }

  addPackageJsonScripts(projectFolder, pkgInfo, port);
  addGitignoreEntries(projectFolder);

  logger.success('Scaffolded Specmatic contract testing');

  return {
    setUp: true,
    createdFiles: [path.join('scripts', 'generate-openapi.ts'), 'package.json'],
  };
}

/**
 * @param {string} projectFolder
 * @returns {number}
 */
function detectPort(projectFolder) {
  try {
    const mainTs = fs.readFileSync(path.join(projectFolder, 'src', 'main.ts'), 'utf8');
    const match = mainTs.match(/\.listen\(\s*process\.env\.PORT\s*\?\?\s*(\d+)/) || mainTs.match(/\.listen\(\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
  } catch {
    // fall through to default
  }
  return 3000;
}

/**
 * @param {string} packageName
 */
function createGenerateOpenApiScript(packageName) {
  const title = `${packageName || 'Example'} API`;
  return `import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('${title}')
      .setVersion('1.0')
      .build(),
  );

  writeFileSync(
    join(__dirname, '..', 'openapi.json'),
    JSON.stringify(cleanupOpenApiDoc(openApiDoc), null, 2) + '\\n',
  );

  await app.close();
}

main();
`;
}

function createExamplesReadme() {
  return `# Specmatic examples

This directory holds fixtures for [Specmatic](https://specmatic.io/) contract tests. Each file
replays a real HTTP request against your running app and checks the real response against
\`openapi.json\`.

Each fixture is a JSON file shaped like:

\`\`\`json
{
  "http-request": {
    "method": "GET",
    "path": "/your-route/1"
  },
  "http-response": {
    "status": 200,
    "body": { "...": "..." }
  }
}
\`\`\`

**Don't hand-write the response bodies.** Start your app and capture the real response, e.g.:

\`\`\`bash
curl -s -i http://localhost:3000/your-route/1
\`\`\`

then copy the body verbatim into the fixture. This matters most for error responses (404s from
\`NotFoundException\`, 400s from \`ZodValidationPipe\`) since their exact shape comes from
NestJS/nestjs-zod internals, not your own code, and is easy to guess wrong.

Add one fixture per response shape worth protecting (a happy path, plus each distinct error
case your routes can produce), then run your app's \`test:contract\` script.
`;
}

/**
 * @param {string} projectFolder
 * @param {any} pkgInfo
 * @param {number} port
 */
function addPackageJsonScripts(projectFolder, pkgInfo, port) {
  const pkgJsonPath = path.join(projectFolder, 'package.json');

  pkgInfo.scripts = pkgInfo.scripts || {};

  if (!pkgInfo.scripts['generate:openapi']) {
    pkgInfo.scripts['generate:openapi'] = 'ts-node -r tsconfig-paths/register scripts/generate-openapi.ts';
  }

  if (!pkgInfo.scripts['test:contract']) {
    pkgInfo.scripts['test:contract'] =
      `curl -sf --retry 10 --retry-delay 2 --retry-connrefused http://localhost:${port}/api-json -o .specmatic-readiness-probe.json && specmatic test openapi.json --testBaseURL=http://localhost:${port} --examples=specmatic-examples`;
  }

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgInfo, null, 2) + '\n');
}

/**
 * @param {string} projectFolder
 */
function addGitignoreEntries(projectFolder) {
  const gitignorePath = path.join(projectFolder, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const missingEntries = GITIGNORE_ENTRIES.filter((entry) => !existing.includes(entry));

  if (missingEntries.length === 0) return;

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  const addition = `${separator}${existing.length > 0 ? '\n' : ''}# specmatic\n${missingEntries.join('\n')}\n`;

  fs.writeFileSync(gitignorePath, existing + addition);
}

module.exports = { setupSpecmatic };
