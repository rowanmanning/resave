'use strict';

const express = require('express');
const fs = require('fs');
const resave = require('../..');

// Remove the existing example.txt if there is one (just for the example!)
try {
	fs.unlinkSync(`${__dirname}/public/example.txt`);
} catch (error) {}

// Create a resave middleware for replacing words in the source files
const replaceWords = resave((bundlePath, options, done) => {

	// Load the bundle
	fs.readFile(bundlePath, 'utf-8', (error, content) => {

		// If the file read fails, callback with an error
		if (error) {
			return done(error);
		}

		// Replace words in the content
		Object.keys(options.words).forEach(word => {
			const replace = options.words[word];
			content = content.replace(word, replace);
		});

		// Callback with the replaced content
		done(null, content);

	});

});

// Create an Express application
const app = express();

// Use the static middleware. This will serve the created
// file after the first compile
app.use(express.static(`${__dirname}/public`));

// Use the Resave middleware
app.use(replaceWords({
	basePath: `${__dirname}/source`,
	bundles: {
		'/example.txt': 'example.txt'
	},
	log: console,
	savePath: `${__dirname}/public`,
	words: {
		hello: 'ohai',
		world: 'planet'
	}
}));

// Listen on a port
const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log('Application running on port %s', port);
	console.log('Visit http://localhost:%s/ in your browser', port);
});
