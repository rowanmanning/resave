'use strict';

var extend = require('node.extend');
var fs = require('fs');
var mime = require('mime');
var path = require('path');
var url = require('url');

module.exports = resave;
module.exports.defaults = {
    basePath: process.cwd(),
    bundles: {},
    log: {
        error: /* istanbul ignore next */ function () {},
        info: /* istanbul ignore next */ function () {}
    },
    savePath: null
};

function resave (createBundle) {
    return function (options) {
        return middleware.bind(null, createBundle, defaultOptions(options));
    };
}

function middleware (createBundle, options, request, response, next) {
    var requestPath = url.parse(request.url).pathname;
    var bundlePath = options.bundles[requestPath];
    if (!bundlePath) {
        return next();
    }
    bundlePath = path.join(options.basePath, bundlePath);
    createBundle(bundlePath, options, function (error, content) {
        if (error) {
            options.log.error('Bundle "' + requestPath + '" failed to compile: ' + error.stack);
            return next(error);
        }
        options.log.info('Bundle "' + requestPath + '" compiled');
        if (!options.savePath) {
            options.log.info('Bundle "' + requestPath + '" served');
            return serveBundle(response, requestPath, content);
        }
        var savePath = path.join(options.savePath, requestPath);
        fs.writeFile(savePath, content, function (error) {
            if (error) {
                options.log.error('Bundle "' + requestPath + '" failed to save: ' + error.stack);
                return next(error);
            }
            options.log.info('Bundle "' + requestPath + '" saved');
            options.log.info('Bundle "' + requestPath + '" served');
            serveBundle(response, requestPath, content);
        });
    });
}

function serveBundle (response, requestPath, content) {
    response.writeHead(200, {
        'Content-Type': mime.lookup(requestPath)
    });
    response.end(content);
}

function defaultOptions (options) {
    options = extend(true, {}, module.exports.defaults, options);
    return options;
}
