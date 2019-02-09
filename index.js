const cluster = require('cluster')
const fs = require('fs')

/* Initialize Minado endpoints. */
const INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/v3/97524564d982452caee95b257a54064e'
const INFURA_MAINNET_URL = 'https://mainnet.infura.io/v3/97524564d982452caee95b257a54064e'

const https_enabled = process.argv[2] === 'https'

/* Initialize pool environment. */
let pool_env = 'production'

if (process.argv[2] === 'test') {
    pool_env = 'test'
} else if (process.argv[2] === 'staging' ) {
    pool_env = 'staging'
}

const poolConfig = require('./pool.config').config

console.log('\nPool Configuration\n', JSON.stringify(poolConfig, null, 4))
console.log('\nInitializing...')

/* Initialize interfaces. */
const redisInterface = require('./lib/redis-interface')
const peerInterface  = require('./lib/peer-interface')
const tokenInterface = require('./lib/token-interface')
const webInterface   = require('./lib/web-interface')

/* Initialize web server. */
const webServer = require('./lib/web-server')

/* Initialize diagnostics manager. */
const diagnosticsManager = require('./lib/diagnostics-manager')

/* Initialize Web3. */
const Web3 = require('web3')

/* Initialize new Web3 instance. */
const web3 = new Web3()

/* Initialize account configuration. */
let accountConfig = {}

/* Initialize web3 provider. */
const specified_web3 = poolConfig.web3provider || null

/* Validate web3 provider. */
if (specified_web3 !== null) {
    web3.setProvider(specified_web3)

    console.log(`Connecting to CONFIG Web3 Provider [ ${specified_web3} ]`)
}

if (pool_env === 'test') {
    console.log('RUNNING IN TEST MODE [ ROPSTEN ]', specified_web3)

    /* Validate web3 provider. */
    if (specified_web3 === null) {
        web3.setProvider(INFURA_ROPSTEN_URL)
    }

    /* Set accounts. */
    accountConfig = require('./test.account.config').accounts
} else if (pool_env == 'staging') {
    console.log('RUNNING IN STAGING MODE [ MAINNET ]', specified_web3)

    /* Validate web3 provider. */
    if (specified_web3 === null) {
        web3.setProvider(INFURA_MAINNET_URL)
    }

    /* Set accounts. */
    accountConfig = require('./account.config').accounts
} else {
    console.log('RUNNING IN DEFAULT MODE [ MAINNET ]', specified_web3)

    /* Validate web3 provider. */
    if (specified_web3 === null) {
        web3.setProvider(INFURA_MAINNET_URL)
    }

    /* Set accounts. */
    accountConfig = require('./account.config').accounts
}

init(web3, 1)

/**
 * Init
 *
 * Create a Master Cluster with worker nodes.
 */
async function init(_web3, _numCpus) {
    // Code to run if we're in the master process

    if (cluster.isMaster) {
        // Create a worker for each CPU
        for (let i = 0; i < _numCpus; i++) {
            cluster.fork()
        }

        /* Initialize redis interface. */
        await redisInterface.init()

        /* Initialize web interface. */
        // NOTE: This is for the MASTER ONLY
        await webInterface.init(
            _web3,
            accountConfig,
            poolConfig,
            redisInterface
        )

        /* Initialize token interface. */
        await tokenInterface.init(
            redisInterface,
            _web3,
            accountConfig,
            poolConfig,
            pool_env
        )

        /* Initialize peer interface. */
        await peerInterface.init(
            _web3,
            accountConfig,
            poolConfig,
            redisInterface,
            tokenInterface,
            pool_env
        ) // initJSONRPCServer()

        /* Initialize diagnostics manager. */
        // NOTE: This is for the MASTER ONLY
        await diagnosticsManager.init(
            redisInterface,
            webInterface,
            peerInterface
        )

        /* Initialize the web server. */
        // NOTE: This is for the MASTER ONLY
        await webServer.init(
            https_enabled,
            webInterface,
            peerInterface
        )

        /* Update token interface. */
        // NOTE: Previously missing, but fails on redis.
        tokenInterface.update()

        /* Update peer interface. */
        peerInterface.update()
    } else {
        // Code to run if we're in a worker process

        // NOTE: Used to split the workload between workers.
        //       eg. updater | jsonlistener
        const worker_id = cluster.worker.id

        /* Initialize redis interface. */
        await redisInterface.init()

        /* Initialize token interface. */
        await tokenInterface.init(
            redisInterface,
            _web3,
            accountConfig,
            poolConfig,
            pool_env
        )

        /* Initialize peer interface. */
        await peerInterface.init(
            _web3,
            accountConfig,
            poolConfig,
            redisInterface,
            tokenInterface,
            pool_env
        ) // initJSONRPCServer()

        /* Initialize redis interface. */
        // FIXME: Why are we doing this twice??
        // await redisInterface.init()

        /* Initialize token interface. */
        // FIXME: Why are we doing this twice??
        // await tokenInterface.init(
        //     redisInterface,
        //     _web3,
        //     accountConfig,
        //     poolConfig,
        //     pool_env
        // )

        /* Start peer interface listener. */
        peerInterface.listenForJSONRPC(8080)

        /* Update token interface. */
        tokenInterface.update()

        /* Update peer interface. */
        peerInterface.update()
    }
}
