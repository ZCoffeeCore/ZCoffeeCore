import fs from 'fs';
import axios from 'axios';

const username = 'ZCoffeeCore';
const topLimit = 10;
const token = process.env.GH_PAT; // Token desde GitHub Actions

const headers = { Authorization: `token ${token}` };

// Obtener repositorios (públicos y privados)
async function getRepos() {
  const res = await axios.get(`https://api.github.com/user/repos?per_page=100`, { headers });
  return res.data;
}

// Obtener lenguajes
async function getLanguages(repoName) {
  const res = await axios.get(`https://api.github.com/repos/${username}/${repoName}/languages`, { headers });
  return res.data;
}

// Obtener contenido de archivo base64
async function getFileContent(repoName, path) {
  try {
    const res = await axios.get(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, { headers });
    if (res.data && res.data.content) {
      return Buffer.from(res.data.content, 'base64').toString('utf-8');
    }
  } catch {
    return null;
  }
}

// Listar archivos recursivamente
async function listFiles(repoName, path = '') {
  try {
    const res = await axios.get(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, { headers });
    let files = [];
    for (const item of res.data) {
      if (item.type === 'file') {
        files.push(item.path);
      } else if (item.type === 'dir') {
        files = files.concat(await listFiles(repoName, item.path));
      }
    }
    return files;
  } catch {
    return [];
  }
}

// Parse package.json
function parsePackageJson(content) {
  try {
    const json = JSON.parse(content);
    return [...Object.keys(json.dependencies || {}), ...Object.keys(json.devDependencies || {})];
  } catch {
    return [];
  }
}

// Parse requirements.txt
function parseRequirementsTxt(content) {
  return content
    .split('\n')
    .map(line => line.trim().split(/[=<>]/)[0])
    .filter(Boolean);
}

// Detectar herramientas/APIs según archivos
function detectTools(files) {
  const tools = new Set();
  files.forEach(f => {
    const name = f.toLowerCase();
    if (name.includes('dockerfile')) tools.add('docker');
    if (name.includes('.github/workflows')) tools.add('githubactions');
    if (name.includes('firebase.json')) tools.add('firebase');
    if (name.includes('supabase')) tools.add('supabase');
    if (name.includes('terraform')) tools.add('aws');
    if (name.includes('azure')) tools.add('azure');
    if (name.includes('gcp')) tools.add('gcp');
  });
  return Array.from(tools);
}

async function main() {
  const repos = await getRepos();

  const langCount = {};
  const frameworksSet = new Set();
  const toolsSet = new Set();

  for (const repo of repos) {
    // Lenguajes
    const langs = await getLanguages(repo.name);
    for (const lang in langs) {
      langCount[lang] = (langCount[lang] || 0) + langs[lang];
    }

    // Archivos recursivos
    const files = await listFiles(repo.name);

    // Buscar package.json
    const pkgFile = files.find(f => f.toLowerCase().endsWith('package.json'));
    if (pkgFile) {
      const content = await getFileContent(repo.name, pkgFile);
      if (content) parsePackageJson(content).forEach(dep => frameworksSet.add(dep.toLowerCase()));
    }

    // Buscar requirements.txt
    const reqFile = files.find(f => f.toLowerCase().endsWith('requirements.txt'));
    if (reqFile) {
      const content = await getFileContent(repo.name, reqFile);
      if (content) parseRequirementsTxt(content).forEach(dep => frameworksSet.add(dep.toLowerCase()));
    }

    // Herramientas/APIs
    detectTools(files).forEach(tool => toolsSet.add(tool));
  }

  // Top lenguajes
  const topLangs = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLimit)
    .map(([lang]) => lang.toLowerCase());

  // Frameworks (solo top 5 para README, pero log muestra todos)
  const allFrameworks = Array.from(frameworksSet);
  const frameworks = allFrameworks.slice(0, topLimit);

  // Tools
  const tools = Array.from(toolsSet);

  // URLs de iconos
  const langIconUrl = `https://skillicons.dev/icons?i=${topLangs.join(',')}&theme=dark`;
  const frameworksIconUrl = `https://skillicons.dev/icons?i=${frameworks.join(',')}&theme=dark`;
  const toolsIconUrl = `https://skillicons.dev/icons?i=${tools.join(',')}&theme=dark`;

  // Actualizar README
  let readme = fs.readFileSync('README.md', 'utf-8');

  readme = readme.replace(
    /(<!--LANGUAGES_START-->).*(<!--LANGUAGES_END-->)/s,
    `$1\n<p align="center"><img src="${langIconUrl}" /></p>\n$2`
  );

  readme = readme.replace(
    /(<!--FRAMEWORKS_START-->).*(<!--FRAMEWORKS_END-->)/s,
    `$1\n<p align="center"><img src="${frameworksIconUrl}" /></p>\n$2`
  );

  readme = readme.replace(
    /(<!--TOOLS_START-->).*(<!--TOOLS_END-->)/s,
    `$1\n<p align="center"><img src="${toolsIconUrl}" /></p>\n$2`
  );

  fs.writeFileSync('README.md', readme);

  // Logs
  console.log('✅ README actualizado completamente');
  console.log(`📌 Lenguajes (Top ${topLimit}): ${topLangs.join(', ') || 'N/A'}`);
  console.log(`📌 Frameworks (Top ${topLimit}): ${frameworks.join(', ') || 'N/A'}`);
  console.log(`📦 Frameworks detectados (todos): ${allFrameworks.join(', ') || 'N/A'}`);
  console.log(`📌 Tools: ${tools.join(', ') || 'N/A'}`);
}

main();
