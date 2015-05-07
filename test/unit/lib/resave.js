/* jshint maxstatements: false, maxlen: false */
/* global beforeEach, describe, it */
'use strict';

var assert = require('proclaim');

describe('lib/resave', function () {
    var resave;

    beforeEach(function () {
        resave = require('../../../lib/resave');
    });

    it('should be a function', function () {
        assert.isFunction(resave);
    });

});