const cluster = require('cluster')
const Tx = require('ethereumjs-tx')
const web3Utils = require('web3-utils')

const tokenContractJSON = require('../app/assets/contracts/_0xBitcoinToken.json')
const deployedContractInfo = require('../app/assets/contracts/DeployedContractInfo.json')

const transactionCoordinator = require('./transaction-coordinator')

/**
BUG : pool is resending transactions!
**/

module.exports =  {
    async init(
        redisInterface,
        web3,
        accountConfig,
        poolConfig,
        pool_env
    ) {
        this.redisInterface     = redisInterface
        this.web3               = web3
        this.pool_env           = pool_env
        this.poolConfig         = poolConfig
        this.accountConfig      = accountConfig
        this.tokenContract      = new web3.eth.Contract(tokenContractJSON.abi, this.getTokenContractAddress())

        if (cluster.isMaster) {
            this.redisInterface.dropList('recent_challenges')
            // load up the list with 5 blank entries ... saves having to always check the size
            // of the list later.
            this.redisInterface.pushToRedisList('recent_challenges', ['-', '-', '-', '-', '-'])
        }

        console.log('Token Interface initialization complete.')
    },
    async update() {
        /* Localize this. */
        const self = this

        //reply ok
        transactionCoordinator.init(
            this.web3,
            this.tokenContract,
            this.poolConfig,
            this.accountConfig,
            this.redisInterface,
            this
        )

        await self.collectTokenParameters()

        setInterval(function () {
            self.collectTokenParameters()
        }, 2000)

        setTimeout(function () {
            self.queueTokenTransfersForBalances()
        }, 0)
    },
    async getPoolChallengeNumber() {
        return await this.redisInterface
            .loadRedisData('challengeNumber')
    },
    async getPoolDifficultyTarget() {
        return targetString = await this.redisInterface
            .loadRedisData('miningTarget')
    },
    async getPoolDifficulty() {
        return await this.redisInterface
            .loadRedisData('miningDifficulty')
    },
    async collectTokenParameters( ) {
        const miningDifficultyString = await this.tokenContract.methods
            .getMiningDifficulty().call()
        const miningDifficulty = parseInt(miningDifficultyString)

        const miningTargetString = await this.tokenContract.methods
            .getMiningTarget().call()
        const miningTarget = web3Utils.toBN(miningTargetString)

        const challengeNumber = await this.tokenContract.methods
            .getChallengeNumber().call()

        if (challengeNumber !== this.challengeNumber) {
            // check if we've seen this challenge before
            const seenBefore = await this.redisInterface
                .isElementInRedisList('recent_challenges', challengeNumber)

            if (!seenBefore) {
                this.challengeNumber = challengeNumber

                console.log('New challenge:', challengeNumber)

                this.redisInterface.pushToRedisList('recent_challenges', challengeNumber)
                this.redisInterface.popLastFromRedisList('recent_challenges')
                this.redisInterface.storeRedisData('challengeNumber', challengeNumber)
            } else {
                //console.log('Old challenge:', challengeNumber)
            }
        }

        this.miningDifficulty = miningDifficulty
        this.difficultyTarget = miningTarget

        this.redisInterface.storeRedisData('miningDifficulty', miningDifficulty)
        this.redisInterface.storeRedisData('miningTarget', miningTarget.toString())

        const web3 = this.web3

        const ethBlockNumber = await new Promise(function (fulfilled, error) {
            web3.eth.getBlockNumber(function (err, result) {
                if (err) {
                    return error(err)
                }

                return fulfilled(result)
            })
        })

        this.redisInterface.storeRedisData('ethBlockNumber', ethBlockNumber )
    },
    async getEthBlockNumber() {
        let result = parseInt(await this.redisInterface
            .loadRedisData('ethBlockNumber'))

        if (isNaN(result) || result < 1) {
            result = 0
        }

        return result
    },
    getTokenContractAddress() {
        if (this.pool_env === 'test') {
            return deployedContractInfo
                .networks.testnet.contracts._0xbitcointoken.blockchain_address
        } else if (this.pool_env === 'staging') {
            return deployedContractInfo
                .networks.staging.contracts._0xbitcointoken.blockchain_address
        } else {
            return deployedContractInfo
                .networks.mainnet.contracts._0xbitcointoken.blockchain_address
        }
    },
    //use address from ?
    async queueMiningSolution(
        solution_number,
        minerEthAddress,
        challenge_digest,
        challenge_number
    ) {
        const currentTokenMiningReward =
            await this.requestCurrentTokenMiningReward()

        const txData = {
            minerEthAddress  : minerEthAddress, // we use this differently in the pool!
            solution_number  : solution_number,
            challenge_digest : challenge_digest,
            challenge_number : challenge_number,
            tokenReward      : currentTokenMiningReward
        }

        await transactionCoordinator.addTransactionToQueue('solution', txData)
    },
    //minerEthAddress
    async queueTokenTransfer(addressTo, tokenAmount, balancePaymentId) {
        const txData = { addressTo, tokenAmount, balancePaymentId }

        // await transactionCoordinator.addTransactionToQueue('transfer',txData)
    },
    async queueTokenTransfersForBalances() {
        return // XXX kill token balance transfers
    },
    async saveMinerRewardToRedis(minerEthAddress, rewardData) {
        this.redisInterface.pushToRedisList(
            'miner_reward:' + minerEthAddress,
            JSON.stringify(rewardData)
        )
    },
    async saveMinerDataToRedis(minerEthAddress, minerData) {
        this.redisInterface.storeRedisHashData(
            'miner_data',
            minerEthAddress,
            JSON.stringify(minerData)
        )
    },
    async getMinerData(minerEthAddress) {
        const minerDataJSON = await this.redisInterface
            .findHashInRedis('miner_data', minerEthAddress)

        return JSON.parse(minerDataJSON)
    },
    //copied from peer
    async getMinerList() {
        return await this.redisInterface
            .getResultsOfKeyInRedis('miner_data')
    },
    async requestCurrentTokenMiningReward() {
        /* Localize this. */
        const self = this

        var reward_amount = new Promise(function (fulfilled, error) {
            self.tokenContract.methods.getMiningReward().call(function (err, result) {
                if (err) {
                    return error(err)
                }

                fulfilled(result)
            })
        })

        return reward_amount
    }
}
