const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
	// Configura o cache do Puppeteer para ficar DENTRO do projeto.
	// Isso garante que o Render encontre o Chrome instalado.
	cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
