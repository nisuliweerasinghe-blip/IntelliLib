const mongoose = require('mongoose');

const connected = () => mongoose.connection.readyState === 1;

beforeAll(async () => {
  const uri = process.env.TEST_MONGO_URI;

  if (!uri) {
    throw new Error('TEST_MONGO_URI is not set, so tests/globalSetup.js did not pass the database address on.');
  }

  try {
    await mongoose.connect(uri, {
      dbName: `library_test_${process.env.JEST_WORKER_ID || 1}_${Date.now()}`,
      serverSelectionTimeoutMS: 15000
    });
  } catch (err) {
    throw new Error(`Could not connect to the test database at ${uri}\n${err.message}`);
  }

  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}, 60000);

afterEach(async () => {
  if (!connected()) return;

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  if (connected()) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});