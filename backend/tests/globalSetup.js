const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({
    binary: { version: '7.0.14' },
    replSet: { count: 1 }
  });
  process.env.TEST_MONGO_URI = replSet.getUri();
  globalThis.__REPLSET__ = replSet;
};