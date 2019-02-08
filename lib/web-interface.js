const web3utils = require('web3-utils')
const pjson = require('../package.json')

module.exports = {
    async init(web3, accountConfig, poolConfig, redisInterface, testmode) {
        this.web3           = web3
        this.accountConfig  = accountConfig
        this.poolConfig     = poolConfig
        this.redisInterface = redisInterface
        this.testmode       = testmode
        this.poolVersion    = pjson.version

        console.log('Web Interface initialization complete.')
    },
    async getMinerBalancePayments(minerAddress, limitAmount) {
        const ethereumTransactions = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'balance_payments:' + minerAddress.toString(),
                limitAmount
            )

        return ethereumTransactions
    },
    async getPendingBalanceTransfers() {
        return

        const pending_transfers = []

        const payment_txes = await this.redisInterface
            .getResultsOfKeyInRedis('balance_payment')

        const currentEthBlock = await this.redisInterface
            .getEthBlockNumber()

        const REBROADCAST_WAIT_BLOCKS = 250

        for (let i in payment_txes) {
            const paymentId = payment_txes[i]

            const paymentDataJSON = await this.redisInterface
                .findHashInRedis('balance_payment', paymentId)
            const paymentData = JSON.parse(paymentDataJSON)

            const txDataJSON = await this.redisInterface
                .findHashInRedis('payment_tx', paymentId)
            const txData = JSON.parse(txDataJSON)

            const balanceTransferJSON = await this.redisInterface
                .findHashInRedis('balance_transfer', paymentId)
            const transferData = JSON.parse(balanceTransferJSON)

            if (balanceTransferJSON !== null && transferData.confirmed !== true) {
                pending_transfers.push(transferData)
            }
        }

        //  var ethereumTransactions = await this.redisInterface.getRecentElementsOfListInRedis(('balance_payments:'+minerAddress.toString()),limitAmount)

        return pending_transfers
    },
    async getMinerBalanceTransfers(minerAddress, limitAmount) {
        const ethereumTransactionList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'balance_transfers:' + minerAddress.toString(),
                limitAmount
            )

        return ethereumTransactionList
    },
    async getMinerSubmittedShares(minerAddress,limitAmount) {
        const sharesList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'miner_submitted_share:' + minerAddress.toString(),
                limitAmount
            )

        return sharesList
    },
    async getMinerRewards(minerAddress, limitAmount) {
        const sharesList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'miner_reward:' + minerAddress.toString(),
                limitAmount
            )

        return sharesList
    },
    async getMinerInvalidShares(minerAddress, limitAmount) {
        const sharesList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'miner_invalid_share:' + minerAddress.toString(),
                limitAmount
            )

        return sharesList
    },
    // most recent
    async getActiveTransactionData(limitAmount) {
        const ethereumTransactions = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'active_transactions_list', limitAmount)

        return ethereumTransactions
    },
    async getQueuedTransactionData(limitAmount) {
        const ethereumTransactionList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'queued_transactions', limitAmount)

        return ethereumTransactionList
    },
    async getQueuedReplacementPaymentData(limitAmount) {
        const ethereumTransactionList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'queued_replacement_payment', limitAmount)

        return ethereumTransactionList
    },
    async getUnconfirmedBroadcastedPaymentData(limitAmount) {
        const ethereumTransactionList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'unconfirmed_broadcasted_payment', limitAmount)

        return ethereumTransactionList
    },
    async getHashrateData(limitAmount) {
        const ethereumTransactionList = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'total_pool_hashrate', limitAmount)

        return ethereumTransactionList
    },
    async getSubmittedShares(limitAmount) {
        const existingShares = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'submitted_shares_list', limitAmount)

        return existingShares
    },
    async getSubmittedSolutions(limitAmount) {
        const existingSolutions = await this.redisInterface
            .getRecentElementsOfListInRedis(
                'submitted_solutions_list', limitAmount)

        return existingSolutions
    },
    getNetworkName() {
        if (this.testmode) {
            return 'TESTNET'
        }

        return 'MAINNET'
    },
    async getChallengeNumber() {
        return this.redisInterface.loadRedisData('challengeNumber')
    },
    async getBlockNumber() {
        return this.redisInterface.loadRedisData('ethBlockNumber')
    },
    async getPoolConfig() {
        /* Set pool configuration. */
        const poolConfig = this.poolConfig

        /* Set pool version. */
        const poolVersion = this.poolVersion

        /* Set account address. */
        const AccountAddress = this.accountConfig.address

        /* Return data. */
        return { poolConfig, poolVersion, AccountAddress }
    },
    async getPoolStats() {
        /* Set network type. */
        const networkType = this.getNetworkName()

        /* Return data. */
        return {
            networkType,
            ChallengeNumber          : await this.getChallengeNumber(),
            blockNumber              : await this.getBlockNumber(),
            TxQueued                 : await this.redisInterface.loadRedisData('queuedTxCount'),
            TxPending                : await this.redisInterface.loadRedisData('pendingTxCount'),
            TxMined                  : await this.redisInterface.loadRedisData('minedTxCount'),
            TxSuccess                : await this.redisInterface.loadRedisData('successTxCount'),
            lastRewardAmount         : 0,
            lastRewardEthBlockNumber : 0
        }
    }
}
