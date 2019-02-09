/*
Turns queued ethereum transaction into actual ones :)
Waits for pending TX to be mined before sending another !
Solutions are highest priority

KEY
queued - transaction not broadcasted yet
pending - transaction broadcasted but not mined
mined - transaction mined !
successful - transaction mined and not reverted
*/

const cluster = require('cluster')
const Tx = require('ethereumjs-tx')
const web3Utils = require('web3-utils')

/* Initialize constants. */
const BROADCAST_DELAY = 1000

/* Initialize last rebroadcast block. */
let lastRebroadcastBlock = 0

module.exports =  {
    async init(
        web3,
        tokenContract,
        poolConfig,
        accountConfig,
        redisInterface,
        tokenInterface
    ) {
        this.web3           = web3
        this.redisInterface = redisInterface
        this.tokenContract  = tokenContract
        this.tokenInterface = tokenInterface
        this.accountConfig  = accountConfig
        this.poolConfig     = poolConfig

        /* Localize this. */
        const self = this

        setTimeout(function () {
            self.broadcastQueuedTransactions()
            self.updateBroadcastedTransactionStatus()
        }, BROADCAST_DELAY)
    },
    async getEthBlockNumber() {
        /* Localize this. */
        const self = this

        let blockNum = parseInt(
            await self.redisInterface.loadRedisData('ethBlockNumber'))

        if (isNaN(blockNum) || blockNum < 1) {
            blockNum = 0
        }

        return blockNum
    },
    // types are 'transfer', 'solution'
    async addTransactionToQueue(txType, txData) {
        // add to redis
        const receiptData = {
            queued  : true,
            pending : false,
            mined   : false,
            success : false,
        }

        const blockNum = await this.getEthBlockNumber()

        const packetData = {
            block       : blockNum,
            txType      : txType,
            txData      : txData,
            receiptData : receiptData
        }

        console.log('\n\n')

        console.log('addTransactionToQueue', packetData)

        await this.redisInterface.pushToRedisList(
            'queued_transactions', JSON.stringify(packetData))
    },
    async markTransactionAsLost(tx_hash, packetData) {
        console.log('Mark transaction as lost !!!!')

        await this.redisInterface.pushToRedisList(
            'lost_transactions_list', JSON.stringify(packetData))

        const packetDataJSON = await this.redisInterface.findHashInRedis(
            'active_transactions', tx_hash)

        packetData = JSON.parse(packetDataJSON)

        packetData.receiptData = { // lost
            queued  : false,
            pending : false,
            mined   : false,
            success : false,
            lost    : true
        }

        // resave
        await this.storeEthereumTransaction(tx_hash, packetData)
    },
    // broadcasted to the network
    async storeEthereumTransaction(tx_hash, packetData) {
        console.log('Storing data about eth tx ', tx_hash, packetData)

        await this.redisInterface.storeRedisHashData(
            'active_transactions', tx_hash, JSON.stringify(packetData))

        const listPacketData = packetData

        /* Add tx hash to packet data (list). */
        listPacketData.txHash = tx_hash

        await this.redisInterface.pushToRedisList(
            'active_transactions_list', JSON.stringify(listPacketData))

        // const ethereumTransactionHashes = await this.redisInterface
        //     .getResultsOfKeyInRedis('active_transactions')
        //
        // for (let i in ethereumTransactionHashes) {
        //     let txHash = ethereumTransactionHashes[i]
        //
        //     if (txHash === false) {
        //         exit() //emergency kill switch to debug
        //     }
        // }

        return true
    },
    async getPacketReceiptDataFromWeb3Receipt(liveTransactionReceipt) {
        const mined = (liveTransactionReceipt !== null)

        let success = false

        if (mined) {
            const val_to_check = liveTransactionReceipt.status

            if (val_to_check === true) {
                val_to_check = '0x1'
            } else if (val_to_check === false) {
                val_to_check = '0x0';
            } else {
                val_to_check = liveTransactionReceipt.status // FIXME Why is this here??
            }

            success = (web3Utils.hexToNumber(val_to_check) === 1)
        }

        const receiptData = {
            queued  : false,
            pending : !mined,
            mined, success
        }

        return receiptData
    },
    /*
    get current eth block
    find all the unbroadcasted eth transactions older than 1000 blocks
    check to see if theres a receipt yet - if there is one, pop + mark confirmed
    If there is not a receipt yet, build a new queuedTX  --
    */

    /*
    This may have a bug in which tons of pending tx all go to queued.... which is bad.
    */
    async broadcastQueuedTransactions() {
        /* Localize this. */
        const self = this

        // .queuedCount .pendingCount  .minedCount
        const transactionStats = await this.getTransactionStatistics()

        let hasPendingTransaction = true

        const nextQueuedTransactionDataJSON = await this.redisInterface
            .peekFirstFromRedisList('queued_transactions')

        const nextQueuedTransactionData = JSON.parse(
            nextQueuedTransactionDataJSON)

        if (
            nextQueuedTransactionData !== null &&
            nextQueuedTransactionData.txType === 'transfer'
        ) {
            hasPendingTransaction = (transactionStats.pendingPaymentsCount > 0)
        }

        if (
            nextQueuedTransactionData !== null &&
            nextQueuedTransactionData.txType === 'solution'
        ) {
            hasPendingTransaction = (transactionStats.pendingMintsCount > 0)
        }

        const hasQueuedTransaction = (transactionStats.queuedCount > 0)

        if (hasQueuedTransaction && !hasPendingTransaction) {
            try {
                const nextQueuedTransactionData = await this.redisInterface
                    .popFirstFromRedisList('queued_transactions')

                console.log('nextQueuedTransactionData', nextQueuedTransactionData)

                nextQueuedTransaction = JSON.parse(nextQueuedTransactionData)

                const successful_broadcast = await this.broadcastTransaction(
                    nextQueuedTransaction, false)

                if (!successful_broadcast) {
                    console.error('Unsuccessful broadcast!!')

                    // this is putting in a bad entry !! like 'true '
                    // await this.redisInterface.pushToRedisList('queued_transactions',nextQueuedTransactionData)
                }
            } catch (e) {
                console.log('error', e)
            }
        }

        setTimeout(
            function () {
                self.broadcastQueuedTransactions()
            }, BROADCAST_DELAY
        )
    },
    async updateLastBroadcastDataForTx(txHash, broadcastData) {
        let broadcastAtBlock = null
        let accountTxNonce = null
    },
    async broadcastTransaction(transactionPacketData, resending) {
        const receiptData = transactionPacketData.receiptData
        const txData = transactionPacketData.txData
        const txType = transactionPacketData.txType

        console.log('\n')
        console.log('\n')
        console.log('---- broadcast transaction ---', txType, txData)

        let tx_hash = null

        if (txType === 'transfer') {
            return false

            const addressFrom = this.getPaymentAccount().address

            if (txData === null || txData.addressTo === addressFrom) {
                console.log('Can\'t send transfer to self!!')

                return false
            }

            tx_hash = await this.transferTokensFromPool(
                txData.addressTo,
                txData.tokenAmount,
                txData.balancePaymentId,
                resending
            )
        } else if (txType === 'solution') {
            const currentChallengeNumber = await this.requestCurrentChallengeNumber()

            if (
                txData === null ||
                currentChallengeNumber !== txData.challenge_number
            ) {
                console.log(
                    'Stale challenge number! Not submitting solution to contract.')

                // return false
            }

            const submitted_solution = await this.submitMiningSolution(
                txData.minerEthAddress,
                txData.solution_number,
                txData.challenge_digest,
                txData.challenge_number,
                resending
            )

            console.log('submitted_solution', submitted_solution)

            tx_hash = submitted_solution['tx_hash']

            const merge_mining_addresses = submitted_solution['merge_mining_addresses']
        } else {
            console.error('Invalid tx type!', txType)

            return false
        }

        if (tx_hash === null) {
            console.error('Tx not broadcast successfully', txType, txData )

            ///Store new transfer data with a null tx_hash  which we will pick up later and then grab a receipt for !!!
            if (txType === 'transfer') {
                await this.storeNewSubmittedTransferData(
                    null,
                    txData.addressTo,
                    txData.balancePaymentId,
                    txData.tokenAmount
                )
            }

            return false
        } else {
            console.log('broadcasted transaction ->', tx_hash, txType, txData)

            if (txType === 'solution') {
                await this.storeNewSubmittedSolutionTransactionHash(
                    tx_hash,
                    txData.tokenReward,
                    txData.minerEthAddress,
                    txData.challenge_number,
                    merge_mining_addresses
                )
            }

            if (txType === 'transfer') {
                await this.storeNewSubmittedTransferData(
                    tx_hash,
                    txData.addressTo,
                    txData.balancePaymentId,
                    txData.tokenAmount
                )
            }

            transactionPacketData.receiptData = {
                queued  : false,
                pending : true,
                mined   : false,
                success : false,
            }

            // resave
            var storage_success = await this.storeEthereumTransaction(
                tx_hash, transactionPacketData)

            return true
        }
    },
    async updateBroadcastedTransactionStatus() {
        /* Localize this. */
        const self = this

        try {
            const ethereumTransactionHashes = await this.redisInterface
                .getResultsOfKeyInRedis('active_transactions')

            for (let i in ethereumTransactionHashes) {
                let txHash = ethereumTransactionHashes[i]

                let packetDataJSON = await this.redisInterface
                    .findHashInRedis('active_transactions', txHash)

                let packetData = JSON.parse(packetDataJSON)

                if (
                    packetData.receiptData.mined === false &&
                    packetData.receiptData.lost !== true
                ) {
                    var txResponse = await this.requestTransactionData(txHash)

                    var receipt = await this.requestTransactionReceipt(txHash)

                    if (txResponse !== null) {
                        var isPending = (txResponse.transactionIndex !== null)
                    }

                    if (receipt !== null) {
                        packetData.receiptData =
                            await this.getPacketReceiptDataFromWeb3Receipt(receipt)

                        await this.storeEthereumTransaction(
                            txHash, packetData)
                    } else {
                        var current_block = await this.getEthBlockNumber()

                        var pending_block = packetData.block

                        var LOST_TX_BLOCK_COUNT = 50

                        // rebroadcast
                        if (
                            current_block - pending_block > LOST_TX_BLOCK_COUNT &&
                            pending_block > 0
                        ) {
                            lastRebroadcastBlock = current_block

                            await this.markTransactionAsLost(txHash, packetData)
                        }
                    }
                }
            }
        } catch (e) {
            //console.log('error',e)
        }

        setTimeout(
            function () {
                self.updateBroadcastedTransactionStatus()
            }, 2000
        )
    },
    async getTransactionStatistics() {
        let pendingCount         = 0
        let queuedCount          = 0
        let minedCount           = 0
        let successCount         = 0
        let pendingMintsCount    = 0
        let pendingPaymentsCount = 0

        const queuedTransactions = await this.redisInterface
            .getElementsOfListInRedis('queued_transactions')

        const ethereumTransactionHashes = await this.redisInterface
            .getResultsOfKeyInRedis('active_transactions')

        const ethereumTransactions = []

        for (let i in ethereumTransactionHashes) {
            const hash = ethereumTransactionHashes[i]
            //  console.log( 'hash',hash)
            ethereumTransactions.push(
                await this.redisInterface
                    .findHashInRedis('active_transactions', hash)
            )
        }

        const transactionPacketsData = []

        queuedTransactions.map(
            item => transactionPacketsData.push(JSON.parse(item))
        )

        ethereumTransactions.map(
            item => transactionPacketsData.push(JSON.parse(item))
        )

        // console.log('transactionPacketsData',transactionPacketsData)

        transactionPacketsData.map(function (item) {
            //  console.log('item',item)

            const receiptData = item.receiptData

            if (receiptData.pending) {
                pendingCount++

                if (item.txType === 'transfer') {
                    pendingPaymentsCount++
                }

                if (item.txType === 'solution') {
                    pendingMintsCount++
                }
            }

            if (receiptData.queued) queuedCount++
            if (receiptData.mined) minedCount++
            if (receiptData.success) successCount++
        })

        await this.redisInterface.storeRedisData('queuedTxCount', queuedCount)
        await this.redisInterface.storeRedisData('pendingTxCount', pendingCount)
        await this.redisInterface.storeRedisData('minedTxCount', minedCount)
        await this.redisInterface.storeRedisData('successTxCount', successCount)
        await this.redisInterface.storeRedisData('pendingMintsCount', pendingMintsCount)
        await this.redisInterface.storeRedisData('pendingPaymentsCount', pendingPaymentsCount)

        const stats = {
            queuedCount          : queuedCount,
            pendingCount         : pendingCount,
            minedCount           : minedCount,
            successCount         : successCount,
            pendingMintsCount    : pendingMintsCount,
            pendingPaymentsCount : pendingPaymentsCount
        }

        return stats
    },
    async requestTransactionData(tx_hash) {
        const data = await this.web3.eth.getTransaction(tx_hash)

        return data
    },
    async requestTransactionReceipt(tx_hash) {
        const receipt = await this.web3.eth.getTransactionReceipt(tx_hash)

        return receipt
    },
    //required for balance payouts
    async storeNewSubmittedSolutionTransactionHash(
        tx_hash,
        tokensAwarded,
        minerEthAddress,
        challengeNumber,
        merge_mining_addresses
    ) {
        const block = await this.getEthBlockNumber()

        const txData = {
            block,
            tx_hash,
            minerEthAddress,
            challengeNumber,
            mined                   : false, // completed being mined ?
            succeeded               : false,
            token_quantity_rewarded : tokensAwarded,
            merge_mining_addresses,
            rewarded                : false // did we win the reward of 50 tokens ?
        }

        console.log('Storing submitted solution data', txData)

        this.redisInterface
            .storeRedisHashData(
                'unconfirmed_submitted_solution_tx',
                tx_hash,
                JSON.stringify(txData)
            )
    },
    /*
        This method is deprecated as it cannot handle TX that fail to broadcast
      */
    async storeNewSubmittedTransferData(
        txHash,
        addressTo,
        balancePaymentId,
        tokenAmount
    ) {
        const block = await this.getEthBlockNumber()

        /* Set confirmed. */
        const confirmed = false

        const balanceTransferData = {
            addressTo,
            balancePaymentId,
            tokenAmount,
            txHash,
            block,
            confirmed
        }

        console.log(
            'Storing new submitted transfer data',
            ('balance_transfers:' + addressTo.toString()),
            balanceTransferData
        )

        // helps audit payouts
        // this guy never gets updated and so should not be used
        await this.redisInterface
            .pushToRedisList(
                'balance_transfers:' + addressTo.toString(),
                JSON.stringify(balanceTransferData)
            )

        await this.redisInterface
            .storeRedisHashData(
                'balance_transfer',
                balancePaymentId,
                JSON.stringify(balanceTransferData)
            )
    },
    // miner address
    async transferTokensFromPool(
        ethMinerAddress,
        amount,
        balancePaymentId,
        resending
    ) {
        const addressTo = this.tokenContract.options.address
        const addressFrom = this.getPaymentAccount().address
        const transferMethod = this.tokenContract.methods.transfer(
            addressTo, amount)

        // save data
        const ethBlock = await this.getEthBlockNumber()

        const paymentConfirmed =
            await this.getBalanceTransferConfirmed(balancePaymentId)

        // these will be use used to make sure that all transactions get confirmed

        if (paymentConfirmed) return

        try {
            const txCount = await this.web3.eth.getTransactionCount(addressFrom)

            console.log('txCount', txCount)
        } catch (error) { // here goes if someAsyncPromise() rejected}
            console.log(error)

            return error    //this will result in a resolved promise.
        }

        const txData = this.web3.eth.abi.encodeFunctionCall({
            name: 'transfer',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'to'
            }, {
                type: 'uint256',
                name: 'tokens'
            }]
        }, [
            ethMinerAddress,
            amount
        ])

        // FIXME Research maximum gas cost
        const max_gas_cost = 1704624

        var estimatedGasCost = await transferMethod.estimateGas({
            gas  : max_gas_cost,
            from : addressFrom,
            to   : addressTo
        })

        if (estimatedGasCost > max_gas_cost) {
            return console.log('Gas estimate too high!  Something went wrong')
        }

        const force_revert = false

        if (force_revert) {
            txCount = 9999
        }

        const txOptions = {
            nonce    : web3Utils.toHex(txCount),
            gas      : web3Utils.toHex(1704624),
            gasPrice : web3Utils.toHex(web3Utils.toWei(this.poolConfig.transferGasPriceWei.toString(), 'gwei')),
            value    : 0,
            to       : addressTo,
            from     : addressFrom,
            data     : txData
        }

        const privateKey = this.getPaymentAccount().privateKey

        return new Promise(function (result, error) {
            this.sendSignedRawTransaction(this.web3, txOptions, addressFrom, privateKey, function (err, res) {
                if (err) error(err)

                result(res)
            })
        }.bind(this))
    },
    async getBalanceTransferConfirmed(paymentId) {
        //check balance payment

        const balanceTransferJSON = await this.redisInterface
            .findHashInRedis('balance_transfer', paymentId)

        const balanceTransfer = JSON.parse(balanceTransferJSON)

        if (balanceTransferJSON === null || balanceTransfer.txHash === null) {
            return false
        } else {
            // dont need to check receipt because we wait many blocks
            // between broadcasts - enough time for the monitor to populate
            // this data correctly
            return balanceTransfer.confirmed
        }
    },
    async submitMiningSolution(
        minerAddress,
        solution_number,
        challenge_digest,
        challenge_number,
        resending
    ) {
        const ret = {}

        ret['merge_mining_addresses'] = []
        ret['tx_hash'] = null

        const addressFrom = this.getMintingAccount().address

        console.log('\n')
        console.log('---Submitting solution for reward---')
        console.log('nonce', solution_number)
        console.log('challenge_number', challenge_number)
        console.log('challenge_digest', mchallenge_digest)
        console.log('\n' )

        try {
            const txCount = await this.web3.eth.getTransactionCount(addressFrom)

            console.log('txCount', txCount)
        } catch (error) { // here goes if someAsyncPromise() rejected}
            console.log('error', error)

            ret['tx_hash'] = error

            return ret // this will result in a resolved promise.
        }

        // FIXME Create a MintHelper
        const addressTo = '0x399c0fA056E3cF7aeC4A9E0BDa47Ee014DE3a5F0'

        const max_gas_cost = 1704624

        const activeMergeMintTokens =
            await this.getWorkingMergeMintAccounts(
                solution_number,
                challenge_digest,
                max_gas_cost,
                addressFrom,
                addressTo
            )

        ret['merge_mining_addresses'] = activeMergeMintTokens

        try {
            const txData = this.web3.eth.abi.encodeFunctionCall({
                name   : 'proxyMergeMint',
                type   : 'function',
                inputs : [{
                    type: 'uint256',
                    name: 'nonce'
                }, {
                    type: 'bytes32',
                    name: 'challenge_digest'
                }, {
                    type:'address[]',
                    name:'tokens'
                }]
            }, [
                solution_number,
                challenge_digest,
                activeMergeMintTokens
            ])

            console.log('ok starting')

            const estimatedGasCost = await mintMethod.estimateGas({
                gas  : max_gas_cost,
                from : addressFrom,
                to   : addressTo
            })

            console.log('got gas estimate', estimatedGasCost)

            estimatedGasCost = estimatedGasCost * 1.2.toFixed(0)

            console.log('making it bigger gas estimate', estimatedGasCost)

            estimatedGasCost = Math.max(estimatedGasCost, 305830)
        } catch (error) {  //here goes if someAsyncPromise() rejected}
            console.log('error', error)
        }

        console.log('estimatedGasCost', estimatedGasCost)
        console.log('txData', txData)

        console.log('addressFrom', addressFrom)
        console.log('addressTo', addressTo)

        if (estimatedGasCost > max_gas_cost) {
            console.log('Gas estimate too high! Something went wrong')

            return ret
        }

        let gas = await this.web3.eth.getGasPrice() * 1.2
        gas = gas.toFixed(0)

        const gas_hex = web3Utils.toHex(web3Utils.toWei(gas.toString(), 'wei'))

        const txOptions = {
            nonce    : web3Utils.toHex(txCount),
            gas      : web3Utils.toHex(estimatedGasCost),
            gasPrice : gas_hex, // web3Utils.toHex(web3Utils.toWei(this.poolConfig.solutionGasPriceWei.toString(), 'gwei') ),
            value    : 0,
            to       : addressTo,
            from     : addressFrom,
            data     : txData
        }

        const privateKey = this.getMintingAccount().privateKey

        ret['tx_hash'] = await new Promise(function (result, error) {
            this.sendSignedRawTransaction(
                this.web3, txOptions, addressFrom, privateKey, function (err, res) {
                    if (err) error(err)

                    result(res)
                })
        }.bind(this))

        return ret
    },
    async sendSignedRawTransaction(
        web3,
        txOptions,
        addressFrom,
        private_key,
        callback
    ) {
        const privKey = this.truncate0xFromString(private_key)

        const privateKey = new Buffer(privKey, 'hex')
        const transaction = new Tx(txOptions)

        transaction.sign(privateKey)

        const serializedTx = transaction.serialize().toString('hex')

        try {
            const result = web3.eth.sendSignedTransaction('0x' + serializedTx, callback)
        } catch (e) {
            console.log('error', e)
        }
    },
    async requestCurrentChallengeNumber() {
        /* Localize this. */
        const self = this

        const result = new Promise(function (fulfilled, error) {
            self.tokenContract.methods.getChallengeNumber().call(function (err, result) {
                if (err) {
                    return error(err)
                }

                fulfilled(result)
            })
        })

        return result
    },
    truncate0xFromString(s) {
        if (s.startsWith('0x')) {
            return s.substring(2)
        }

        return s
    },
    getMintingAccount() {
        return this.accountConfig.minting
    },
    getPaymentAccount() {
        return this.accountConfig.payment
    }
}
