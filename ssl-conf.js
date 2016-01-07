var fs = require('fs');

module.exports = {
	key: fs.readFileSync('/etc/apache2/https/home.hotblocks.nl.key'),
	cert: fs.readFileSync('/etc/apache2/https/home.hotblocks.nl-bundle.crt'),
};
