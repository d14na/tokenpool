const cluster = require('cluster')
const fs = require('fs')
const Web3 = require('web3')

/* Initialize Minado endpoints. */
const INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/v3/97524564d982452caee95b257a54064e'
const INFURA_MAINNET_URL = 'https://mainnet.infura.io/v3/97524564d982452caee95b257a54064e'

const poolConfig = require('./pool.config').config
console.log(poolConfig)

const https_enabled = process.argv[2] === 'https'
let pool_env = 'production'

if (process.argv[2] === 'test') {
    pool_env = 'test'
}

if (process.argv[2] === 'staging') {
    pool_env = 'staging'
}

console.log('Initializing...')

const redisInterface = require('./lib/redis-interface')
const peerInterface = require('./lib/peer-interface')
const tokenInterface = require('./lib/token-interface')
const webInterface = require('./lib/web-interface')
const webServer =  require('./lib/web-server')
const diagnosticsManager =  require('./lib/diagnostics-manager')

let accountConfig = {}

const web3 = new Web3()

var specified_web3 = poolConfig.web3provider

if (specified_web3 !== null) {
    web3.setProvider(specified_web3)
    console.log('using web3',specified_web3)
}

if (pool_env == "test") {
    console.log("Using test mode!!! - Ropsten ")

    if(specified_web3 == null) {
        web3.setProvider(INFURA_ROPSTEN_URL)
    }

    accountConfig = require('./test.account.config').accounts
} else if (pool_env == "staging") {
    console.log("Using staging mode!!! - Mainnet ")

    if (specified_web3 == null) {
        web3.setProvider(INFURA_MAINNET_URL)
    }

    accountConfig = require('./account.config').accounts
} else {
    if (specified_web3 == null) {
        web3.setProvider(INFURA_MAINNET_URL)
    }

    accountConfig = require('./account.config').accounts
}

init(web3, 1)

async function init(web3, _numCpus) {
    // Code to run if we're in the master process
    if (cluster.isMaster) {
        // Count the machine's CPUs
        // var cpuCount = require('os').cpus().length;

        // Create a worker for each CPU
        for (let i = 0; i < _numCpus; i++) {
            cluster.fork()
        }
        // Code to run if we're in a worker process
    } else {
        let worker_id = cluster.worker.id

        await redisInterface.init()
        await tokenInterface.init(redisInterface, web3, accountConfig, poolConfig, pool_env)
        await peerInterface.init(web3, accountConfig, poolConfig, redisInterface, tokenInterface, pool_env) //initJSONRPCServer();

        //tokenInterface.update();

        // console.log(worker_id)
        // console.log('workid', 8999 + worker_id)

        // peerInterface.listenForJSONRPC(8999 + worker_id)

        peerInterface.listenForJSONRPC(8080)
    }
}
