import fs from 'fs';
import fetch from 'node-fetch';

const username = 'ZCoffeeCore';
const readmePath = 'README.md';

async function getGitHubData() {
  const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

  const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
  const user = await userRes.json();

  const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });
  const repos = await reposRes.json();

  if (!Array.isArray(repos)) {
    console.error('Error: GitHub API no devolvió un array de repositorios', repos);
    return null;
  }

  let totalCommits = 0;
  let commitsByHour = { morning: 0, daytime: 0, evening: 0, night: 0 };

  for (const repo of repos) {
    const commitsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=100`, { headers });
    const commits = await commitsRes.json();
    if (!Array.isArray(commits)) continue;

    totalCommits += commits.length;

    commits.forEach(c => {
      const date = new Date(c.commit.author.date);
      const h = date.getUTCHours();
      if (h >= 6 && h < 12) commitsByHour.morning++;
      else if (h >= 12 && h < 18) commitsByHour.daytime++;
      else if (h >= 18 && h < 22) commitsByHour.evening++;
      else commitsByHour.night++;
    });
  }

  const maxHour = Object.keys(commitsByHour).reduce((a, b) => commitsByHour[a] > commitsByHour[b] ? a : b);
  const hourEmoji = { morning: '☀️', daytime: '🌆', evening: '🌃', night: '🦉' };

  return {
    totalCommits,
    publicRepos: user.public_repos || 0,
    privateRepos: user.total_private_repos || 0,
    storageUsed: repos.reduce((acc, r) => acc + (r.size || 0), 0),
    hourData: commitsByHour,
    mostActive: `${maxHour.charAt(0).toUpperCase() + maxHour.slice(1)} ${hourEmoji[maxHour]}`
  };
}

async function main() {
  const githubData = await getGitHubData();
  if (!githubData) return;

  const totalCommitsSafe = githubData.totalCommits || 1; 

  const detailsBlock = `
<details>
<summary>📊 Detailed GitHub & Code Time Stats</summary>

**🐱 My GitHub Data**
- ⏱ Total coding time: N/A
- 📄 Lines of Code: N/A
- 📦 GitHub Storage Used: ${githubData.storageUsed} kB
- 🏆 Contributions in 2025: ${githubData.totalCommits}
- 📜 Public Repositories: ${githubData.publicRepos}
- 🔑 Private Repositories: ${githubData.privateRepos}

**🌞 Time of Day Activity (most active: ${githubData.mostActive})**
| Time      | Commits | Percentage |
|-----------|--------|------------|
| Morning ☀️  | ${githubData.hourData.morning} | ${((githubData.hourData.morning / totalCommitsSafe) * 100).toFixed(2)}% |
| Daytime 🌆  | ${githubData.hourData.daytime} | ${((githubData.hourData.daytime / totalCommitsSafe) * 100).toFixed(2)}% |
| Evening 🌃  | ${githubData.hourData.evening} | ${((githubData.hourData.evening / totalCommitsSafe) * 100).toFixed(2)}% |
| Night 🦉   | ${githubData.hourData.night} | ${((githubData.hourData.night / totalCommitsSafe) * 100).toFixed(2)}% |

_Last Updated on ${new Date().toUTCString()}_
</details>
`;

  let readme = fs.readFileSync(readmePath, 'utf8');

  const startTag = '<details>\n<summary>📊 Detailed GitHub & Code Time Stats</summary>';
  const endTag = '</details>';
  const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`, 'm');

  if (regex.test(readme)) {
    readme = readme.replace(regex, detailsBlock);
  } else {
    readme += '\n' + detailsBlock;
  }

  fs.writeFileSync(readmePath, readme);
  console.log('README actualizado con stats de GitHub!');
}

main();
