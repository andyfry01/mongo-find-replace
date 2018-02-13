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

function connectToDB(done) {
  MongoClient.connect(`${dbUrl}`, (err, connection) => {
    if (err) {
      if (err.name === 'MongoNetworkError') {
        console.log('Looks like MongoDB isn\'t running in your local environment'.red);
        console.log('Start MongoDB before running the test suite (mongod or sudo mongod in the CLI)'.red);
      }
    }
    dbConnections.push(connection)
    const db = connection.db(testDB)
    testCollections.forEach(testCollections => {
      if (!db.collection(testCollections).find({})) {
        db.createCollection(testCollections)
        testDocs.withNewLines.forEach(testDoc => {
          db.collection(testCollections).insert(testDoc)
        })
        done()
      }
    })
    done()
  })
}

function dropDBAndCloseConnection(done) {
  dbConnections.forEach(connection => {
    connection.db(testDB).dropDatabase(() => {
      connection.close()
    })
  })
  done()
}

const validConfigObject = {
  dbUrl: 'test',
  dbName: 'test',
  collections: ['test']
}


describe('MongoDB find and replace', function() {

  describe('MongoDB find and replace class', () => {

    it('exists', () => {
      const expected = 'function'
      const actual = typeof MongoFindAndReplace
      assert.equal(actual, expected)
    })

    it('takes a config object in its constructor', () => {
      const MongoFR = new MongoFindAndReplace(validConfigObject)
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
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const actual = typeof MongoFR.config
        const expected = 'object'
        assert.equal(actual, expected)
      })
    })
  })

  describe('class methods', () => {
    before(connectToDB);
    after(dropDBAndCloseConnection);

    describe('#getConnection', () => {
      it('exists', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.getConnection
        assert.equal(actual, expected)
      })
      it('should return a mongodb database connection', async() => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const connection = await MongoFR.getConnection('mongodb://localhost:27017', testDB)
        const actual = connection.constructor.name
        const expected = 'Db'
        assert.equal(actual, expected)
      })
    })


    describe('#getCollection', () => {
      it('exists', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.getCollection
        assert.equal(actual, expected)
      })
      it('gets a collection from a DB connection', async() => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const connection = await MongoFR.getConnection('mongodb://localhost:27017', testDB)
        const collection = MongoFR.getCollection(testCollections[0], connection)
        const actual = 'test1';
        const expected = testCollections[0]
        assert.equal(actual, expected)
      })
    })

    describe('#processDocFields', () => {
      it('exists', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.processDocFields
        assert.equal(actual, expected)
      })
      it('should process doc fields according to the regex pattern and replacement item', async() => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const result = await MongoFR.processDocFields(testDocs.withNewLines[0], regex.newLineChar, '')
        const expected = true
        const actual = _.isEqual(result, testDocs.withoutNewLines[0])
        assert.equal(actual, expected)        
      })
    })
    describe('#go', () => {
      it('should exist', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const expected = 'function'
        const actual = typeof MongoFR.go
        assert.equal(actual, expected)
      }) 
    })
  })

  describe('API', () => {
    describe('#find', () => {
      it('should be chainable (returns this)', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const actual = MongoFR.find(/something/).constructor.name
        const expected = 'MongoFindAndReplace'
        assert.equal(actual, expected)
      })
      it('should throw an error if passed invalid input', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        function throwsError(){
          MongoFR.find('invalid input')
        }
        const expectedError = 'Invalid input: #find takes a regular expression as an argument'
        assert.throws(throwsError, Error, expectedError)
      })
      it('should set its input as the regex prop on the MongoFR instance', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        MongoFR.find(/something/)
        const actual = _.isEqual(MongoFR.regex, /something/)
        const expected = true
        assert.equal(actual, expected)
      })
    })
    describe('#andReplaceWith', () => {
      it('should throw an error if passed invalid input', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
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
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        MongoFR.find(/test/).andReplaceWith('valid input')
        const actual = MongoFR.replacement
        const expected = 'valid input'
        assert.equal(actual, expected)
      })
      it('should call the #go method', () => {
        const MongoFR = new MongoFindAndReplace(validConfigObject)
        const spy = sinon.spy(MongoFR, 'go')
        MongoFR.find(/test/).andReplaceWith('test')
        const actual = spy.callCount
        const expected = 1
        assert.equal(actual, expected)
      })
      it('should not call go if this.regex is undefined', () => {

      })
    })
  })
})