
# Resave

A middleware generator for compiling and saving static resources. Use with [Express](http://expressjs.com/). Resave is a low-level middleware generator, here are some derivative projects:

  * [Resave Browserify](https://github.com/rowanmanning/resave-browserify) - A middleware for compiling and saving Browserify bundles
  * [Resave Sass](https://github.com/rowanmanning/resave-sass) - A middleware for compiling and saving Sass files

```js
const express = require('express');
const resave = require('resave');

const app = express();

const resaver = resave(async (bundlePath, options) => {
    // ... do something with the bundle path and options ...
    return 'some content';
})

app.use(express.static('public'));
app.use(resaver({}));

app.listen(3000);
```

## Table of Contents

  * [Requirements](#requirements)
  * [Usage](#usage)
  * [Contributing](#contributing)
  * [License](#license)


## Requirements

This library requires the following to run:

  * [Node.js](https://nodejs.org/) 12+


## Usage

Install with [npm](https://www.npmjs.com/):

```sh
npm install resave
```

### Getting Started

Load the library into your code with a `require` call:

```js
const resave = require('resave');
```

Create a resaver, this should be a function which accepts a file path and some options, and returns a `Promise`. Using async functions is the easiest way to do this. The following resaver will load the bundle file, replace words inside it based on some options, and then callback with the result:

```js
const replaceWords = resave(async (bundlePath, options) => {
    let content = await fs.promises.readFile(bundlePath, 'utf-8');
    Object.keys(options.words).forEach(word => {
        const replace = options.words[word];
        content = content.replace(word, replace);
    });
    return content;
});
```

Now you can use the created middleware to serve up files:

```js
const express = require('express');

const app = express();

app.use(replaceWords({
    bundles: {
        '/example.txt': 'source/example.txt'
    },
    words: {
        hello: 'ohai',
        world: 'planet'
    }
}));
```

In the example above, requests to `/example.txt` will load the file `/source/example.txt`, replace the configured words inside it, and serve it up.

This isn't great in production environments, your resaver function could be quite slow. In these cases you can save the output to a file which will get served by another middleware:

```js
const express = require('express');

const app = express();

app.use(express.static('public'));

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

In the example above the first time `/example.txt` is requested it will get compiled and saved into `public/example.txt`. On the next request, the `static` middleware will find the created file and serve it up with your configured caching etc.

### API

Create a resaver with a passed in `createBundle` function:

```js
const renderer = resave(async (bundlePath, options) => {
    // ...
});
```

The `createBundle` function should accept two arguments:

  - `bundlePath (string)`: The path to a requested bundle
  - `options (object)`: The options object passed into the middleware

It must return a `Promise` which resolves with a string representing the bundle contents.

The middleware functions returned by a `resave` call can be used with Express, and they must be called with an [options object](#middleware-options):

```js
app.use(renderer({
    // options go here
}));
```


## Middleware Options

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

An object which implements the methods `error` and `info` which will be used to report errors and request information.

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
    savePath: (process.env.NODE_ENV === 'production' ? 'public' : null)
}));
```


## Examples

### Basic Example

A basic resave middleware which replaces words in a text file.

```
node example/basic
```


## Contributing

To contribute to this library, clone this repo locally and commit your code on a separate branch. Please write unit tests for your code, and run the linter before opening a pull-request:

```sh
make test    # run all tests
make verify  # run all linters
```


## License

Licensed under the [MIT](LICENSE) license.<br/>
Copyright &copy; 2020, Rowan Manning
