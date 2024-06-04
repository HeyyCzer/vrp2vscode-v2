function parseVariables(content, variables) {
	let tempContent = content;
	for (const [name, value] of Object.entries(variables)) {
		tempContent = tempContent.replaceAll(`{${name}}`, value);
	}
	return tempContent;
}

module.exports = {
	parseVariables
};