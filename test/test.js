const assert = require('assert')
const Web3 = require('web3')
const web3utils = require('web3-utils')

const renderUtils = require('../app/assets/javascripts/render-utils')

const tokenInterface = require('../lib/token-interface')
const peerInterface = require('../lib/peer-interface')
const redisInterface = require('../lib/redis-interface')

const poolConfig = require('../pool.config').config

const accountConfig = require('../test.account.config').account

const INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/v3/97524564d982452caee95b257a54064e'

const web3 = new Web3()

describe('Peer Interface', function() {
    describe('Estimate Share Hashrate', function () {
        it('Should return a good hashrate', function () {
            assert.equal(
                peerInterface.getEstimatedShareHashrate(30000, 50),
                2516582400
            )
        })
    })

    describe('Estimate Miner Vardiff', function () {
        it('Should return a good vardiff', async function () {
            const test_mode = true

            web3.setProvider(INFURA_ROPSTEN_URL)

            redisInterface.init(
                accountConfig,
                poolConfig,
                tokenInterface,
                test_mode
            )

            peerInterface.init(
                web3,
                accountConfig,
                poolConfig,
                redisInterface,
                tokenInterface,
                test_mode
            )

            const testMinerAddress = '0x00000000000000000000000000000000'
            const testMinerData = {
                varDiff: 205
            }

            const newVarDiff = await peerInterface
                .getUpdatedVarDiffForMiner(testMinerData, testMinerAddress)

            assert.equal(newVarDiff, 205)
        })
    })

    describe('Estimate Total Hashrate', function () {
        // await this.redisInterface.dropList('total_pool_hashrate')
    })

    describe('Format Token Quantity', function () {
        it('Should format token quantity', function () {
            assert.equal(renderUtils.formatTokenQuantity(102312342), '1.02312342')
        })
    })
})
