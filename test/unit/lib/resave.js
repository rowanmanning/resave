// jshint maxstatements: false
// jscs:disable disallowMultipleVarDecl, maximumLineLength
'use strict';

var assert = require('proclaim');
var mockery = require('mockery');
var sinon = require('sinon');

describe('lib/resave', function () {
    var extend, fs, http, mime, resave;

    beforeEach(function () {

        extend = sinon.spy(require('node.extend'));
        mockery.registerMock('node.extend', extend);

        fs = require('../mock/fs');
        mockery.registerMock('fs', fs);

        http = require('../mock/http');

        mime = require('../mock/mime');
        mockery.registerMock('mime', mime);

        resave = require('../../../lib/resave');

    });

    it('should be a function', function () {
        assert.isFunction(resave);
    });

    it('should have a `defaults` property', function () {
        assert.isObject(resave.defaults);
    });

    describe('.defaults', function () {
        var defaults;

        beforeEach(function () {
            defaults = resave.defaults;
        });

        it('should have a `basePath` property', function () {
            assert.strictEqual(defaults.basePath, process.cwd());
        });

        it('should have a `bundles` property', function () {
            assert.isObject(defaults.bundles);
        });

        it('should have a `log` property', function () {
            assert.isObject(defaults.log);
        });

        it('should have a `log.error` method', function () {
            assert.isFunction(defaults.log.error);
        });

        it('should have a `log.info` method', function () {
            assert.isFunction(defaults.log.info);
        });

        it('should have a `savePath` property', function () {
            assert.isNull(defaults.savePath);
        });

    });

    it('should return a function', function () {
        var resaver = resave();
        assert.isFunction(resaver);
    });

    describe('returned function (resaver)', function () {
        var content, createBundle, resaver;

        beforeEach(function () {
            content = 'content';
            createBundle = sinon.stub();
            resaver = resave(createBundle);
        });

        it('should return a function', function () {
            assert.isFunction(resaver());
        });

        it('should default the options', function () {
            var options = {};
            resaver(options);
            assert.calledOnce(extend);
            assert.isTrue(extend.firstCall.args[0]);
            assert.isObject(extend.firstCall.args[1]);
            assert.strictEqual(extend.firstCall.args[2], resave.defaults);
            assert.strictEqual(extend.firstCall.args[3], options);
        });

        describe('returned function (middleware)', function () {
            var middleware, next, options, request, response;

            beforeEach(function () {
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
                mime.lookup.withArgs('/foo.css').returns('text/css');
                request = new http.ClientRequest();
                response = new http.ServerResponse();
                next = sinon.spy();
            });

            describe('when the request URL matches a bundle URL', function () {

                beforeEach(function () {
                    request.url = '/foo.css?bar=baz';
                    middleware = resaver(options);
                    middleware(request, response, next);
                });

                it('should call `createBundle`', function () {
                    assert.calledOnce(createBundle);
                    assert.calledWith(createBundle, '/base/path/source/foo.scss', options);
                    assert.isFunction(createBundle.firstCall.args[2]);
                });

                describe('and bundling is successful', function () {

                    beforeEach(function () {
                        createBundle.yields(null, content);
                        middleware = resaver(options);
                        middleware(request, response, next);
                    });

                    it('should log that the bundle was successful', function () {
                        assert.calledWith(options.log.info, 'Bundle "/foo.css" compiled');
                    });

                    describe('and `options.savePath` is set', function () {

                        beforeEach(function () {
                            response.writeHead.reset();
                            response.end.reset();
                            options.savePath = '/save/path';
                            middleware = resaver(options);
                        });

                        describe('and saving is successful', function () {

                            beforeEach(function () {
                                fs.writeFile.withArgs('/save/path/foo.css', content).yields(null);
                                middleware(request, response, next);
                            });

                            it('should save the bundle result to the file system', function () {
                                assert.calledOnce(fs.writeFile);
                                assert.calledWith(fs.writeFile, '/save/path/foo.css', content);
                            });

                            it('should log that the save was successful', function () {
                                assert.calledWith(options.log.info, 'Bundle "/foo.css" saved');
                            });

                            it('should respond with the bundle result', function () {
                                assert.calledOnce(response.writeHead);
                                assert.calledWith(response.writeHead, 200);
                                assert.deepEqual(response.writeHead.firstCall.args[1], {
                                    'Content-Type': 'text/css'
                                });
                                assert.calledOnce(response.end);
                                assert.calledWith(response.end, content);
                            });

                            it('should log that the bundle was served', function () {
                                assert.calledWith(options.log.info, 'Bundle "/foo.css" served');
                            });

                        });

                        describe('and saving is unsuccessful', function () {
                            var error;

                            beforeEach(function () {
                                error = new Error('...');
                                fs.writeFile.withArgs('/save/path/foo.css', content).yields(error);
                                middleware(request, response, next);
                            });

                            it('should not respond', function () {
                                assert.notCalled(response.writeHead);
                                assert.notCalled(response.end);
                            });

                            it('should log that the save was unsuccessful', function () {
                                assert.calledWith(options.log.error, 'Bundle "/foo.css" failed to save: ' + error.stack);
                            });

                            it('should call `next` with the file system error', function () {
                                assert.calledOnce(next);
                                assert.calledWith(next, error);
                            });

                        });

                    });

                    describe('and `options.savePath` is `null`', function () {

                        beforeEach(function () {
                            response.writeHead.reset();
                            response.end.reset();
                            request.url = '/foo.css?bar=baz';
                            middleware = resaver(options);
                            middleware(request, response, next);
                        });

                        it('should not save the bundle result to the file system', function () {
                            assert.notCalled(fs.writeFile);
                        });

                        it('should respond with the bundle result', function () {
                            assert.calledOnce(response.writeHead);
                            assert.calledWith(response.writeHead, 200);
                            assert.deepEqual(response.writeHead.firstCall.args[1], {
                                'Content-Type': 'text/css'
                            });
                            assert.calledOnce(response.end);
                            assert.calledWith(response.end, content);
                        });

                        it('should log that the bundle was served', function () {
                            assert.calledWith(options.log.info, 'Bundle "/foo.css" served');
                        });

                    });

                });

                describe('and bundling is unsuccessful', function () {
                    var error;

                    beforeEach(function () {
                        error = new Error('...');
                        createBundle.yields(error);
                        middleware(request, response, next);
                    });

                    it('should not respond', function () {
                        assert.notCalled(response.writeHead);
                        assert.notCalled(response.end);
                    });

                    it('should log that the bundle was unsuccessful', function () {
                        assert.calledWith(options.log.error, 'Bundle "/foo.css" failed to compile: ' + error.stack);
                    });

                    it('should call `next` with the bundle error', function () {
                        assert.calledOnce(next);
                        assert.calledWith(next, error);
                    });

                });

            });

            describe('when the request URL does not match a bundle URL', function () {

                beforeEach(function () {
                    request.url = '/bar.css';
                    middleware = resaver(options);
                    middleware(request, response, next);
                });

                it('should not call `createBundle`', function () {
                    assert.notCalled(createBundle);
                });

                it('should call `next` with no error', function () {
                    assert.calledOnce(next);
                    assert.isUndefined(next.firstCall.args[0]);
                });

            });

        });

    });

});
