const { DataSource } = require('apollo-datasource')
const { ApolloError } = require('apollo-server-errors')
const Mongoose = require('mongoose')
const toMongooseFilterExpression = require('./src/toMongooseFilterExpression')
const cleanDocumentUpdate = require('./src/cleanDocumentUpdate')
const { ObjectId } = Mongoose.Types

/**
 * Default pagination page size
 * @type {number}
 */
const PAGINATION_DEFAULT_LIMIT = 20

class MongooseDataSource extends DataSource {
  /**
   * Validate Mongoose model name when initializing class.
   * Verify if a mongoose schema is loaded with given name in option parameters.
   * Raise an exception when schema is not found, otherwise set reference to schema in class.
   * @param {string} mongooseModelName
   * @param {object} options
   * @constructor
   */
  constructor (mongooseModelName, options = {}) {
    super()
    this.options = { limit: PAGINATION_DEFAULT_LIMIT, ...options }
    if (typeof mongooseModelName !== 'string') {
      throw new ApolloError('Mongoose Data Source need a Mongoose model name.')
    }
    if (!Mongoose.models || !Mongoose.models[mongooseModelName]) {
      throw new ApolloError(`Unknown Mongoose model '${mongooseModelName}'. Did you import your Mongoose model?`)
    }
    this.Model = Mongoose.model(mongooseModelName)
    this.Schema = Mongoose.modelSchemas[mongooseModelName]
  }

  /**
   * This is a function that gets called by ApolloServer when being setup.
   * This function gets called with the datasource config including things
   * like caches and context. We'll assign this.context to the request context
   * here, so we can know about the user making requests
   */
  initialize (config) {
    this.context = config.context
  }

  /**
   * Find a specific record, by using filter entries.
   * @param {object} filter - Optional. Specifies selection filter using query operators.
   * @param {object} projection - Optional. Specifies the fields to return in the documents
   *                 that match the query filter. For details, see
   *                 [Projection](https://docs.mongodb.com/manual/reference/method/db.collection.find/#find-projection).
   * @returns {promise}
   */
  async findOne (filter = {}, projection = {}) {
    try {
      return await this.Model.findOne(filter, projection).exec()
    } catch (err) {
      return err
    }
  }

  /**
   * Find a specific records, by using search entries.
   * @param {object} filter Represent filter object for mongo find()
   * @returns {promise}
   */
  async find (filter = {}) {
    try {
      const documents = await this.Model.find(filter).exec()
      return documents
    } catch (err) {
      return err
    }
  }

  /**
   * Return all documents.
   * @returns {promise}
   */
  async all (options = {}) {
    const filter = toMongooseFilterExpression(options.filter)
    const { reduction = null, sort = null } = options

    try {
      const documents = await this.Model.find(filter, reduction).sort(sort).exec()
      return documents
    } catch (err) {
      return err
    }
  }

  /**
   * List documents with pagination.
   * @returns {promise}
   */
  async list (options = {}) {
    const {
      page = 1, limit = this.options.limit, sort = {}, filter = {}
    } = options
    const datafilter = toMongooseFilterExpression(filter)
    const skip = (page - 1) * limit

    try {
      // When filtering is present we use countDocuments(),
      // else estimatedDocumentCount() which is much faster but no filtering possible.
      let totalCount = 0
      if (datafilter === {}) {
        totalCount = await this.Model.estimatedDocumentCount().exec()
      } else {
        totalCount = await this.Model.countDocuments(datafilter).exec()
      }

      // Get all nodes
      const node = await this.Model
        .find(datafilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec()

      return {
        totalCount,
        currentPage: page,
        hasPrevPage: (page > 1),
        hasNextPage: (page < Math.ceil(totalCount / limit)),
        totalPages: Math.ceil(totalCount / limit),
        prevPage: (page > 1) ? page - 1 : 0,
        nextPage: (page < Math.ceil(totalCount / limit)) ? page + 1 : 0,
        node
      }
    } catch (err) {
      return err
    }
  }

  /**
   * List documents with pagination.
   * @returns {promise}
   */
  async listAggregation (options = {}, aggregation = []) {
    const {
      page = 1, limit = this.options.limit, sort = {}, filter = {}
    } = options
    const datafilter = toMongooseFilterExpression(filter)
    const skip = (page - 1) * limit

    try {
      // When filtering is present we use countDocuments(),
      // else estimatedDocumentCount() which is much faster but no filtering possible.
      const firstAggregationMatch = []
      const sortAggregation = []

      let totalCount = 0

      if (datafilter === {}) {
        totalCount = await this.Model.estimatedDocumentCount().exec()
      } else {
        totalCount = await this.Model.countDocuments(datafilter).exec()
        // Only if filter was set, we use it.
        firstAggregationMatch.push({ $match: datafilter })
      }

      // Only if there is a sort present we use it.
      if (sort) {
        sortAggregation.push({ $sort: sort })
      }

      // Join aggregation definitions
      const aggregationConcat = firstAggregationMatch.concat(
        aggregation,
        sortAggregation,
        [{ $skip: skip }, { $limit: limit }]
      )

      const node = await this.Model
        .aggregate(aggregationConcat)
        .exec()

      return {
        totalCount,
        currentPage: page,
        hasPrevPage: (page > 1),
        hasNextPage: (page < Math.ceil(totalCount / limit)),
        totalPages: Math.ceil(totalCount / limit),
        prevPage: (page > 1) ? page - 1 : 0,
        nextPage: (page < Math.ceil(totalCount / limit)) ? page + 1 : 0,
        node
      }
    } catch (err) {
      return err
    }
  }

  /**
   * Find document by Id. The Id parameter is a string, and
   * should by cast able to Mongo DB Id.
   * @param {string} id MongoDB record id as string.
   * @returns {promise}
   */
  async getById (id) {
    try {
      const document = await this.Model.findById(id).exec()
      return document
    } catch (err) {
      // When id is not cast able to mongo id error is raised.
      // To mask this error we return null value which can be compared with not found.
      return null
    }
  }

  /**
   * Create and only create a new documen. When document exists, an error will be raised.
   * An error will be raised also when any other property requirements don`t fit.
   * @param {object} document Object contains new document properties.
   * @returns {promise} Retuns created document object or return database error.
   */
  async add (document) {
    const newDocument = new this.Model(document)
    try {
      await newDocument.save()
      return newDocument
    } catch (err) {
      return err
    }
  }

  /**
   * Delete document by it's id.
   * @param {*} id Document id
   * @returns {promise} Retuns removed document object or return database error.
   */
  async delete (id) {
    try {
      const document = await this.getById(id)
      if (document) {
        const result = await document.deleteOne()
        return result
      }
      return null
    } catch (err) {
      return err
    }
  }

  /**
   * Remove multiple document by it is id.
   * @param {array|string} id Document id as string or array of id.
   * @returns {promise} Retuns removed document object or return database error.
   */
  async deleteManyById (id) {
    const idList = []

    try {
      if (typeof id === 'string') {
        idList.push(ObjectId(id))
      }

      if (Array.isArray(id)) {
        id.forEach((stringId) => {
          idList.push(ObjectId(stringId))
        })
      }

      const result = await this.Model.deleteMany({ _id: { $in: idList } })
      return result
    } catch (error) {
      return error
    }
  }

  /**
   * Remove multiple document by setting filter.
   * @param {object} filter Document id as string or array of id.
   * @returns {promise} Retuns removed document object or return database error.
   */
  async deleteMany (filter = {}) {
    try {
      const result = await this.Model.deleteMany(filter)
      return result
    } catch (error) {
      return error
    }
  }

  /**
   * Update document by it is id.
   * @param {*} id Document id
   * @param {*} documentUpdate Document object with updated information
   */
  async update (id, documentUpdate) {
    try {
      const document = await this.getById(id)
      if (document) {
        Object.assign(document, documentUpdate)
        await document.save()
        return document
      }
      return null
    } catch (err) {
      return err
    }
  }

  /**
   * Update multiple document by list of id.
   * @param {*} id Document id
   * @param {*} documentUpdate Document object with updated information
   */
  async updateMany (id, documentUpdate) {
    const idList = []

    try {
      if (typeof id === 'string') {
        idList.push(ObjectId(id))
      }

      if (Array.isArray(id)) {
        id.forEach((stringId) => {
          idList.push(ObjectId(stringId))
        })
      }

      const cleanedDocumentUpdate = cleanDocumentUpdate(documentUpdate)
      const result = await this.Model.updateMany(
        { _id: { $in: idList } },
        { $set: cleanedDocumentUpdate }
      )
      return result
    } catch (err) {
      return err
    }
  }

  /**
   * Update or insert document by it's id.
   * @param {*} id Document id.
   * @param {*} documentUpdate Document object with updated information.
   */
  async findOneAndUpdate (id, documentUpdate) {
    try {
      const document = await this.Model.findOneAndUpdate(
        { _id: new ObjectId(id) },
        documentUpdate,
        { upsert: true }
      ).exec()
      return document
    } catch (err) {
      return err
    }
  }
}

module.exports = MongooseDataSource
