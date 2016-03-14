'use strict';

const connect = require('connect');
const fs = require('fs');
const resave = require('../..');
const serveStatic = require('serve-static');

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

// Create a connect application
const app = connect();

// Use the serve-static middleware. This will serve the created
// file after the first compile
app.use(serveStatic(`${__dirname}/public`));

// Use the middleware
app.use(replaceWords({
    basePath: `${__dirname}/source`,
    bundles: {
        '/example.txt': 'example.txt'
    },
    log: {
        error: console.log.bind(console),
        info: console.log.bind(console)
    },
    savePath: `${__dirname}/public`,
    words: {
        hello: 'ohai',
        world: 'planet'
    }
}));

// Use a dummy error handler
app.use((error, request, response, next) => {
    // jshint unused: false
    response.writeHead(500);
    response.end(`500 Server Error:\n\n${error.stack}`);
});

// Listen on a port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('Application running on port %s', port);
    console.log('Visit http://localhost:%s/ in your browser', port);
});
