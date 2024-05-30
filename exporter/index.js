const fs = require("fs");
const chalk = require("chalk");

const defaultHeader = `
Lista com todos os atalhos:
\`\`\`
%s
\`\`\`
`;

function start() {
	console.log(chalk.yellow("Iniciando exportação..."));
	fs.readFile("lua.json", (err, data) => {
		if (err) throw err;
		fs.unlink("export.txt", function (err2) {
			let count = 0;
			let snippets = JSON.parse(data);
			let finalResult = "";
			for (let snippetIndex in snippets) {
				const snippet = snippets[snippetIndex];
				finalResult += `${finalResult !== "" ? "\n" : ""}${snippet.prefix} - ${snippet.description}`;
				count++;
			}
			console.log(chalk.yellow(`${count} snippets lidos...`));

			exportToFile(finalResult);
		});
	});
}

function exportToFile(data) {
	fs.writeFileSync("export.txt", defaultHeader.replace("%s", data));
	console.log(chalk.green("Exportação concluída com sucesso!"));
}

start();
