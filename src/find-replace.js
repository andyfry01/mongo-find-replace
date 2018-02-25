const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const util = require('util')

class MongoFindAndReplace {
  constructor(config) {

    let validate = (config) => {

      // check for no config
      if (!config) {
        let errorMessage = ' Looks like you didn\'t configure the MongoFR. \n Please pass in a config object. \n See docs reference: (doc reference)'
        this.handleError(errorMessage)
        return false
      }

      // check for valid config props
      let requiredConfigProps = ['dbUrl', 'dbName', 'collections']
      let optionalConfigProps = ['auth']
      let validConfigProperties = requiredConfigProps.concat(optionalConfigProps)
      let configProperties = Object.keys(config)
      configProperties.forEach(prop => {
        if (validConfigProperties.indexOf(prop) < 0) {
          let errorMessage = `${prop} is an invalid config property`
          this.handleError(errorMessage)
          return false
        }
      })

      //check for missing config props
      requiredConfigProps.forEach(prop => {
        if (configProperties.indexOf(prop) < 0) {
          let errorMessage = `${prop} is a required config property`
          this.handleError(errorMessage)
          return false
        }
      })

      // if validations pass, return true
      return true
    }
    
    if (validate(config)) {
      this.config = config
      this.regex = undefined
      this.replacement = undefined
      this.connection = undefined
      this.db = undefined
    }
  }

  getConnection(url, dbName) {
    return new Promise((resolve, reject) => {
      MongoClient.connect(url, (err, connection) => {
        if (err) {
          reject(err);
        }
        this.connection = connection
        this.db = connection.db(dbName)
        resolve()
      })
    })
  }

  closeConnection() { 
    // console.log('this.connection');
    // console.log(this.connection);
    if (this.connection !== undefined) {
      this.connection.close(false, () => { 
        this.connection = undefined
      })
    }
  }

  getCollection(collectionName) {
    return this.db.collection(collectionName)
  }

  processDocFields(doc, regex, replacement) {
    // console.log('am i being called?');
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

  save(docsBatch, collection) {
    console.log('now saving');
    // console.log(util.inspect(docsBatch, {showHidden: false, depth: null}))
    collection.bulkWrite(docsBatch, (err, result) => {
      if (err) {
        let errorMessage = err
        this.handleError(errorMessage)
      } else {
        if (result.ok === 1) {
        } else {
          let errorMessage = result.getWriteErrors()
          this.handleError(errorMessage)
        }
      }
      this.closeConnection()
    })
  }

  go() {
    this.getConnection(this.config.dbUrl, this.config.dbName)
    .then(() => {
      this.config.collections.forEach(collectionName => {
        let collection = this.getCollection(collectionName)
        collection.find({}).toArray((err, docs) => {
          if (err) {
            console.log(err);
            this.closeConnection()
          }
          let updatedDocs = docs.map(doc => {
            let processedDoc = this.processDocFields(doc, this.regex, this.replacement)
            let updateObject = {
              updateOne : {
                "filter" : { "_id" : processedDoc._id },
                "update" : { $set : processedDoc }
              }
            }
            return updateObject
          })
          this.save(updatedDocs, collection)
        })
      })
    })
  }

  find(regexPattern) {
    let validate = (input) => {
      if (input.constructor.name !== 'RegExp') {
        let errorMessage = 'Invalid input: #find takes a regular expression as an argument'
        this.handleError(errorMessage)
        return false
      }
      return true
    }

    if (validate(regexPattern)) {
      this.regex = regexPattern
      return this
    }
  }

  andReplaceWith(replacement) {
    let validate = (input) => {
      let validInputTypes = ['string', 'number', 'boolean']
      if (validInputTypes.indexOf(typeof input) < 0) {
        let errorMessage = 'Invalid input: #andReplaceWith takes a string, number, or boolean as input'
        this.handleError(errorMessage)
        return false
      }
      return true
    }

    let allInputsAssigned = () => {
      if (this.replacement === undefined) {
        let errorMessage = 'No replacement specified'
        this.handleError(errorMessage)
        return false
      }
      if (this.regex === undefined) {
        let errorMessage = 'No regex pattern specified'
        this.handleError(errorMessage)
        return false
      }
      return true
    }

    if (validate(replacement)) {
      this.replacement = replacement
      if (allInputsAssigned()) {
        this.go()
      }
    }

  }

  handleError(errorMessage) {
    throw new Error(errorMessage)
    this.closeConnection()
  }
}

module.exports = MongoFindAndReplace