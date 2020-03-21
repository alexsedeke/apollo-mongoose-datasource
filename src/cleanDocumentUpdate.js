/**
 * Cleans emptyish values from document to prevent fields to be cleared via (multi-)update
 *
 * @param {object} documentUpdate document with emptyish values
 * @returns document without emptyish values
 */

function cleanDocumentUpdate (documentUpdate) {
  Object.keys(documentUpdate).forEach((key) => {
    if (!documentUpdate[key]) {
      delete documentUpdate[key]
    }
  })
  return documentUpdate
}

module.exports = cleanDocumentUpdate
