module.exports = async () => {
  await globalThis.__REPLSET__.stop();
};