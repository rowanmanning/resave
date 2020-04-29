/**
 * @rowanmanning/resave module
 * @module @rowanmanning/resave
 */
'use strict';

const mime = require('mime');
const path = require('path');
const {writeFile} = require('fs').promises;

/**
 * Create a Resave middleware generator.
 *
 * @access public
 * @param {CreateBundleFunction} createBundle
 *     An function used to generate a bundle.
 * @returns {ResaveMiddlewareGenerator}
 *     Returns a middleware generator.
 */
module.exports = function resave(createBundle) {
	return options => middleware.bind(null, createBundle, applyDefaultOptions(options));
};

/**
 * A Create Bundle function.
 * @callback CreateBundleFunctions
 * @param {Object} bundleDetails
 *     The information required to generate a bundle
 * @param {Object} bundleDetails.options
 *     An options object used to configure the bundle. See {@link ResaveMiddlewareGenerator}.
 * @param {String} bundleDetails.requestPath
 *     The request path that lead to this bundle being generated.
 * @param {String} bundleDetails.sourcePath
 *     The full path to the source file to create a bundle from.
 * @param {(String|null)} bundleDetails.savePath
 *     The full path where the file will be saved. Or `null` if no file will be saved.
 * @returns {String}
 *     Returns a string representation of the bundled content.
 */

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
 * @returns {Promise<undefined>}
 *     Returns a promise that resolves when the bundling is complete.
 */
async function middleware(createBundle, options, request, response, next) {
	try {

		// If the request path does not match one of our
		// bundle paths then we exit early
		const sourcePath = options.bundles[request.path];
		if (!sourcePath) {
			return next();
		}

		// Get the full save path and source paths
		const fullSourcePath = path.join(options.basePath, sourcePath);
		const fullSavePath = (options.savePath ? path.join(options.savePath, request.path) : null);

		// Get the full bundle path and create the bundle
		let bundleContent;
		try {
			bundleContent = await createBundle({
				options,
				requestPath: request.path,
				sourcePath: fullSourcePath,
				savePath: fullSavePath
			});
			options.log.info(`Bundle "${request.path}" compiled`);
		} catch (bundleError) {
			options.log.error(`Bundle "${request.path}" failed to compile: ${bundleError.stack}`);
			throw bundleError;
		}

		// If there's a save path, we save the bundle content to the file system
		if (fullSavePath) {
			try {
				await writeFile(fullSavePath, bundleContent);
				options.log.info(`Bundle "${request.path}" saved`);
			} catch (saveError) {
				options.log.error(`Bundle "${request.path}" failed to save: ${saveError.stack}`);
				throw saveError;
			}
		}

		// Serve the bundle
		options.log.info(`Bundle "${request.path}" served`);
		return serveBundle(response, request.path, bundleContent);

	} catch (error) {
		return next(error);
	}
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
	response.set('Content-Type', mime.getType(requestPath));
	response.send(content);
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
