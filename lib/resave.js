'use strict';

const extend = require('node.extend');
const fs = require('fs');
const mime = require('mime');
const path = require('path');
const url = require('url');

module.exports = resave;
module.exports.defaults = {
	basePath: process.cwd(),
	bundles: {},
	log: {
		error: noop,
		info: noop
	},
	savePath: null
};

function resave(createBundle) {
	return options => middleware.bind(null, createBundle, defaultOptions(options));
}

function middleware(createBundle, options, request, response, next) {
	const requestPath = url.parse(request.url).pathname;
	let bundlePath = options.bundles[requestPath];
	if (!bundlePath) {
		return next();
	}
	bundlePath = path.join(options.basePath, bundlePath);
	createBundle(bundlePath, options, (error, content) => {
		if (error) {
			options.log.error(`Bundle "${requestPath}" failed to compile: ${error.stack}`);
			return next(error);
		}
		options.log.info(`Bundle "${requestPath}" compiled`);
		if (!options.savePath) {
			options.log.info(`Bundle "${requestPath}" served`);
			return serveBundle(response, requestPath, content);
		}
		const savePath = path.join(options.savePath, requestPath);
		fs.writeFile(savePath, content, error => {
			if (error) {
				options.log.error(`Bundle "${requestPath}" failed to save: ${error.stack}`);
				return next(error);
			}
			options.log.info(`Bundle "${requestPath}" saved`);
			options.log.info(`Bundle "${requestPath}" served`);
			serveBundle(response, requestPath, content);
		});
	});
}

function serveBundle(response, requestPath, content) {
	response.writeHead(200, {
		'Content-Type': mime.getType(requestPath)
	});
	response.end(content);
}

function defaultOptions(options) {
	return extend(true, {}, module.exports.defaults, options);
}

/* istanbul ignore next */
function noop() {}
