/*
  Save certain stats to redis every hour
*/
const STAT_COLLECTION_DELAY = 5 * 1000 // milliseconds
const STAT_COLLECTION_PERIOD = 60 * 60 * 1000 // milliseconds

module.exports = {
    async init(redisInterface, webInterface, peerInterface) {
        /* Localize this. */
        const self = this

        this.redisInterface = redisInterface
        this.peerInterface  = peerInterface

        /* Initialize regular collection interval. */
        setInterval(async function () {
            await self.collectStats()
        }, STAT_COLLECTION_PERIOD)

        /* Set (startup delay) timeout. */
        setTimeout(async function () {
            await self.collectStats()
        }, STAT_COLLECTION_DELAY)

        console.log('Diagnostics Manager initialization complete.')
    },
    async collectStats() {
        /* Retrieve total hashrate. */
        const hashrate = await this.peerInterface.getTotalMinerHashrate()

        /* Retrieve block number. */
        const block = await this.redisInterface.getEthBlockNumber()

        /* Set total pool hashrate. */
        const totalPoolHashrate = JSON.stringify({ block, hashrate })

        /* Store total pool hashrate. */
        await this.redisInterface
            .pushToRedisList('total_pool_hashrate', totalPoolHashrate)
    }
}
