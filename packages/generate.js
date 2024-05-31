const fs = require('fs');
const chalk = require('chalk');

const defaultHeader = `
{template}
\`\`\`
{snippets}
\`\`\`
`;

function start() {
	console.log(chalk.yellow("Iniciando exportação..."));
	fs.readFile('snippets/lua.json', (err, data) => {
		if (err) throw err;
		fs.unlink('export.txt', function (_) {
			let count = 0;
			let snippets = JSON.parse(data);
			let finalResult = "";
			for (let snippetIndex in snippets) {
				const snippet = snippets[snippetIndex];
				finalResult += `${finalResult !== "" ? "\n" : ""}${snippet.prefix} - ${snippet.description}`
				count++;
			}
			console.log(chalk.yellow(`${count} snippets lidos...`));

			exportToFile(finalResult);
		});
	});
}

function exportToFile(snippets) {
	fs.readFile('README-template.md', (err, data) => {
		if (err) throw err;

		let content = defaultHeader;
		content = content.replace("{template}", data);
		content = content.replace("{snippets}", snippets);

		fs.writeFileSync('README.md', content);
		console.log(chalk.green("Exportação concluída com sucesso!"));
	});
}

start();