'use strict';

const sinon = require('sinon');

module.exports = {
	promises: {
		writeFile: sinon.stub().resolves()
	}
};
