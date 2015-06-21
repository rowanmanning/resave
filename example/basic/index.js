'use strict';

var connect = require('connect');
var fs = require('fs');
var resave = require('../..');
var serveStatic = require('serve-static');

// Remove the existing example.txt if there is one (just for the example!)
try {
    fs.unlinkSync(__dirname + '/public/example.txt');
} catch (error) {}

// Create a resave middleware for replacing words in the source files
var replaceWords = resave(function (bundlePath, options, done) {

    // Load the bundle
    fs.readFile(bundlePath, 'utf-8', function (error, content) {

        // If the file read fails, callback with an error
        if (error) {
            return done(error);
        }

        // Replace words in the content
        Object.keys(options.words).forEach(function (word) {
            var replace = options.words[word];
            content = content.replace(word, replace);
        });

        // Callback with the replaced content
        done(null, content);

    });

});

// Create a connect application
var app = connect();

// Use the serve-static middleware. This will serve the created
// file after the first compile
app.use(serveStatic(__dirname + '/public'));

// Use the middleware
app.use(replaceWords({
    basePath: __dirname + '/source',
    bundles: {
        '/example.txt': 'example.txt'
    },
    log: {
        error: console.log.bind(console),
        info: console.log.bind(console)
    },
    savePath: __dirname + '/public',
    words: {
        hello: 'ohai',
        world: 'planet'
    }
}));

// Use a dummy error handler
app.use(function (error, request, response, next) {
    // jshint unused: false
    response.writeHead(500);
    response.end('500 Server Error:\n\n' + error.stack);
});

// Listen on a port
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('Application running on port %s', port);
    console.log('Visit http://localhost:%s/ in your browser', port);
});
