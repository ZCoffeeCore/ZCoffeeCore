const fs = require('fs');
const axios = require('axios');

const username = 'ZCoffeeCore'; 
const topLimit = 5; 

async function main() {
  try {

    const reposRes = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`);
    const repos = reposRes.data;

    const langCount = {};

    for (const repo of repos) {
      const langsRes = await axios.get(`https://api.github.com/repos/${username}/${repo.name}/languages`);
      const langs = langsRes.data;
      for (const lang in langs) {
        langCount[lang] = (langCount[lang] || 0) + langs[lang];
      }
    }

    const topLangs = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topLimit)
      .map(([lang]) => lang.toLowerCase());

    const iconUrl = `https://skillicons.dev/icons?i=${topLangs.join(',')}&theme=dark`;

    let readme = fs.readFileSync('README.md', 'utf-8');
    readme = readme.replace(
      /(<!--LANGUAGES_START-->).*(<!--LANGUAGES_END-->)/s,
      `$1\n<p align="center"><img src="${iconUrl}" /></p>\n$2`
    );

    fs.writeFileSync('README.md', readme);
    console.log('README actualizado con los top lenguajes:', topLangs);
  } catch (err) {
    console.error('Error actualizando README:', err);
  }
}

main();
