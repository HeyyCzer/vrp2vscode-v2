const dotenv = require('dotenv');
dotenv.config();

const minimist = require('minimist');
const { directusAPI } = require('./utils/http.js');
const { globSync } = require('glob');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const args = minimist(process.argv.slice(2));

if (!args.extensions) {
	console.error('Please provide extensions to build');
	process.exit(1);
}

const extensionsToBuild = args.extensions.split(',');
const buildAll = extensionsToBuild.includes('all');

const conditions = {};
if (!buildAll) {
	conditions._or = extensionsToBuild.map(name => ({
		name: {
			_eq: name
		}
	}));
}

async function fetchExtensions() {
	const { data } = await directusAPI.get("/items/vrp2vscode_extensions", {
		params: {
			filter: buildAll ? undefined : conditions,
		}
	});

	return data.data;
}

// Copy 'packages' folder to 'dist'.
async function buildExtension(extension) {
	const spinner = ora({
		text: `Building ${extension.name}...`,
		prefixText: `[${extension.name}]`,
		prefixColor: 'blue',
	}).start();

	const packagesDir = path.join(__dirname, 'packages');
	const distDir = path.join(__dirname, 'dist');
	
	if (fs.existsSync(distDir)) {
		spinner.start("Cleaning dist directory...");
		fs.rmSync(distDir, { recursive: true });
		spinner.succeed("Cleaned dist directory");
	}
	fs.mkdirSync(distDir);
	
	const files = globSync("./packages/**", {
		dotRelative: true,
		nodir: true,
		dot: true,
	});
	
	for (const file of files) {
		spinner.start(`Copying ${file}...`);
		const dest = path.join(distDir, path.relative(packagesDir, file));
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(file, dest);
		spinner.succeed(`Copied ${file} to ${dest}`);
	}

	if (fs.existsSync(path.join(distDir, 'snippets'))) {
		spinner.start("Cleaning snippets directory...");
		fs.rmSync(path.join(distDir, 'snippets'), { recursive: true });
		spinner.succeed("Cleaned snippets directory");
	}
	fs.mkdirSync(path.join(distDir, 'snippets'), { recursive: true });
	
	const content = {};
	for (const snippet of extension.snippets) {
		spinner.start(`Fetching snippet ${snippet}...`);

		const { data } = await directusAPI.get(`/items/vrp2vscode_extensions_vrp2vscode_snippets/${snippet}`);
		if (!data.data) {
			continue;
		}

		const snippetId = data.data.vrp2vscode_snippets_id;
		const { data: snippetData } = await directusAPI.get(`/items/vrp2vscode_snippets/${snippetId}`);
		if (!snippetData.data) {
			continue;
		}

		let snippetContent = snippetData.data.content;
		let variableIndex = 1;
		for (const variable of snippetData.data.variables) {
			const variableName = variable.index;
			let variableValue = `\${${variableIndex}:${variable.default_value ?? variable.index}}`;
			snippetContent = snippetContent.replace(new RegExp(`{${variableName}}`, 'g'), variableValue);
			variableIndex++;
		}

		content[snippetData.data.summon_name] = {
			prefix: snippetData.data.summon_name,
			body: snippetContent.replace(/^(\s{4})/gm, "\t").replace(/\t/gm, "\t").split('\n'),
			description: snippetData.data.description,
		};

		spinner.succeed(`Fetched snippet ${snippet}`);
	}

	spinner.start("Writing snippets to file...");
	fs.writeFileSync(path.join(distDir, 'snippets/lua.json'), JSON.stringify(content, null, 4), 'utf8');
	spinner.succeed("Written snippets to file");

	spinner.start("Writing package.json...");
	let manifest = fs.readFileSync(path.join(distDir, 'package.model.json'), 'utf8');
	manifest = manifest.replace(/{name}/g, extension.marketplace_id);
	manifest = manifest.replace(/{display_name}/g, extension.display_name);
	manifest = manifest.replace(/{description}/g, extension.marketplace_description);
	manifest = manifest.replace(/{version}/g, extension.version);
	fs.writeFileSync(path.join(distDir, 'package.json'), manifest, 'utf8');
	spinner.succeed("Written package.json");

	spinner.start("Removing package.model.json...");
	fs.rmSync(path.join(distDir, 'package.model.json'), { recursive: true });
	spinner.succeed("Removed package.model.json");
}

(async () => {
	const generalSpinner = ora("Fetching extensions...").start();

	const extensions = await fetchExtensions();

	if (extensions.length <= 0) {
		generalSpinner.fail("No extensions found!");
		process.exit(1);
	}
	
	for (const extension of extensions) {
		generalSpinner.stop();
		buildExtension(extension);
		console.log();
	}
})();