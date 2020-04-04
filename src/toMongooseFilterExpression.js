const kindOf = require('kind-of');

/**
 * Convert number type to int or float.
 * @param {string} fieldType Type of the field value.
 * @param {string} fieldValue The value to convert.
 * @returns {string} The detailed type of number (int, float).
 */
function getTypeof(fieldType, fieldValue) {
  let newType = kindOf(fieldType);
  if (fieldType === 'number' && fieldValue % 1 === 0) {
    newType = 'int';
  }
  if (fieldType === 'number' && fieldValue % 1 !== 0) {
    newType = 'float';
  }
  return newType;
}

/**
 * Convert contains to $regex operator.
 * @param {string} fieldType Type of the field value.
 * @param {string} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertContains(fieldType, fieldValue) {
  // we expect handling only type of string
  if (fieldType !== 'string') {
    return fieldValue;
  }
  return { $regex: fieldValue, $options: 'i' };
}

/**
 * Convert notContains to $not and $regex operator.
 * @param {string} fieldType Type of the field value.
 * @param {string} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertNotContains(fieldType, fieldValue) {
  // we expect handling only type of string
  if (fieldType !== 'string') {
    return fieldValue;
  }
  return { $not: { $regex: fieldValue, $options: 'i' } };
}

/**
 * Convert startsWith to $regex operator.
 * @param {string} fieldType Type of the field value.
 * @param {string} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertStartsWith(fieldType, fieldValue) {
  // we expect handling only type of string
  if (fieldType !== 'string') {
    return fieldValue;
  }
  return { $regex: `^${fieldValue}`, $options: 'i' };
}

/**
 * Convert endsWith to $regex operator.
 * @param {string} fieldType Type of the field value.
 * @param {string} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertEndsWith(fieldType, fieldValue) {
  // we expect handling only type of string
  if (fieldType !== 'string') {
    return fieldValue;
  }
  return { $regex: `${fieldValue}$`, $options: 'i' };
}

/**
 * Convert in ($in) operator.
 * @param {string} fieldType Type of the field value.
 * @param {array} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertIn(fieldType, fieldValue) {
  // we expect handling only type of array
  if (fieldType !== 'array') {
    return fieldValue;
  }
  return { $in: fieldValue };
}

/**
 * Convert or ($or) operator.
 * @param {string} fieldType Type of the field value.
 * @param {array} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertLogicalOperator(fieldType, fieldValue, fieldName) {
  // we expect handling only type of array
  if (fieldType !== 'array') {
    return fieldValue;
  }
  const operator = `$${fieldName}`;
  const result = { [operator]: [] };
  fieldValue.forEach((statement) => {
    result[operator].push(toMongooseFilterExpression(statement));
  });
  return result;
}

/**
 * Convert GraphQL set operator to Mongoose operator.
 * @param {string} fieldName Name of the field.
 * @param {*} fieldType Type of the field value.
 * @param {*} fieldValue The value to convert.
 * @returns {string} Converted statement.
 */
function convertSearchOperator(fieldName, fieldType, fieldValue) {
  switch (fieldName) {
    case 'ne':
      return { $ne: fieldValue };
    case 'eq':
      return fieldValue;
    case 'le':
      return { $lte: fieldValue };
    case 'lt':
      return { $lt: fieldValue };
    case 'ge':
      return { $gte: fieldValue };
    case 'gt':
      return { $gt: fieldValue };
    case 'exists':
      return { $exists: parseInt(fieldValue, 0) };
    case 'contains':
      return convertContains(fieldType, fieldValue);
    case 'notContains':
      return convertNotContains(fieldType, fieldValue);
    case 'between':
      return { $gte: fieldValue[0], $lte: fieldValue[1] };
    case 'startsWith':
      return convertStartsWith(fieldType, fieldValue);
    case 'endsWith':
      return convertEndsWith(fieldType, fieldValue);
    case 'in':
      return convertIn(fieldType, fieldValue);
    case 'or':
    case 'and':
      return convertLogicalOperator(fieldType, fieldValue, fieldName);
    default:
      return fieldValue;
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
function toMongooseFilterExpression(filter = {}) {
  const fields = Object.keys(filter);
  let transferedFilter = {};

  fields.forEach((field) => {
    // detect type of field value
    const isTypeOf = kindOf(filter[field]);
    const fieldSearchType = Object.keys(filter[field])[0];
    const fieldValue = filter[field][fieldSearchType];
    const fieldType = getTypeof(filter[field][fieldSearchType]);

    switch (isTypeOf) {
      case 'object':
        transferedFilter[field] = convertSearchOperator(fieldSearchType, fieldType, fieldValue);
        break;
      case 'array':
        transferedFilter = Object.assign(transferedFilter, convertSearchOperator(field, isTypeOf, filter[field]));
        break;
      default:
        // else tranfer as normal search
        transferedFilter[field] = filter[field];
    }
  });
  return transferedFilter;
}

module.exports = toMongooseFilterExpression;
