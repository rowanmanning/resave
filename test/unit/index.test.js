'use strict';

const assert = require('proclaim');

describe('index', () => {
	let index;
	let resave;

	beforeEach(() => {
		index = require('../../index');
		resave = require('../../lib/resave');
	});

	it('aliases `lib/resave`', () => {
		assert.strictEqual(index, resave);
	});

});
