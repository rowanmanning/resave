
Resave
======

A middleware generator for compiling and saving static resources. Use with [Connect][connect] or [Express][express] and [static middleware][serve-static]. Resave is a low-level middleware generator, here are some derivative projects:

  - [Resave Browserify][resave-browserify] - A middleware for compiling and saving Browserify bundles

[![NPM version][shield-npm]][info-npm]
[![Node.js version support][shield-node]][info-node]
[![Build status][shield-build]][info-build]
[![Dependencies][shield-dependencies]][info-dependencies]
[![MIT licensed][shield-license]][info-license]

```js
var connect = require('connect');
var resave = require('resave');
var serveStatic = require('serve-static');

var app = connect();

var resaver = resave(function (bundlePath, options, done) {
    // ... do something with the bundle path and options ...
    done(null, content);
})

app.use(serveStatic('./public'));
app.use(resaver({}));

app.listen(3000);
```


Table Of Contents
-----------------

- [Install](#install)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Middleware Options](#middleware-options)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)


Install
-------

Install Resave with [npm][npm]:

```sh
npm install resave
```


Getting Started
---------------

Require in Resave:

```js
var resave = require('resave');
```

Create a resaver, this should be a function which accepts a file path, some options, and a callback. The following resaver will load the bundle file, replace words inside it based on some options, and then callback with the result:

```js
var replaceWords = resave(function (bundlePath, options, done) {
    fs.readFile(bundlePath, 'utf-8', function (error, content) {
        if (error) {
            return done(error);
        }
        Object.keys(options.words).forEach(function (word) {
            var replace = options.words[word];
            content = content.replace(word, replace);
        });
        done(null, content);
    });
});
```

Now you can use the created middleware to serve up files:

```js
var connect = require('connect');

var app = connect();

app.use(replaceWords({
    bundles: {
        '/example.txt': 'source/example.txt'
    },
    words: {
        'hello': 'ohai',
        'world': 'planet'
    }
}));
```

In the example above, requests to `/example.txt` will load the file `/source/example.txt`, replace the configured words inside it, and serve it up.

This isn't great in production enviroments, your resaver function could be quite slow. In these cases you can save the output to a file which will get served by another middleware:

```js
var connect = require('connect');
var serveStatic = require('serve-static');

var app = connect();

app.use(serveStatic('public'));

app.use(replaceWords({
    bundles: {
        '/example.txt': 'source/example.txt'
    },
    savePath: 'public'
    words: {
        'hello': 'ohai',
        'world': 'planet'
    }
}));
```

In the example above the first time `/example.txt` is requested it will get compiled and saved into `public/example.txt`. On the next request, the `serve-static` middleware will find the created file and serve it up with proper caching etc.


Usage
-----

Create a resaver with a passed in `createBundle` function:

```js
var renderer = resave(function () {});
```

The `createBundle` function should accept three arguments:

  - `bundlePath (string)`: The path to a requested bundle
  - `options (object)`: The options object passed into the middleware
  - `done (function)`: A callback to use when the bundling is complete

### Middleware

The middleware functions returned by a `resave` call can be used with Connect, Express, or anothr middleware library. They must be called with an [options object](#middleware-options):

```js
app.use(renderer({
    // options go here
}));
```


Middleware Options
------------------

As well as the core options, your Resave middleware can use any other options that you define. You should document your own options if you build libraries with Resave.

#### `basePath` (string)

The directory to look for bundle files in. Defaults to `process.cwd()`.

#### `bundles` (object)

A map of bundle URLs and source paths. The source paths are relative to the `basePath` option. In the following example requests to `/foo.css` will load, compile and serve `source/foo.scss`:

```js
app.use(resaver({
    basePath: 'source'
    bundles: {
        '/foo.css': 'foo.scss'
    }
}));
```

#### `log` (object)

An object which implments the methods `error` and `info` which will be used to report errors and request information.

```js
app.use(resaver({
    log: console
}));
```

#### `savePath` (string)

The directory to save bundled files to. This is optional, but is recommended in production environments. This should point to a directory which is also served by your application. Defaults to `null`.

Example of saving bundles only in production:

```js
app.use(resaver({
    savePath: (process.env.NODE_ENV === 'production' ? './public' : null)
}));
```


Examples
--------

### Basic Example

A basic resave middleware which replaces words in a text file.

```
node example/basic
```


Contributing
------------

To contribute to Resave, clone this repo locally and commit your code on a separate branch.

Please write unit tests for your code, and check that everything works by running the following before opening a pull-request:

```sh
make lint test
```


License
-------

Resave is licensed under the [MIT][info-license] license.  
Copyright &copy; 2015, Rowan Manning



[connect]: https://github.com/senchalabs/connect
[express]: http://expressjs.com/
[npm]: https://npmjs.org/
[serve-static]: https://github.com/expressjs/serve-static

[resave-browserify]: https://github.com/rowanmanning/resave-browserify

[info-dependencies]: https://gemnasium.com/rowanmanning/resave
[info-license]: LICENSE
[info-node]: package.json
[info-npm]: https://www.npmjs.com/package/resave
[info-build]: https://travis-ci.org/rowanmanning/resave
[shield-dependencies]: https://img.shields.io/gemnasium/rowanmanning/resave.svg
[shield-license]: https://img.shields.io/badge/license-MIT-blue.svg
[shield-node]: https://img.shields.io/node/v/resave.svg?label=node.js+support
[shield-npm]: https://img.shields.io/npm/v/resave.svg
[shield-build]: https://img.shields.io/travis/rowanmanning/resave/master.svg
