const toMongooseFilterExpression = require('../toMongooseFilterExpression');

describe('Convert GraphQL request to Mongoose query', () => {
  it('should convert contains', () => {
    const request = { firstname: { contains: 'dump' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $options: 'i', $regex: 'dump' } });
  });

  it('should convert notContains', () => {
    const request = { firstname: { notContains: 'dump' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $not: { $options: 'i', $regex: 'dump' } } });
  });

  it('should convert startsWith', () => {
    const request = { firstname: { startsWith: 'dump' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $options: 'i', $regex: '^dump' } });
  });

  it('should convert endsWith', () => {
    const request = { firstname: { endsWith: 'dump' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $options: 'i', $regex: 'dump$' } });
  });

  it('should convert exists', () => {
    const request = { firstname: { exists: '1' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $exists: 1 } });
  });

  it('should convert not exists', () => {
    const request = { firstname: { exists: '0' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $exists: 0 } });
  });

  it('should convert eq (equal)', () => {
    const request = { firstname: { eq: 'dumbo' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: 'dumbo' });
  });

  it('should convert ne (not equal)', () => {
    const request = { firstname: { ne: 'dumbo' } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $ne: 'dumbo' } });
  });

  it('should convert le (less than or equal)', () => {
    const request = { firstname: { le: 2 } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $lte: 2 } });
  });

  it('should convert lt (less than )', () => {
    const request = { firstname: { lt: 2.2 } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $lt: 2.2 } });
  });

  it('should convert ge (greater than or equal)', () => {
    const request = { firstname: { ge: 2 } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $gte: 2 } });
  });

  it('should convert gt (greater than)', () => {
    const request = { firstname: { gt: 2.2 } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $gt: 2.2 } });
  });

  it('should convert in ($in)', () => {
    const request = { firstname: { in: ['trump', 'dumbo'] } };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ firstname: { $in: ['trump', 'dumbo'] } });
  });

  it('should convert or ($or)', () => {
    const request = { or: [{ firstname: { ne: 'dumbo' } }, { lastname: { eq: 'trump' } }] };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ $or: [{ firstname: { $ne: 'dumbo' } }, { lastname: 'trump' }] });
  });

  it('should convert and ($and)', () => {
    const request = { and: [{ firstname: { ne: 'dumbo' } }, { lastname: { eq: 'trump' } }] };
    const result = toMongooseFilterExpression(request);
    expect(result).toEqual({ $and: [{ firstname: { $ne: 'dumbo' } }, { lastname: 'trump' }] });
  });
});
