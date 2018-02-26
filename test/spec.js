const util = require('util')

// MongoDB
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient

// Testing utils
const _ = require('lodash')
const chai = require('chai')
const sinon = require('sinon')
const expect = chai.expect
const assert = chai.assert

// Console output coloring
const colors = require('colors')

// Main library module
const MongoFindAndReplace = require('../src/find-replace.js')

// Test input
const dbUrl = 'mongodb://localhost:27017'
const testDB = 'mongodb_mass_doc_updater'
const testCollections = ['test1', 'test2', 'test3']

// Mock documents and regex for testing
const testDocs = require('./testDocs.js')
const regex = {
  newLineChar: /(\r\n|\r|\n)/gm
}

let dbConnections = [];

function createAndPopulateTestDB(done) {
  MongoClient.connect(`${dbUrl}`, (err, connection) => {
    if (err) {
      if (err.name === 'MongoNetworkError') {
        console.log('Looks like MongoDB isn\'t running in your local environment'.red);
        console.log('Start MongoDB before running the test suite (mongod or sudo mongod in the CLI)'.red);
      }
    }
    dbConnections.push(connection)
    const db = connection.db(testDB)
    testCollections.forEach(testCollection => {
      if (!db.collection(testCollection).find({})) { 
        db.createCollection(testCollection)
      }
      testDocs.withNewLines.forEach(testDoc => {
        db.collection(testCollection).insert(testDoc)
      })
    })
    connection.close()
    done()
  })
}

function dropDBAndCloseConnection(done) {
  dbConnections.forEach(connection => {
    connection.db(testDB).dropDatabase(() => {
      closeConnection(connection)
    })
  })
  done()
}

function closeConnection(connection, next) {
  setTimeout(() => { 
    connection.close()
    if (next) {
      next()
    }
  }, 300)
}

const validConfigObject = {
  dbUrl: 'test',
  dbName: 'test',
  collections: ['test']
}

const workingConfigObject = {
  dbUrl: dbUrl,
  dbName: testDB,
  collections: testCollections
}

const nonWorkingConfigObject = {
  dbUrl: 'mongodb://localhost:9999',
  dbName: 'nonExistingDatabase',
  collections: ['nonExistingCollection']
}


describe('MongoDB find and replace', function() {

  describe('MongoDB find and replace class', () => {

    it('exists', () => {
      const expected = 'function'
      const actual = typeof MongoFindAndReplace
      assert.equal(actual, expected)
    })

    it('takes a config object in its constructor', () => {
      const MongoFR = new MongoFindAndReplace(workingConfigObject)
      const actual = typeof MongoFR.config
      const expected = 'object'
      assert.equal(actual, expected)
    })
    describe('config object validation', () => {

      it('throws an error if passed an incorrect config param', () => {
        function throwsError() {
          const MongoFR = new MongoFindAndReplace({
            invalidParam: 'testURL'
          })
        }
        const expectedError = `invalidParam is an invalid config property`
        assert.throws(throwsError, Error, expectedError);
      })

      it('throws an error if required config params are missing', () => {
        function throwsError() {
          const MongoFR = new MongoFindAndReplace({
            dbUrl: 'testURL',
            dbName: 'test'
          })
        }
        const expectedError = `collections is a required config property`
        assert.throws(throwsError, Error, expectedError);
      })

      it('throws an error if passed no config params', () => {
        function throwsError() {
          const MongoFR = new MongoFindAndReplace()
        }
        const expectedError = 'Looks like you didn\'t configure the MongoFR. \n Please pass in a config object. \n See docs reference: (doc reference)'
        assert.throws(throwsError, Error, expectedError);
      })

      it('does not throw an error if passed correct config params', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const actual = typeof MongoFR.config
        const expected = 'object'
        assert.equal(actual, expected)
      })
    })
  })

  describe('class methods', () => {
    before(createAndPopulateTestDB);

    describe('#getConnection', () => {
      it('exists', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.getConnection
        assert.equal(actual, expected)
      })
      it('should set a DB connection as this.connection on the MongoFR', async() => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const connection = await MongoFR.getConnection('mongodb://localhost:27017', testDB)
        const actual = MongoFR.connection.constructor.name
        const expected = 'MongoClient'
        assert.equal(actual, expected)
      })
      it('should set a DB as this.db on the MongoFR', async() => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const connection = await MongoFR.getConnection('mongodb://localhost:27017', testDB)
        const actual = MongoFR.db.constructor.name
        const expected = 'Db'
        assert.equal(actual, expected)
      })
    })

    describe('#getCollection', () => {
      it('exists', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.getCollection
        assert.equal(actual, expected)
      })
      it('gets a collection from a DB connection', async() => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const connection = await MongoFR.getConnection('mongodb://localhost:27017', testDB)
        const collection = MongoFR.getCollection(testCollections[0], connection)
        const actual = 'test1';
        const expected = testCollections[0]
        assert.equal(actual, expected)
      })
    })

    describe('#processDocFields', () => {
      it('exists', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.processDocFields
        assert.equal(actual, expected)
      })
      it('should process doc fields according to the regex pattern and replacement item', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const processedDoc = MongoFR.processDocFields(testDocs.withNewLines[0], regex.newLineChar, '')
        delete processedDoc._id
        const expectedResult = testDocs.withoutNewLines[0]
        const actual = _.isEqual(processedDoc, expectedResult)
        const expected = true
        assert.equal(actual, expected)        
      })
    })

    describe('#go', () => {
      it('should exist', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.go
        assert.equal(actual, expected)
      })
      it('should call #getConnection', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const spy = sinon.spy(MongoFR, 'getConnection')
        MongoFR.go()
        const actual = spy.callCount
        const expected = 1
        assert.equal(actual, expected)
      })
      it('should call #getCollection at least once', (done) => {
        let configObject = Object.assign({}, workingConfigObject, {collections: ['test1']})
        const MongoFR = new MongoFindAndReplace(configObject)
        const spy = sinon.spy(MongoFR, 'getCollection')
        MongoFR.go()
        // setTimeout is not a great solution for this
        // need some way to test whether getCollection is called
        // within the .then of #getConnection
        // http://bit.ly/2sRXPpY
        setTimeout(() => {
          const actual = spy.callCount
          const expected = 1
          assert.equal(actual, expected)
          done();
        }, 500);
      })
      it('should call #getCollection for each collection in config object', (done) => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const spy = sinon.spy(MongoFR, 'getCollection')
        MongoFR.go()
        setTimeout(() => {
          const actual = spy.callCount
          const expected = workingConfigObject.collections.length // 3
          assert.equal(actual, expected)
          done();
        }, 200);
      }) 
      it('should successfully update documents according to input', (done) => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        MongoFR.find(regex.newLineChar).andReplaceWith('')
        setTimeout(() => {
          MongoClient.connect(`${dbUrl}`, (err, connection) => {
            testCollections.forEach(collectionName => {
              connection.db(dbName).collection(collectionName).find({}, (err, docs) => {
                docs.forEach((doc, index) => {
                  delete doc._id
                  let actual = _.isEqual(doc, testDocs.withoutNewLines[index])
                  let expected = true
                  assert.equal(actual, expected)
                })
              })
            })
          })
          done();
        }, 200);
      })
    })

    describe('#validateConnection', () => {
      it('should exist', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.validateConnection
        assert.equal(actual, expected)
      })
      it('should throw an error if the config obj dbUrl is invalid', (done) => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        MongoFR.validateConnection(nonWorkingConfigObject)
        .catch(error => {
          let actual = error.indexOf('failed to connect to server')
          let expected = -1
          assert.isAbove(actual, expected)
        }).finally(done())
      })
      it('should throw an error if the config obj database doesn\'t exist', (done) => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const configWithNonWorkingDb = {
          dbUrl: 'mongodb://localhost:27017',
          dbName: 'nonExistingDatabase',
          collections: ['etc']
        }
        MongoFR.validateConnection(configWithNonWorkingDb)
        .catch(error => {
          const actual = error.indexOf('It looks like you\'ve attempted to connect to a non-existing database')
          const expected = -1
          assert.isAbove(actual, expected)
        }).finally(done())
      })
      it('should throw an error if the config obj collections don\'t exist in the specified DB', (done) => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const configWithNonExistingConnections = {
          dbUrl: 'mongodb://localhost:27017',
          dbName: 'mongodb_mass_doc_updater',
          collections: ['i_dont_exist', 'nor_do_i', 'me_neither']
        }
        MongoFR.validateConnection(configWithNonExistingConnections)
        .catch(error => {
          const actual = error.indexOf('It looks like you\'ve passed in collections into your config object that don\'t exist in the specified database')
          const expected = -1
          assert.isAbove(actual, expected)
        }).finally(done())
      })
    })
  })

  describe('API', () => {
    describe('#find', () => {
      it('should be chainable (returns this)', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const actual = MongoFR.find(/something/).constructor.name
        const expected = 'MongoFindAndReplace'
        assert.equal(actual, expected)
      })
      it('should throw an error if passed invalid input', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        function throwsError(){
          MongoFR.find('invalid input')
        }
        const expectedError = 'Invalid input: #find takes a regular expression as an argument'
        assert.throws(throwsError, Error, expectedError)
      })
      it('should set its input as the regex prop on the MongoFR instance', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        MongoFR.find(/something/)
        const actual = _.isEqual(MongoFR.regex, /something/)
        const expected = true
        assert.equal(actual, expected)
      })
    })
    describe('#andReplaceWith', () => {
      it('should throw an error if passed invalid input', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        function fxnError(){
          MongoFR.andReplaceWith(() => { console.log('invalid input') })
        }
        function arrayError(){
          MongoFR.andReplaceWith(['invalid input'])
        }
        function objectError(){
          MongoFR.andReplaceWith({invalid: 'input'})
        }
        let expectedError = 'Invalid input: #andReplaceWith takes a string, number, or boolean as input'
        assert.throws(fxnError, Error, expectedError)
        assert.throws(arrayError, Error, expectedError)
        assert.throws(objectError, Error, expectedError)
      })
      it('should set its input as the replacement prop on the MongoFR instance', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        MongoFR.find(/test/).andReplaceWith('valid input')
        const actual = MongoFR.replacement
        const expected = 'valid input'
        assert.equal(actual, expected)
      })
      it('should not call go if this.regex is undefined', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const spy = sinon.spy(MongoFR, 'go')
        function throwsError(){
          MongoFR.andReplaceWith('test')
        }
        const actual = spy.callCount
        const expected = 0
        assert.throws(throwsError, Error)
        assert.equal(actual, expected)
      })  
      it('should call the #go method if all inputs have been specified correctly', () => {
        const MongoFR = new MongoFindAndReplace(workingConfigObject)
        const spy = sinon.spy(MongoFR, 'go')
        MongoFR.find(/test/).andReplaceWith('test')
        const actual = spy.callCount
        const expected = 1
        assert.equal(actual, expected)
      })
    })
  })
})