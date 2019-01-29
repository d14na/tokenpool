const express = require('express')
const fs = require('fs')

module.exports = {
    async init(https_enabled, webInterface, peerInterface) {
        console.log('\nInitializing Web Server...')

        this.webInterface  = webInterface
        this.peerInterface = peerInterface

        /* Initialize express app. */
        const app = express()

        /* Initialize server. */
        let server = null

        if (https_enabled) {
            /* Set config. */
            const config = require('./sslconfig')

            /* Set key. */
            const key = fs.readFileSync(config.ssl.key)

            /* Set certificate. */
            const cert = fs.readFileSync(config.ssl.cert)

            /* Set ssl options. */
            const sslOptions = { key, cert }

            /* Set server. */
            server = require('https').createServer(sslOptions, app)

            console.log('    *** HTTPS enabled!')
        } else {
            /* Set server. */
            server = require('http').createServer(app)
        }

        app.use('/', express.static('public'))
        app.listen(3000, () => console.log('Web app listening on port 3000!'))
        app.listen(80, () => console.log('Web app listening on port 80!'))

        this.startSocketServer(server)

        console.log('Web Server initialization complete.')
    },
    startSocketServer(server) {
        const self = this
        const io = require('socket.io')(server)
        const port = process.env.PORT || 2095;

        ///  https://socket.io/docs/rooms-and-namespaces/#

        server.listen(port, function () {
            console.log('Socket server listening at port %d', port)
        })

        /* Initialize sockets. */
        let sockets = {}

        io.on('connection', function (socket) {
            //console.log('established new socket connection');

            socket.on('ping', function (data) {
                console.log('ping', data)

                io.emit('pong', {
                    message: 'pong'
                })
            })

            socket.on('getAllMinerData', async function (data) {
                const minerData = await self.peerInterface.getAllMinerData()

                socket.emit('minerData', minerData)
            })

            socket.on('getAllTransactionData', async function (data) {
                const txData = await self.peerInterface.getAllTransactionData()

                socket.emit('transactionData', txData)
            })

            socket.on('getPoolData', async function (data) {
                const poolData = await self.peerInterface.getPoolData()

                socket.emit('poolData', poolData)
            })

            socket.on('getMinerBalancePayments', async function (data) {
                const txData = await self.webInterface.getMinerBalancePayments(data.address, 100)

                socket.emit('minerBalancePayments', txData)
            })

            socket.on('getMinerBalanceTransfers', async function (data) {
                const txData = await self.webInterface.getMinerBalanceTransfers(data.address, 100)

                socket.emit('minerBalanceTransfers', txData)
            })

            socket.on('getMinerSubmittedShares', async function (data) {
                const txData = await self.webInterface.getMinerSubmittedShares(data.address, 100)

                socket.emit('minerSubmittedShares', txData)
            })

            socket.on('getMinerInvalidShares', async function (data) {
                const txData = await self.webInterface.getMinerInvalidShares(data.address, 100)

                socket.emit('minerInvalidShares', txData)
            })

            socket.on('getMinerRewards', async function (data) {
                const txData = await self.webInterface.getMinerRewards(data.address, 100)

                socket.emit('minerRewards', txData)
            })

            socket.on('getActiveTransactionData', async function (data) {
                const txData = await self.webInterface.getActiveTransactionData(100)

                socket.emit('activeTransactionData', txData)
            })

            socket.on('getQueuedTransactionData', async function (data) {
                const txData = await self.webInterface.getQueuedTransactionData(100)

                socket.emit('queuedTransactionData', txData)
            })

            socket.on('getPendingBalanceTransfers', async function (data) {
                const txData = await self.webInterface.getPendingBalanceTransfers()

                socket.emit('pendingBalanceTransfers', txData)
            })

            socket.on('getQueuedReplacementPaymentData', async function (data) {
                const txData = await self.webInterface.getQueuedReplacementPaymentData(100)

                socket.emit('queuedReplacementPaymentData', txData)
            })

            socket.on('getUnconfirmedBroadcastedPaymentData', async function (data) {
                const txData = await self.webInterface.getUnconfirmedBroadcastedPaymentData(100)

                socket.emit('unconfirmedBroadcastedPaymentData', txData)
            })

            socket.on('getHashrateData', async function (data) {
                const txData = await self.webInterface.getHashrateData(100)

                socket.emit('hashrateData', txData)
            })

            socket.on('getPoolConfig', async function (data) {
                const poolData = await self.webInterface.getPoolConfig()

                socket.emit('poolConfig', poolData)
            })

            socket.on('getPoolStats', async function (data) {
                const poolStats = await self.webInterface.getPoolStats( )

                socket.emit('poolStats', poolStats)
            })

            socket.on('getSubmittedShares', async function (data) {
                const shares = await self.webInterface.getSubmittedShares(100)

                socket.emit('submittedShares', shares)
            })

            socket.on('getSubmittedSolutions', async function (data) {
                const solutions = await self.webInterface.getSubmittedSolutions(100)

                socket.emit('submittedSolutions', solutions)
            })

            socket.on('getMinerDetails', async function (data) {
                const minerData = await self.peerInterface.getMinerData(data.address)

                socket.emit('minerDetails', minerData)
            })

            socket.on('disconnect', function () {
                delete sockets[socket.sid]
            })
        })
    }
}
