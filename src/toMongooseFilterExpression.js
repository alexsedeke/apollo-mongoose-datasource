/**
 * Convert number type to int or float.
 * @param {*} fieldType
 * @returns {string}
 */
function getRealType (fieldType, fieldValue) {
  let newType = fieldType

  if (fieldType === 'number' && fieldValue % 1 === 0) {
    newType = 'int'
  }

  if (fieldType === 'number' && fieldValue % 1 !== 0) {
    newType = 'float'
  }

  return newType
}

function convertContains (fieldType, fieldValue) {
  switch (fieldType) {
    case 'string':
      return { $regex: fieldValue, $options: 'i' }
    case 'int':
      return fieldValue
    case 'float':
      return fieldValue
    default:
      return fieldValue
  }
}

function convertNotContains (fieldType, fieldValue) {
  switch (fieldType) {
    case 'string':
      return { $not: { $regex: fieldValue, $options: 'i' } }
    case 'int':
      return fieldValue
    case 'float':
      return fieldValue
    default:
      return fieldValue
  }
}

function convertBeginsWith (fieldType, fieldValue) {
  switch (fieldType) {
    case 'string':
      return { $regex: `^${fieldValue}`, $options: 'i' }
    case 'int':
      return fieldValue
    case 'float':
      return fieldValue
    default:
      return fieldValue
  }
}

function convertSearchType (fieldName, fieldType, fieldValue) {
  const fieldTypeReal = getRealType(fieldType, fieldValue)

  switch (fieldName) {
    case 'ne':
      return { $ne: fieldValue }
    case 'eq':
      return fieldValue
    case 'le':
      return { $lte: fieldValue }
    case 'lt':
      return { $lt: fieldValue }
    case 'ge':
      return { $gte: fieldValue }
    case 'gt':
      return { $gt: fieldValue }
    case 'exists':
      return { $exists: parseInt(fieldValue, 0) }
    case 'contains':
      return convertContains(fieldTypeReal, fieldValue)
    case 'notContains':
      return convertNotContains(fieldTypeReal, fieldValue)
    case 'between':
      return { $gte: fieldValue[0], $lte: fieldValue[1] }
    case 'beginsWith':
      return convertBeginsWith(fieldTypeReal, fieldValue)
    default:
      return fieldValue
  }
}

/**
 * Actully we transform the schema input type, which is of type object,
 * to a object where the values are a regex. This way it is a like search for
 * Mongo DB. The return value is a simple object so it will work on 'find' methods
 * as well on aggregations.
 * This is also very poor implementation cause it do not support numeric
 * or boolean values. It will be extend.
 * @param {object} filter
 * @returns {object}
 */
function toMongooseFilterExpression (filter = {}) {
  const fields = Object.keys(filter)
  const transferedFilter = {}

  fields.forEach((field) => {
    // Detect if this is a object
    if (typeof filter[field] === 'object') {
      const fieldSearchType = Object.keys(filter[field])[0]
      const fieldValue = filter[field][fieldSearchType]
      const fieldType = typeof filter[field][fieldSearchType]

      transferedFilter[field] = convertSearchType(fieldSearchType, fieldType, fieldValue)
    } else {
      // else tranfer as normal search
      transferedFilter[field] = filter[field]
    }
  })
  return transferedFilter
}

module.exports = toMongooseFilterExpression
