'use strict';

const fp = require('fastify-plugin');
const { redisInitialise } = require('./redis');

const redisPlugin = async (app, options) => {
  try {
    const redis = await redisInitialise((data)=>{
      return data;
    }, options);
    app.decorate('redis', redis);
  } catch (e) {
    console.log(`Redis connection failed`);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
    throw Error(`Connection Failed ${e}`);
  }
};

module.exports = fp(redisPlugin);
