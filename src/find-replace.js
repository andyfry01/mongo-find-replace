const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const util = require('util')

class MongoFindAndReplace {
  constructor(config) {

    if (validate(config)) {
      this.config = config
      this.regex = undefined
      this.replacement = undefined
    }

    function validate(config) {

      // check for no config
      if (!config) {
        throw new Error(' Looks like you didn\'t configure the MongoFR. \n Please pass in a config object. \n See docs reference: (doc reference)')
        return false
      }

      // check for valid config props
      let requiredConfigProps = ['dbUrl', 'dbName', 'collections']
      let optionalConfigProps = ['auth']
      let validConfigProperties = requiredConfigProps.concat(optionalConfigProps)
      let configProperties = Object.keys(config)
      configProperties.forEach(prop => {
        if (validConfigProperties.indexOf(prop) < 0) {
          throw new Error(`${prop} is an invalid config property`)
          return false
        }
      })

      //check for missing config props
      requiredConfigProps.forEach(prop => {
        if (configProperties.indexOf(prop) < 0) {
          throw new Error(`${prop} is a required config property`)
          return false
        }
      })

      // if validations pass, return true
      return true
    }
  }

  getConnection(url, dbName) {
    return new Promise((resolve, reject) => {
      MongoClient.connect(url, (err, connection) => {
        if (err) {
          reject(err);
        }
        resolve(connection.db(dbName))
      })
    })
  }

  getCollection(collectionName, db) {
    return db.collection(collectionName)
  }

  processDocFields(doc, regex, replacement) {
    let docKeys = Object.keys(doc)
    let processedDocument = docKeys.reduce((current, next) => {
      if (next === '_id') {
        current[next] = doc[next]
        return current
      }
      current[next] = doc[next].replace(regex, replacement)
      return current
    }, {})
    return processedDocument
  }

  save(doc, collection) {
    collection.update({
        _id: doc._id
      },
      doc,
      (err, status) => {
        console.log(status.result);
      })
  }

  find(regexPattern) {
    if (validate(regexPattern)) {
      this.regex = regexPattern
      return this
    }
    function validate(input){
      if (input.constructor.name !== 'RegExp') {
        throw new Error('Invalid input: #find takes a regular expression as an argument')
        return false
      }
      return true
    }
  }

  andReplaceWith(replacement) {
    if (validate(replacement)) {
      this.replacement = replacement
      return this
    }
    function validate(input){
      let validInputTypes = ['string', 'number', 'boolean']
      if (validInputTypes.indexOf(typeof input) < 0) {
        throw new Error('Invalid input: #andReplaceWith takes a string, number, or boolean as input')
        return false
      }
      return true
    }
  }
}

module.exports = MongoFindAndReplace