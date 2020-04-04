/**
 * Remove empty values properties from document to prevent fields to be cleared via (multi-)updates.
 * @param {object} document Document object with all kind of property values.
 * @returns document without empty values
 */
function removeEmptyObjectElements (document) {
  const result = {}
  Object.keys(document).forEach((key) => {
    const hasType = Array.isArray(document[key]) ? 'array' : typeof document[key]
    // array
    if (hasType === 'array' && document[key].length) {
      result[key] = document[key]
    }
    // string
    if (hasType === 'string' && document[key].length) {
      result[key] = document[key]
    }
    // object
    if (hasType === 'object' && document[key] !== null && Object.keys(document[key]).length > 0) {
      result[key] = document[key]
    }
    // boolean
    if (['boolean', 'function', 'number'].includes(hasType)) {
      result[key] = document[key]
    }
  })
  return result
}

module.exports = removeEmptyObjectElements
