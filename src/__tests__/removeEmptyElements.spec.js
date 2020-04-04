const removeEmptyElements = require('../removeEmptyElements')

describe('Remove empty element from object', () => {
  const testDocument = {
    someString: 'moin',
    emptyString: '',
    undefinedThing: undefined,
    nullNumerical: null,
    falseValue: false,
    trueValue: true,
    numberValue: 123456,
    emptyObjectValue: {},
    filledObjectValue: { none: 'none'},
    emptyArrayValue: [],
    filledArrayValue: [11, 12]
  }
  
  const expectedResultDocument = {
    someString: 'moin',
    falseValue: false,
    trueValue: true,
    numberValue: 123456,
    filledObjectValue: { none: 'none'},
    filledArrayValue: [11, 12]
  }

  it('should remove empty elements', () => {
    const result = removeEmptyElements(testDocument)
    expect(result).toEqual(expectedResultDocument)
  });
});
