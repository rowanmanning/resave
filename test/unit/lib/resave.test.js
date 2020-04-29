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

	describe('resave(createBundleFunction)', () => {
		let createBundleFunction;
		let resaver;

		beforeEach(() => {
			createBundleFunction = sinon.stub().resolves('mock-bundle-content');
			resaver = resave(createBundleFunction);
		});

		it('returns a function (resaver)', () => {
			assert.isFunction(resaver);
		});

		describe('resaver(options)', () => {
			let defaultedOptions;
			let middleware;
			let options;

			beforeEach(() => {
				options = {
					isUserOptions: true
				};
				defaultedOptions = {
					isDefaultOptions: true,
					basePath: '/base/path',
					bundles: {
						'/mock-bundle.css': '/source/mock-bundle.scss'
					},
					log: {
						error: sinon.spy(),
						info: sinon.spy()
					},
					savePath: null
				};
				sinon.stub(Object, 'assign').returns(defaultedOptions);
				middleware = resaver(options);
			});

			afterEach(() => {
				Object.assign.restore();
			});

			it('defaults the options', () => {
				assert.calledOnce(Object.assign);
				assert.isObject(Object.assign.firstCall.args[0]);
				assert.strictEqual(Object.assign.firstCall.args[1], resave.defaultOptions);
				assert.strictEqual(Object.assign.firstCall.args[2], options);
			});

			it('returns a function (middleware)', () => {
				assert.isFunction(middleware);
			});

			describe('middleware(request, response, next)', () => {
				let caughtError;
				let next;
				let request;
				let response;

				beforeEach(() => {
					mime.getType.withArgs('/mock-bundle.css').returns('text/css');
					request = {};
					response = {
						set: sinon.stub(),
						send: sinon.stub()
					};
					next = sinon.spy();
				});

				describe('when the request URL matches a bundle URL', () => {

					beforeEach(async () => {
						request.path = '/mock-bundle.css';
						await middleware(request, response, next);
					});

					it('calls `createBundleFunction` with the bundle path and defaulted options', () => {
						assert.calledOnce(createBundleFunction);
						assert.calledWithExactly(createBundleFunction, '/base/path/source/mock-bundle.scss', defaultedOptions);
					});

					describe('and bundling is successful', () => {

						describe('and `options.savePath` is set', () => {

							beforeEach(() => {
								defaultedOptions.log.info.resetHistory();
								defaultedOptions.log.error.resetHistory();
								response.set.resetHistory();
								response.send.resetHistory();
								defaultedOptions.savePath = '/save/path';
							});

							describe('and saving is successful', () => {

								beforeEach(async () => {
									fs.promises.writeFile.resolves();
									await middleware(request, response, next);
								});

								it('saves the bundle result to the file system', () => {
									assert.calledOnce(fs.promises.writeFile);
									assert.calledWith(fs.promises.writeFile, '/save/path/mock-bundle.css', 'mock-bundle-content');
								});

								it('logs that the save was successful', () => {
									assert.calledWith(defaultedOptions.log.info, 'Bundle "/mock-bundle.css" saved');
								});

								it('responds with the bundle result', () => {
									assert.calledOnce(response.set);
									assert.calledWithExactly(response.set, 'Content-Type', 'text/css');
									assert.calledOnce(response.send);
									assert.calledWithExactly(response.send, 'mock-bundle-content');
								});

								it('logs that the bundle was served', () => {
									assert.calledWith(defaultedOptions.log.info, 'Bundle "/mock-bundle.css" served');
								});

								it('does not call `next`', () => {
									assert.notCalled(next);
								});

							});

							describe('and saving is unsuccessful', () => {
								let saveError;

								beforeEach(done => {
									saveError = new Error('mock save error');
									fs.promises.writeFile.rejects(saveError);
									middleware(request, response, error => {
										caughtError = error;
										done();
									});
								});

								it('does not respond', () => {
									assert.notCalled(response.set);
									assert.notCalled(response.send);
								});

								it('logs that the save was unsuccessful', () => {
									assert.calledWith(defaultedOptions.log.error, `Bundle "/mock-bundle.css" failed to save: ${saveError.stack}`);
								});

								it('calls `next` with the file system error', () => {
									assert.strictEqual(caughtError, saveError);
								});

							});

						});

						describe('and `options.savePath` is `null`', () => {

							beforeEach(async () => {
								defaultedOptions.log.info.resetHistory();
								defaultedOptions.log.error.resetHistory();
								response.set.resetHistory();
								response.send.resetHistory();
								defaultedOptions.savePath = null;
								await middleware(request, response, next);
							});

							it('does not save the bundle result to the file system', () => {
								assert.notCalled(fs.promises.writeFile);
							});

							it('responds with the bundle result', () => {
								assert.calledOnce(response.set);
								assert.calledWithExactly(response.set, 'Content-Type', 'text/css');
								assert.calledOnce(response.send);
								assert.calledWithExactly(response.send, 'mock-bundle-content');
							});

							it('logs that the bundle was served', () => {
								assert.calledWith(defaultedOptions.log.info, 'Bundle "/mock-bundle.css" served');
							});

							it('does not call `next`', () => {
								assert.notCalled(next);
							});

						});

					});

					describe('and bundling is unsuccessful', () => {
						let createBundleError;

						beforeEach(done => {
							defaultedOptions.log.info.resetHistory();
							defaultedOptions.log.error.resetHistory();
							response.set.resetHistory();
							response.send.resetHistory();
							createBundleError = new Error('mock create bundle error');
							createBundleFunction.rejects(createBundleError);
							middleware(request, response, error => {
								caughtError = error;
								done();
							});
						});

						it('does not respond', () => {
							assert.notCalled(response.set);
							assert.notCalled(response.send);
						});

						it('logs that the bundle was unsuccessful', () => {
							assert.calledWith(defaultedOptions.log.error, `Bundle "/mock-bundle.css" failed to compile: ${createBundleError.stack}`);
						});

						it('calls `next` with the bundle error', () => {
							assert.strictEqual(caughtError, createBundleError);
						});

					});

				});

				describe('when the request URL does not match a bundle URL', () => {
					let nextArguments;

					beforeEach(done => {
						request.path = '/mock-not-a-bundle.css';
						middleware(request, response, (...args) => {
							nextArguments = args;
							done();
						});
					});

					it('does not call `createBundleFunction`', () => {
						assert.notCalled(createBundleFunction);
					});

					it('calls `next` with no arguments', () => {
						assert.lengthEquals(nextArguments.length);
					});

				});

			});

		});

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

});
