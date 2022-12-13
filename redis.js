// const Leader = require("../highAvailability/leader");
const Redis = require("ioredis");
const crypto = require("crypto");
const R = require("ramda");
const aes256 = require('aes256');

//constants defines the hashing algorithm
const appConstants = {
  "cryptoHashing": {
    "algorithm": "md5",
    "encodingType": "hex"
  },
  "querybuilder": {
    "limit": 50,
    "offset": 0,
    "maxSize": 1000,
    "minSize": 0
  },
  "loop_timeout": 10000
};

const ref = {};

// redis instance initialise based on role, cluster or single node
const redisInitialise = (next, options) => {
  try {
    if (!options) {
      return next(new Error(`Redis options cannnot be empty`))
    }   

    ref.redisPub = {};
    ref.ioredisConfigKue = {};
    let finalconfiguration = {};
    const redisinfo = options;
    if ((redisinfo.cluster && redisinfo.cluster === "true") && (redisinfo.sentinal && redisinfo.sentinal === "true") && redisinfo.hosts.length >= 1) {
      finalconfiguration = {
        sentinels: redisinfo.hosts,
        name: redisinfo.name,
        password: (!!redisinfo.password && redisinfo.password !== "null") ? redisinfo.password : null
      };

      if (redisinfo.role) {
        finalconfiguration.role = redisinfo.role;
      }
    } else if ((redisinfo.cluster && redisinfo.cluster === "true") && redisinfo.hosts.length >= 1) {
      finalconfiguration = redisinfo.hosts
    } else if (redisinfo.hosts.length >= 1) {
      finalconfiguration = {
        port: redisinfo.hosts[0].port, // Redis port
        host: redisinfo.hosts[0].host, // Redis host
        family: 4, // 4 (IPv4) or 6 (IPv6)
        password: (!!redisinfo.password && redisinfo.password !== "null") ? redisinfo.password : null,
        db: redisinfo.db
      };
    } else {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
      console.log('Redis Error: Invalid hosts');
      return next(new Error(`Redis Error: Invalid hosts`))
    }

    if (finalconfiguration) {
      if (redisinfo.cluster === "true" && (!redisinfo.sentinal || redisinfo.sentinal === "false")) {
        ref.redisPub = new Redis.Cluster(finalconfiguration, { redisOptions: { password: (!!redisinfo.password && redisinfo.password !== "null") ? redisinfo.password : null } });
        ref.redisSub = new Redis.Cluster(finalconfiguration, { redisOptions: { password: (!!redisinfo.password && redisinfo.password !== "null") ? redisinfo.password : null } });
        ref.rClient = new Redis.Cluster(finalconfiguration, { redisOptions: { password: (!!redisinfo.password && redisinfo.password !== "null") ? redisinfo.password : null } });
      } else {
        ref.redisPub = new Redis(finalconfiguration);
        ref.redisSub = new Redis(finalconfiguration);
        ref.rClient = new Redis(finalconfiguration);
      }
      ref.rClient.on("connect", () => {
        console.log("Redis connection has been established!");
      });
      ref.rClient.on("end", () => {
        console.log("Redis connection has been closed");
      });
      ref.rClient.on("reconnecting", () => {
        console.log("Redis is trying to re-connect");
      });
      ref.rClient.on("error", (error) => {
        console.log("Error while connecting to Redis!!!", error);
      });
      ref.rClient.on("+node", (data) => {
        console.log("node is connected", data);
      });
      ref.rClient.on("-node", (data) => {
        console.log("node is disconnected", data);
      });

      ref.redisPub.on("connect", () => {
        console.log("Redis connection has been established!");
      });
      ref.redisPub.on("end", () => {
        console.log("Redis connection has been closed");
      });
      ref.redisPub.on("reconnecting", () => {
        console.log("Redis is trying to re-connect");
      });
      ref.redisPub.on("error", (error) => {
        console.log("Error while connecting to Redis!!!", error);
      });
      ref.redisPub.on("+node", (data) => {
        console.log("node is connected", data);
      });
      ref.redisPub.on("-node", (data) => {
        console.log("node is disconnected", data);
      });

      ref.redisPub.on("connect", () => {
        console.log("Redis connection has been established!");
      });
      ref.redisPub.on("end", () => {
        console.log("Redis connection has been closed");
      });
      ref.redisPub.on("reconnecting", () => {
        console.log("Redis is trying to re-connect");
      });
      ref.redisPub.on("error", (error) => {
        console.log("Error while connecting to Redis!!!", error);
      });
      ref.redisPub.on("+node", (data) => {
        console.log("node is connected", data);
      });
      ref.redisPub.on("-node", (data) => {
        console.log("node is disconnected", data);
      });
      //Redis Node Subscribe
      ref.redisPub.subscribe("message", function (err, count) {
        console.log("Count is:::::::::::", { count: count })
      });
      ref.redisPub.on("message", function (channel, data, request = {}) {
        const leader = new Leader();
        data = JSON.parse(data)
        if (data.action === "ConnectorUpdateFromOtherPM" || data.action === "ConnectorDelete" || data.action === "ConnectionTemplateUpdate" || data.action === "vendorBroadcast") {
          leader.updateActionFromRedis(data, data.request)
        } else {
          //check leader and perform leader actions
          console.log("*****Data From Redis Subscribe", { data: data });
          leader.onPingToLeader(data.node)
        }
      });
      return next(ref);
    }
  } catch (e) {
    console.log(`Redis Error: ${e.stack}`, e);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
  return next(new Error(`Redis options cannnot be empty`))
}

//check if redis instance is available otherwise initialise new one
function createClient() {
  return new Promise((resolve, reject) => {
    try {
      if (ref && !ref.rClient) {
        if (finalconfiguration && Object.keys(finalconfiguration).length) {
          if (redisinfo.cluster === "true" && (!redisinfo.sentinal || redisinfo.sentinal === "false")) {
            ref.rClient = new Redis.Cluster(finalconfiguration, { redisOptions: { password: (!!redisinfo.password && redisinfo.password !== "null") ? redisinfo.password : null } });
          } else {
            ref.rClient = new Redis(finalconfiguration);
          }
          ref.rClient.on("error", function (err) {
            //logger.info("Redis Connection Error: ", err)
            reject({ "error": err })
          })
          ref.rClient.on("connect", function (connect) {
            // logger.info("Connection created")
            resolve(ref.rClient)
          })
        } else {
          reject({ "error": "Redis connection configuration missing" })
        }
      } else {
        resolve(ref.rClient)
      }
    } catch (error) {
      // logger.error("Redis Connection Error: ", error)
      reject({ "error": error })
    }
  })
}

//This @getCachingValue method is used for get the values for instance
function getCachingValue(keyObj, keyPattern) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        keyPattern = keyPattern || ""
        const encodingType = appConstants.cryptoHashing.encodingType
        try {
          keyObj = (keyObj) ? JSON.stringify(keyObj) : ""
        } catch (err) {
          //logger.error("Error in Redis getCache Value Error: ", err)
        }
        const hashString = crypto
          .createHash(appConstants.cryptoHashing.algorithm)
          .update(keyObj)
          .digest(encodingType)
        conn.get(keyPattern + hashString, function (err, data) {
          if (err) {
            //logger.error("Redis GetCache Value Error1: ", err)
            reject({ "error": err })
          }
          try {
            resolve(JSON.parse(data))
          } catch (err1) {
            resolve(data)
          }
        })
      }).catch(err => {
       // logger.error("Redis GetCache Value Error: ", err)
        reject({ "error": err })
      })

    } catch (error) {
      //logger.error("Redis GetCache Value Error: ", error)
      reject({ "error": error })
    }
  })
}

//summary: This @setCachingValue method is used for set the values into instance
function setCachingValue(keyObj, value, expiry, keyPattern) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        keyPattern = keyPattern || ""
        const encodingType = appConstants.cryptoHashing.encodingType
        try {
          value = JSON.stringify(value)
          keyObj = (keyObj) ? JSON.stringify(keyObj) : ""
        } catch (err) {
          //logger.error("Error in Redis setCache Value Error: ", err)
        }
        const hashString = crypto
          .createHash(appConstants.cryptoHashing.algorithm)
          .update(keyObj)
          .digest(encodingType)
        if (expiry) {
          // eslint-disable-next-line
          conn.setex(keyPattern + hashString, parseInt(expiry), value)
        } else {
          conn.set(keyPattern + hashString, value)
        }
        resolve("success")
      }).catch(error => {
        //logger.error("Redis setCache Value Error: ", error)
        reject({ "error": error })
      })
    } catch (error) {
      //logger.error("Redis setCaching Value error", error)
      reject({ "error": error })
    }
  })
}

//summary: This @flushData method is used for clearing the values from the redis instance
async function flushData(keyPattern) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        keyPattern = keyPattern ? "*" + keyPattern + "*" : "*"
        conn.keys(keyPattern, function (err, keys) {
          if (err) {
            //logger.error("Redis Error in Flush DataSet Data:", err)
            resolve({})
          }
          if (keys && keys.length > 0) {
            R.map((key) => {
              conn.del(key)
            }, keys)
          } else {
            resolve({ "error": "no keys found" })
          }
        })
      }).catch(error => {
        // logger.error("Redis flushData error", error)
        reject({ "error": error })
      })
    } catch (err) {
      // logger.error("Redis flushData error", err)
      reject({ "error": err })
    }
  })
}

//summary: This @flushDataByKey method is used for clearing the values by key
async function flushDataByKey(keyObj, keyPattern) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        keyPattern = keyPattern || ""
        const encodingType = appConstants.cryptoHashing.encodingType
        try {
          keyObj = (keyObj) ? JSON.stringify(keyObj) : ""
        } catch (err) {
          //logger.error("Error in Redis flushDataByKey Error: " + JSON.stringify(err))
        }
        const hashString = crypto
          .createHash(appConstants.cryptoHashing.algorithm)
          .update(keyObj)
          .digest(encodingType)
        keyPattern = keyPattern
        conn.del(keyPattern + hashString)
        resolve({})
      }).catch(error => {
        // logger.error("Redis flushDataByKey error", { "error": error });
        reject({ "error": error })
      })
    } catch (err) {
      //logger.error("Redis flushDataByKey error", { "error": err })
      reject({ "error": err })
    }
  })
}

//summary: @flushDataByEncodedKey method is used for clearing the values by encodedKey from the redis instance
async function flushDataByEncodedKey(key) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        conn.del(key)
        resolve({})
      }).catch(error => {
        //logger.error("Redis flushDataByEncodedKey error", { "error": error });
        reject({ "error": error })
      })
    } catch (err) {
      // logger.error("Redis flushDataByEncodedKey error", { "error": err })
      reject({ "error": err })
    }
  })
}

//summary: @getCacheKeys method is used for getting the stored keys
async function getCacheKeys(keyPattern) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        keyPattern = keyPattern ? "*" + keyPattern + "*" : "*"
        conn.keys(keyPattern, function (err, keys) {
          if (err) {
            //logger.error("Redis Error in getCache Keys Data:", err)
            resolve([])
          }
          resolve(keys)
        })
      }).catch(error => {
        // logger.error("Redis Error in getCache Keys Data:", error)
        resolve([])
      })
    } catch (err) {
      // logger.error("Redis Error in getCache Data:", err)
      resolve([])
    }
  })
}

//summary: @getCachingValueByEncodedKey method is used for getting the stored values by encoded keys
function getCachingValueByEncodedKey(key) {
  return new Promise((resolve, reject) => {
    try {
      createClient().then(conn => {
        conn.get(key, function (err, data) {
          if (err) {
            // logger.error("Redis GetCache Value Error1: ", err)
            reject({ "error": err })
          }
          try {
            resolve(JSON.parse(data))
          } catch (err1) {
            resolve(data)
          }
        })
      }).catch(err => {
        // logger.error("Redis GetCache Value Error: ", err)
        reject({ "error": err })
      })

    } catch (error) {
      // logger.error("Redis GetCache Value Error: ", error)
      reject({ "error": error })
    }
  })
}

//summary: @publishToRedis method is used for publishing data to redis
async function publishToRedis(data) {
  data = JSON.stringify(data)
  createClient().then(conn => {
    conn.publish("message", data).then(res => {
      // logger.info("publish message:::::::", res)
    }).catch(error => {
      // logger.error("error in publishing message:::::::", error)
    })
  }).catch(error => {
    // logger.error("Redis Error in createClient:", error)
  })
}

// RedisIO class instance call above all the methods
class RedisIO {
  constructor() {

  }

  async getCachedkeys(keyPattern) {
    try {
      return await getCacheKeys(keyPattern)
    } catch (error) {
      return { "error": error }
    }
  }

  async flushDataByKey(keyObj, keyPattern) {
    try {
      return await flushDataByKey(keyObj, keyPattern)
    } catch (error) {
      return { "error": error }
    }
  }

  async flushDataByKeyPattern(keyPattern) {
    try {
      return await flushData(keyPattern)
    } catch (error) {
      return { "error": error }
    }
  }

  async setCacheValue(keyObj, value, expiry, keyPattern) {
    try {
      return await setCachingValue(keyObj, value, expiry, keyPattern)
    } catch (error) {
      return { "error": error }
    }
  }

  async getCacheValue(keyObj, keyPattern) {
    try {
      return await getCachingValue(keyObj, keyPattern)
    } catch (error) {
      return { "error": error }
    }
  }
}

function close(qpredis) {
  return qpredis.redis.quit()
}

module.exports = { redisInitialise, createClient, getCachingValue, setCachingValue, flushData, flushDataByKey, flushDataByEncodedKey, getCacheKeys, getCachingValueByEncodedKey, publishToRedis };