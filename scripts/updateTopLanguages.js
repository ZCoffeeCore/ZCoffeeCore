const fs = require('fs');
const axios = require('axios');

const username = 'ZCoffeeCore'; // <- Cambia esto a tu usuario de GitHub

async function main() {
  try {
    // Obtener repositorios del usuario
    const repos = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`);
    const langCount = {};

    // Contar lenguajes por repositorio
    repos.data.forEach(repo => {
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      }
    });

    // Ordenar por cantidad y tomar top 5
    const topLangs = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang.toLowerCase());

    // Generar URL de skillicons
    const iconUrl = `https://skillicons.dev/icons?i=${topLangs.join(',')}&theme=dark`;

    // Leer README y reemplazar sección de Tech Stack
    let readme = fs.readFileSync('README.md', 'utf-8');
    readme = readme.replace(
      /(<!--LANGUAGES_START-->).*(<!--LANGUAGES_END-->)/s,
      `$1\n<p align="center"><img src="${iconUrl}" /></p>\n$2`
    );

    fs.writeFileSync('README.md', readme);
    console.log('README actualizado con los top lenguajes!');
  } catch (err) {
    console.error(err);
  }
}

main();
