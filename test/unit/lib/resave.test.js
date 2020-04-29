'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/resave', () => {
	let fs;
	let mime;
	let resave;

	beforeEach(() => {

		fs = require('../mock/node/fs');
		mockery.registerMock('fs', fs);

		mime = require('../mock/npm/mime');
		mockery.registerMock('mime', mime);

		resave = require('../../../lib/resave');

	});

	it('is a function', () => {
		assert.isFunction(resave);
	});

	it('has a `defaultOptions` property', () => {
		assert.isObject(resave.defaultOptions);
	});

	describe('.defaultOptions', () => {
		let defaultOptions;

		beforeEach(() => {
			defaultOptions = resave.defaultOptions;
		});

		it('has a `basePath` property', () => {
			assert.strictEqual(defaultOptions.basePath, process.cwd());
		});

		it('has a `bundles` property', () => {
			assert.isObject(defaultOptions.bundles);
		});

		it('has a `log` property', () => {
			assert.isObject(defaultOptions.log);
		});

		it('has a `log.error` method', () => {
			assert.isFunction(defaultOptions.log.error);
		});

		it('has a `log.info` method', () => {
			assert.isFunction(defaultOptions.log.info);
		});

		it('has a `savePath` property', () => {
			assert.isNull(defaultOptions.savePath);
		});

	});

	it('returns a function', () => {
		const resaver = resave();
		assert.isFunction(resaver);
	});

	describe('returned (resaver)', () => {
		let content;
		let createBundle;
		let resaver;

		beforeEach(() => {
			content = 'content';
			createBundle = sinon.stub();
			resaver = resave(createBundle);
		});

		it('returns a function', () => {
			assert.isFunction(resaver());
		});

		it('defaults the options', () => {
			const options = {
				isUserOptions: true
			};
			const defaultedOptions = {
				isDefaultOptions: true
			};
			sinon.stub(Object, 'assign').returns(defaultedOptions);
			resaver(options);
			assert.calledOnce(Object.assign);
			assert.isObject(Object.assign.firstCall.args[0]);
			assert.strictEqual(Object.assign.firstCall.args[1], resave.defaultOptions);
			assert.strictEqual(Object.assign.firstCall.args[2], options);
			Object.assign.restore();
		});

		describe('returned (middleware)', () => {
			let middleware;
			let next;
			let options;
			let request;
			let response;

			beforeEach(() => {
				options = {
					basePath: '/base/path',
					bundles: {
						'/foo.css': '/source/foo.scss'
					},
					log: {
						error: sinon.spy(),
						info: sinon.spy()
					},
					savePath: null
				};
				mime.getType.withArgs('/foo.css').returns('text/css');
				request = {};
				response = {
					writeHead: sinon.stub(),
					end: sinon.stub()
				};
				next = sinon.spy();
			});

			describe('when the request URL matches a bundle URL', () => {

				beforeEach(() => {
					request.url = '/foo.css?bar=baz';
					middleware = resaver(options);
					middleware(request, response, next);
				});

				it('calls `createBundle`', () => {
					assert.calledOnce(createBundle);
					assert.calledWith(createBundle, '/base/path/source/foo.scss', options);
					assert.isFunction(createBundle.firstCall.args[2]);
				});

				describe('and bundling is successful', () => {

					beforeEach(() => {
						createBundle.yields(null, content);
						middleware = resaver(options);
						middleware(request, response, next);
					});

					it('logs that the bundle was successful', () => {
						assert.calledWith(options.log.info, 'Bundle "/foo.css" compiled');
					});

					describe('and `options.savePath` is set', () => {

						beforeEach(() => {
							response.writeHead.reset();
							response.end.reset();
							options.savePath = '/save/path';
							middleware = resaver(options);
						});

						describe('and saving is successful', () => {

							beforeEach(() => {
								fs.writeFile.withArgs('/save/path/foo.css', content).yields(null);
								middleware(request, response, next);
							});

							it('saves the bundle result to the file system', () => {
								assert.calledOnce(fs.writeFile);
								assert.calledWith(fs.writeFile, '/save/path/foo.css', content);
							});

							it('logs that the save was successful', () => {
								assert.calledWith(options.log.info, 'Bundle "/foo.css" saved');
							});

							it('responds with the bundle result', () => {
								assert.calledOnce(response.writeHead);
								assert.calledWith(response.writeHead, 200);
								assert.deepEqual(response.writeHead.firstCall.args[1], {
									'Content-Type': 'text/css'
								});
								assert.calledOnce(response.end);
								assert.calledWith(response.end, content);
							});

							it('logs that the bundle was served', () => {
								assert.calledWith(options.log.info, 'Bundle "/foo.css" served');
							});

						});

						describe('and saving is unsuccessful', () => {
							let error;

							beforeEach(() => {
								error = new Error('...');
								fs.writeFile.withArgs('/save/path/foo.css', content).yields(error);
								middleware(request, response, next);
							});

							it('does not respond', () => {
								assert.notCalled(response.writeHead);
								assert.notCalled(response.end);
							});

							it('logs that the save was unsuccessful', () => {
								assert.calledWith(options.log.error, `Bundle "/foo.css" failed to save: ${error.stack}`);
							});

							it('calls `next` with the file system error', () => {
								assert.calledOnce(next);
								assert.calledWith(next, error);
							});

						});

					});

					describe('and `options.savePath` is `null`', () => {

						beforeEach(() => {
							response.writeHead.reset();
							response.end.reset();
							request.url = '/foo.css?bar=baz';
							middleware = resaver(options);
							middleware(request, response, next);
						});

						it('does not save the bundle result to the file system', () => {
							assert.notCalled(fs.writeFile);
						});

						it('responds with the bundle result', () => {
							assert.calledOnce(response.writeHead);
							assert.calledWith(response.writeHead, 200);
							assert.deepEqual(response.writeHead.firstCall.args[1], {
								'Content-Type': 'text/css'
							});
							assert.calledOnce(response.end);
							assert.calledWith(response.end, content);
						});

						it('logs that the bundle was served', () => {
							assert.calledWith(options.log.info, 'Bundle "/foo.css" served');
						});

					});

				});

				describe('and bundling is unsuccessful', () => {
					let error;

					beforeEach(() => {
						error = new Error('...');
						createBundle.yields(error);
						middleware(request, response, next);
					});

					it('does not respond', () => {
						assert.notCalled(response.writeHead);
						assert.notCalled(response.end);
					});

					it('logs that the bundle was unsuccessful', () => {
						assert.calledWith(options.log.error, `Bundle "/foo.css" failed to compile: ${error.stack}`);
					});

					it('calls `next` with the bundle error', () => {
						assert.calledOnce(next);
						assert.calledWith(next, error);
					});

				});

			});

			describe('when the request URL does not match a bundle URL', () => {

				beforeEach(() => {
					request.url = '/bar.css';
					middleware = resaver(options);
					middleware(request, response, next);
				});

				it('does not call `createBundle`', () => {
					assert.notCalled(createBundle);
				});

				it('calls `next` with no error', () => {
					assert.calledOnce(next);
					assert.isUndefined(next.firstCall.args[0]);
				});

			});

		});

	});

});
