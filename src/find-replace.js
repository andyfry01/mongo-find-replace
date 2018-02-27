const mongodb = require('mongodb')
const colors = require('colors')
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
      // TBD feature
      let optionalConfigProps = []
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

  validateConnection(configObj) {

    const validateDBName = (connection) => {
      return new Promise((resolve, reject) => {
        connection.db('test').admin().listDatabases((err, result) => {
          const dbs = result.databases
          const test = dbs.filter(db => db.name === configObj.dbName)
          if (test.length < 1) {
            const errorMessage = `It looks like you\'ve attempted to connect to a non-existing database. Check the dbName field in your config object, currently set to: ${configObj.dbName}.`
            reject(errorMessage)
          } else {
            resolve()
          }
        })
      })
    }

    const validateCollections = (connection) => {
      return new Promise((resolve, reject) => {
        connection.db(configObj.dbName).listCollections().toArray((err, dbCollections) => {
          dbCollections = dbCollections.map(collection => collection.name)
          const dbCollectionInfo = configObj.collections.reduce((acc, cur) => {
            if (dbCollections.indexOf(cur) > -1) {
              acc.validCollections.push(cur)
              return acc
            } else {
              acc.invalidCollections.push(cur)
              return acc
            }
          }, {
            validCollections: [],
            invalidCollections: []
          })
          if (dbCollectionInfo.invalidCollections.length === 0) {
            resolve()
          }
          const invalidCollections = dbCollectionInfo.invalidCollections.reduce((string, collectionName, index) => {
            if (index === 0) {
              return `${collectionName}`
            }
            return `${string}, ${collectionName}`}, 
            '')
          const errorMessage = `It looks like you\'ve passed in collections into your config object that don\'t exist in the specified database. Check the following collection names for errors: ${invalidCollections}`
          reject(errorMessage)
        })
      })
    }

    const validateDBUrl = (url) => {
      return MongoClient.connect(configObj.dbUrl)
    }

    // run validation functions!
    return new Promise((resolve, reject) => {
      // check if URL is valid
      validateDBUrl(configObj.dbUrl)
      .then(connection => {
        // check if database exists
        validateDBName(connection)
        .then(() => {
          // check if all collections exist within DB
          validateCollections(connection)
          .then(() => {
            resolve()
          })
          .catch(error => {
            reject(error)
          })
        })
        .catch(error => {
          reject(error)
        })
      })
      .catch(error => {
        // throws error if database url is invalid
        let errorMessage = error.message
        reject(errorMessage)
      })
    })
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
    // get document keys
    let docKeys = Object.keys(doc)
    // build new document object based on keys array
    let processedDocument = docKeys.reduce((current, next) => {
      // don't alter _id field
      if (next === '_id') {
        current[next] = doc[next]
        return current
      }
      // search for regex pattern in each doc field and replace if present
      current[next] = doc[next].replace(regex, replacement)
      return current
    }, {})
    return processedDocument
  }

  save(docsBatch, collection) {
    console.log('');
    console.log(`Processing complete for ${collection.namespace}`.green);
    console.log('');
    console.log(`Saving updated documents back to DB`.yellow);
    collection.bulkWrite(docsBatch, (err, result) => {
      if (err) {
        let errorMessage = err
        this.handleError(errorMessage)
      } else {
        if (result.ok === 1) {
          console.log(`\tDocuments in collection ${collection.namespace} saved sucessfully`.green);
          this.closeConnection()
        } else {
          let errorMessage = result.getWriteErrors()
          this.handleError(errorMessage)
        }
      }
    })
  }

  go() {
    // validate connection config to check for errors
    console.log('Validating config information...'.yellow)
    this.validateConnection(this.config)
    .then(() => {
      console.log('');
      console.log('\tValidation successful'.green);
      console.log('');
      console.log('Getting DB connection...'.yellow)
      // if validation passes, first get db connection
      this.getConnection(this.config.dbUrl, this.config.dbName)
      .then(() => {
        console.log('\tConnected to DB'.green);
        // process each collection in db
        this.config.collections.forEach(collectionName => {
          console.log('');
          console.log(`Processing collection: ${collectionName} ...`.yellow);
          let collection = this.getCollection(collectionName)
          // find all documents in given collection
          collection.find({}).toArray((err, docs) => {
            if (err) {
              console.log(err);
              this.closeConnection()
            }
            // build array of processed documents
            let updatedDocs = docs.map(doc => {
              console.log(`\tProcessing document ${doc._id} ...`.green);
              let processedDoc = this.processDocFields(doc, this.regex, this.replacement)
              let updateObject = {
                updateOne : {
                  "filter" : { "_id" : processedDoc._id },
                  "update" : { $set : processedDoc }
                }
              }
              return updateObject
            })
            // send updated document batch back to db
            this.save(updatedDocs, collection)
          })
        })
      })
    }).catch(error => {
      console.log(error)
    })

  }

  find(regexPattern) {
    let validate = (input) => {
      // check to make sure a regex was passed in as an argument
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
      // check for valid input types
      let validInputTypes = ['string', 'number', 'boolean']
      if (validInputTypes.indexOf(typeof input) < 0) {
        let errorMessage = 'Invalid input: #andReplaceWith takes a string, number, or boolean as input'
        this.handleError(errorMessage)
        return false
      }
      return true
    }

    // check to make sure required input is present
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