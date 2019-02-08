const redis = require('redis')

/* Initialize redis client. */
let redisClient = null

/* Initialize constants. */
const REDIS_PORTNUM = 6379
const REDIS_SERVER = '127.0.0.1'

module.exports = {
    /**
     * Initialize Redis Interface
     */
    async init(accountConfig, poolConfig, tokenInterface, pool_env) {
        this.initRedisStorage()

        console.log('Redis Interface initialization complete.')
    },
    /**
     * Initialize Redis Storage
     */
    async initRedisStorage() {
        /* Create redis client. */
        redisClient = redis.createClient(REDIS_PORTNUM, REDIS_SERVER)

        /* Initialize error handling. */
        redisClient.on('error', function (err) {
            console.log('Redis Storage Error:', err)
        })
    },
    /**
     * Retrieve Redis Client
     */
    getRedisClient() {
        return redisClient
    },
    /**
     * Retrieve Ethereum Block Number
     */
    async getEthBlockNumber() {
        let blockNum = parseInt(await this.loadRedisData('ethBlockNumber'))

        if (isNaN(blockNum) || blockNum < 1) {
            blockNum = 0
        }

        return blockNum
    },
    /**
     * Store Data
     *
     * NOTE: These make annoying console prints.
     */
    async storeRedisData(key, data) {
        return redisClient.set(key, JSON.stringify(data))
    },
    /**
     * Load Data
     *
     * NOTE: These make annoying console prints.
     */
    async loadRedisData(key) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.get(key, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                const response = JSON.parse(reply)

                fulfilled(response)
            })
        })
    },
    /**
     * Store Hash Data
     */
    async storeRedisHashData(key, hash, data) {
        return redisClient.hset(key, hash, data)
    },
    /**
     * Add to (Top of) List
     */
    async pushToRedisList(key, data) {
        return redisClient.lpush(key, data)
    },
    /**
     * Retrieve First List Item
     */
    async peekFirstFromRedisList(key) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.lindex(key, 0, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })
    },
    /**
     * Retrieve Last List Item
     */
    async peekLastFromRedisList(key) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.lindex(key, -1, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })
    },
    /**
     * Remove/return First List Item
     *
     * NOTE: Gets the last element of the array ! (most recent)
     */
    async popFirstFromRedisList(key) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.lpop(key, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })
    },
    async popLastFromRedisList(key) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.rpop(key, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })
    },
    async findHashInRedis(key, field) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.hget(key, field, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })
    },
    async deleteHashInRedis(key, field) {
        return new Promise(function (fulfilled, rejected) {
            redisClient.hdel(key, field, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })
    },
    /**
     * Retrieve ALL Keys for Hash
     */
    async getResultsOfKeyInRedis(key) {
        const results = await new Promise(function (fulfilled, rejected) {
            const array = []

            redisClient.hkeys(key, function (err, replies) {
                if (err) {
                    return rejected(err)
                }

                replies.forEach(function (item, i) {
                    // console.log("    " + i + ": " + item);
                    array.push(item)
                })

                fulfilled(array)
            })
        })

        return results
    },
    /**
     * Get Elements in List
     */
    async getElementsOfListInRedis(key) {
        const results = await new Promise(function (fulfilled, rejected) {
            const array = []

            // get first to last element
            redisClient.lrange(key, 0, -1, function (err, replies) {
                if (err) {
                    return rejected(err)
                }

                replies.forEach(function (item, i) {
                    // console.log("    " + i + ": " + item);
                    array.push(item)
                })

                fulfilled(array)
            })
        })

        return results
    },
    /**
     * Does Element Exist?
     */
    async isElementInRedisList(key, element) {
        const result = await new Promise(function (fulfilled, rejected) {
            // get all elements in the list
            redisClient.lrange(key, 0, -1, function (err, replies) {
                if (err) {
                    return rejected(err)
                }

                replies.forEach(function (item, i) {
                    if (item === element) {
                        fulfilled(true)
                    }
                })

                // FIXME Will this still get called??
                fulfilled(false)
            })
        })

        return result
    },
    /**
     * Remove from List to Limit
     */
    async removeFromRedisListToLimit(key, maxLimit) {
        const results = await new Promise(function (fulfilled, rejected) {
            const array = []

            // get first to last element
            redisClient.ltrim(key, 0, maxLimit, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })

        return results
    },
    /**
     * Drop List
     *
     * WARNING!!! DELETES A LIST
     */
    async dropList(key) {
        const results = await new Promise(function (fulfilled, rejected) {
            const array = []

            // get first to last element
            redisClient.ltrim(key, 1, 0, function (err, reply) {
                if (err) {
                    return rejected(err)
                }

                fulfilled(reply)
            })
        })

        return results
    },
    /**
     * Get Parsed Elements of a List
     *
     * NOTE: Does not use the limit !!!
     */
    async getParsedElementsOfListInRedis(key) {
        const results = await new Promise(function (fulfilled, rejected) {
            const array = []

            // get first to last element
            redisClient.lrange(key, 0, -1, function (err, replies) {
                if (err) {
                    return rejected(err)
                }

                replies.forEach(function (item, i) {
                    array.push(JSON.parse(item))
                })

                fulfilled(array)
            })
        })

        return results
    },
    /**
     * Get Recent Elements of a List
     */
    async getRecentElementsOfListInRedis(key, amount) {
        const results = await new Promise(function (fulfilled, rejected) {
            const array = []

            /* Retrieve first to last element. */
            redisClient.lrange(key, 0, (1 * amount), function (err, replies) {
                if (err) {
                    return rejected(err)
                }

                replies.forEach(function (item, i) {
                    // console.log("    " + i + ": " + item)
                    try {
                        array.push(JSON.parse(item))
                    } catch(err) {}
                })

                fulfilled(array)
            })
        })

        /* Return results. */
        return results
    }
}
