/**
 * @rowanmanning/resave module
 * @module @rowanmanning/resave
 */
'use strict';

const fs = require('fs');
const mime = require('mime');
const path = require('path');
const url = require('url');

/**
 * Create a Resave middleware generator.
 *
 * @access public
 * @param {Function} createBundle
 *     An function used to generate a bundle.
 * @returns {ResaveMiddlewareGenerator}
 *     Returns a middleware generator.
 */
module.exports = function resave(createBundle) {
	return options => middleware.bind(null, createBundle, applyDefaultOptions(options));
};

/**
 * A Resave middleware generator function.
 * @callback ResaveMiddlewareGenerator
 * @param {Object} [options={}]
 *     An options object used to configure the middleware.
 * @param {String} [options.basePath='<CWD>']
 *     The directory to look for bundle files in. Prepended to bundle paths.
 *     Defaults to `process.cwd()`.
 * @param {Object.<String,String>} [options.bundles={}]
 *     A map of bundle URLs and source paths, where each key is the URL path that the bundle
 *     is served on, and each value is the location of the source file for that bundle.
 *     The source paths are relative to the `basePath` option.
 * @param {Object} [options.log=console]
 *     An object with log methods.
 * @param {Function} [options.log.info]
 *     A function used to log information.
 * @param {Function} [options.log.error]
 *     A function used to log errors.
 * @param {String} [options.savePath='<CWD>']
 *     The directory to save bundled files to. This is optional, but is recommended in production
 *     environments. This should point to a directory which is also served by your application.
 *     Defaults to `null`.
 * @returns {ExpressMiddleware}
 *     Returns an Express middleware function.
 */

/**
 * A middleware function.
 * @callback ExpressMiddleware
 * @param {Object} request
 *     An Express Request object.
 * @param {Object} response
 *     An Express Response object.
 * @param {ExpressMiddlewareCallback} next
 *     A callback function.
 * @returns {undefined}
 *     Returns nothing.
 */

/**
 * A callback function.
 * @callback ExpressMiddlewareCallback
 * @param {Error} error
 *     An HTTP error.
 * @returns {undefined}
 *     Returns nothing.
 */

/**
 * Default options to be used in middleware functions.
 *
 * @access private
 * @type {Object}
 */
module.exports.defaultOptions = {
	basePath: process.cwd(),
	bundles: {},
	log: {
		error: noop,
		info: noop
	},
	savePath: null
};

/**
 * An empty functon to use as default log functions.
 *
 * @access private
 * @returns {undefined}
 *     Returns nothing.
 */
/* istanbul ignore next */
// eslint-disable-next-line no-empty-function
function noop() {}

/**
 * Actual resave middleware
 *
 * @access private
 * @param {Function} createBundle
 *     An function used to generate a bundle.
 * @param {Object} options
 *     Options used to configure the middleware.
 * @param {Object} request
 *     An Express Request object.
 * @param {Object} response
 *     An Express Response object.
 * @param {ExpressMiddlewareCallback} next
 *     A callback function.
 * @returns {undefined}
 *     Returns nothing.
 */
function middleware(createBundle, options, request, response, next) {
	const requestPath = url.parse(request.url).pathname;
	let bundlePath = options.bundles[requestPath];
	if (!bundlePath) {
		return next();
	}
	bundlePath = path.join(options.basePath, bundlePath);
	createBundle(bundlePath, options, (createBundleError, content) => {
		if (createBundleError) {
			options.log.error(
				`Bundle "${requestPath}" failed to compile: ${createBundleError.stack}`
			);
			return next(createBundleError);
		}
		options.log.info(`Bundle "${requestPath}" compiled`);
		if (!options.savePath) {
			options.log.info(`Bundle "${requestPath}" served`);
			return serveBundle(response, requestPath, content);
		}
		const savePath = path.join(options.savePath, requestPath);
		fs.writeFile(savePath, content, writeFileError => {
			if (writeFileError) {
				options.log.error(
					`Bundle "${requestPath}" failed to save: ${writeFileError.stack}`
				);
				return next(writeFileError);
			}
			options.log.info(`Bundle "${requestPath}" saved`);
			options.log.info(`Bundle "${requestPath}" served`);
			serveBundle(response, requestPath, content);
		});
	});
}

/**
 * Serve a bundle's content.
 *
 * @access private
 * @param {Object} response
 *     An Express Response object.
 * @param {String} requestPath
 *     The path that was originally requested.
 * @param {String} content
 *     The content to serve.
 * @returns {undefined}
 *     Returns nothing.
 */
function serveBundle(response, requestPath, content) {
	response.writeHead(200, {
		'Content-Type': mime.getType(requestPath)
	});
	response.end(content);
}

/**
 * Apply default values to a set of user-provided options.
 * Used internally by {@link ResaveMiddlewareGenerator}.
 *
 * @access private
 * @param {Object} [userOptions={}]
 *     Options to add on top of the defaults. See {@link ResaveMiddlewareGenerator}.
 * @returns {Object}
 *     Returns the defaulted options.
 */
function applyDefaultOptions(userOptions) {
	return Object.assign({}, module.exports.defaultOptions, userOptions);
}
