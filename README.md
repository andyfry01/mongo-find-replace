# Mongo Find and Replace

## About

This is a handy little utility for searching through all of the fields in all of your MongoDB documents and updating the values of those fields.

Replacing something in a specific field in all documents is easy enough with MongoDB, but what if you have a lot of fields across multiple documents in your MongoDB database that have the same error? What if you don't even know which fields in your documents contain the error? What if you need to update multiple documents across multiple collections? 

And what kind of errors are we talking about? Some extra characters here, a frequently occurring misspelling, a wrong number? A `'true'` that's really supposed to be a `true`? A state abbreviation that needs to be expanded into its full version, or vice versa? 

If this describes you, then you've come to the right spot. 


## Installation
`npm install mongo-find-repace --save`

## Caveats
Make a backup of your data before using this tool. It will do exactly what you tell it to *every* field in *every* document, so make sure you've got your regular expressions written in such a way that you don't accidentally change something you didn't intend to change.

From the MongoDB CLI (docs [here](https://docs.mongodb.com/manual/reference/method/db.copyDatabase/)): 

```
db.copyDatabase('your_database', 'your_database-backup')
``` 

## Usage

1) Import mongo-find-replace into a JS file: 

```javascript
const MongoFindReplace = require('mongo-find-replace');
```

or

```javascript
import MongoFindReplace from mongo-find-replace;
```

2) Configure mongo-find-replace. The three required config options are the url to your MongoDB database, the database name, and the collection(s) containing the documents you want to search through and edit. See below for more advanced config (e.g. auth, etc.).

```javascript 

const MongoFR = new MongoFindReplace({
  dbUrl: 'mongodb://localhost:27017',
  dbName: 'example_db',
  collections: ['example_collection']  // or for multiple collections: ['coll1, coll2', ...]
});

```

3) Call the `#find` and `#andReplaceWith` functions. `#find` takes a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions), `#andReplaceWith` takes the string, number, or boolean that you'd like to replace your regular expression match with: 

```javascript
MongoFR.find(/regex/).andReplaceWith('new string')
```

4) Once you've got steps 1-3 done, save your file (e.g. `script.js`), start up MongoDB, backup your data, head into your command line/terminal application, cd into the directory containing `script.js`, and enter: 

```javascript
node script.js
```

The script will then run, you should see console output indicating which step the script is on.

## Basic examples

If you want to replace instances of 'colour' with 'color' in all fields in all documents in a given collection: 

```javascript
const mongo-find-replace = require('mongo-find-replace');
const MongoFR = new MongoFindReplace({
  dbUrl: 'mongodb://localhost:27017',
  dbName: 'example_db',
  collections: ['example_collection']  // or for multiple collections: ['coll1, coll2', ...]
});

MongoFR.find(/colour/).andReplaceWith('color');
``` 

If you want to replace tabs with two spaces: 

```javascript
// config goes here

MongoFR.find(/\t/).andReplaceWith('\s\s');
``` 

If you want to eliminate something entirely from all fields in a document:

```javascript
// config goes here

MongoFR.find(/frequently occurring mistake/).andReplaceWith('');
``` 

## Advanced config

Coming soon!

## Further reading

[Regexr](https://regexr.com/) is an excellent tool for both learning and testing regular expressions if you don't have a lot of experience with them. 

## Problems?

Please open an issue! 

## Contributing

If you've never made a pull request, check out this [how-to video](https://www.youtube.com/watch?v=_NrSWLQsDL4) for a primer on making PRs on Github. And hop onto the [Coding Train](https://www.youtube.com/channel/UCvjgXvBlbQiydffZU7m1_aw) while you're at it. 

1) Open a new issue explaining the features you'd like to add or bugs you'd like to fix, or comment on an existing issue and express your desire to make a PR against it. 
2) Fork the repo
3) If you don't have it already, [install commitizen](https://github.com/commitizen/cz-cli) and use it for your commits (`git cz`)
4) Create a new branch for your PR (e.g. `git checkout -b feature-add-nyan-cat'` or `git checkout -b 'bug-fix-unit-tests'`)
5) Make your PR

New contributors welcome! Just let me know if you have any questions. 
