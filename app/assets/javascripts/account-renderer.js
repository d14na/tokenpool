import Vue from 'vue'

const blockies = require('ethereum-blockies')
const $ = require('jquery')
const io = require('socket.io-client')

const renderUtils = require('./render-utils')

let app = null
let dashboardData = null
let accountlist = null

/**
 * Account Renderer
 */
export default class AccountRenderer {
    async init() {
        this.accountListData = {
            minerAccountData: []
        }

        /* Localize this. */
        const self = this

        const current_hostname = window.location.hostname

        const socketServer = 'http://' + current_hostname + ':2095'

        const options = {
            transports: ['websocket'],
            forceNew: true
        }

        this.socket = io(socketServer, options)

        // Socket events
        this.socket.on('connect', () => {
            console.log('Connected to socket.io server')
        })

        this.socket.on('disconnect', () => {
            console.log('Disconnected from socket.io server')
        })

        this.socket.on('minerData', function (data) {
            console.log('Got miner data!', JSON.stringify(data))

            /* Initialize total shares. */
            let totalShares = 0

            data = data.filter(
                item => item.minerAddress.toString().length === 42)

            data = data.filter(item => item.minerData)

            data.map(item => item.minerData.tokenBalanceFormatted =
                (item.minerData.tokenBalance / 10**8).toFixed(2))

            data.map(item => item.minerData.tokenRewardsFormatted =
                (item.minerData.tokensAwarded / 10**8).toFixed(2))

            data.map(item => item.minerData.hashRateFormatted =
                renderUtils.formatHashRate(item.minerData.hashRate))

            data.map(item => (totalShares =
                (totalShares + item.minerData.shareCredits)))

            data.map(item => item.minerData.sharesPercent =
                (((item.minerData.shareCredits / parseFloat(totalShares)) * 100)
                    .toFixed(2).toString() + '%'
                ))

            data.map(item => item.profileURL = (
                '/profile/?address=' + item.minerAddress.toString()
            ))

            data.sort(function (a, b) {
                return b.minerData.shareCredits - a.minerData.shareCredits
            })

            for (let i in data) {
                let shares = parseInt(data[i].minerData.shareCredits)

                console.log(shares)

                if (isNaN(shares) || shares <= 0) {
                    data.splice(i, 1)
                }

                // still a WIP
                // data[i].identicon = self.getIdenticon( data[i].minerAddress  )
            }

            self.accountListData.minerAccountData = data

            Vue.set(accountlist.accounts, 'account_list', data)
        })

        this.socket.emit('getAllMinerData')

        accountlist = new Vue({
            el: '#accountlist',
            data: {
                //parentMessage: 'Parent',
                filter: '',
                accounts: {
                    account_list: this.accountListData.minerAccountData
                }
            },
            computed: {
                filteredList() {
                    if (this.filter) {
                        return this.accounts.account_list.filter(account => {
                            account.minerAddress.includes(this.filter)
                        })
                    } else {
                        return this.accounts.account_list
                    }
                }
            }
        })
    }

    /**
     * Update Miner Data
     */
    async update() {
        this.socket.emit('getAllMinerData')
    }

    /**
     * Get Identicon
     */
    getIdenticon(hash) {
        var icon = blockies.create({ // All options are optional
            seed: hash, // seed used to generate icon data, default: random
            // color: '#dfe', // to manually specify the icon color, default: random
            // bgcolor: '#aaa', // choose a different background color, default: random
            size: 15, // width/height of the icon in blocks, default: 8
            scale: 3, // width/height of each block in pixels, default: 4
            // spotcolor: '#000' // each pixel has a 13% chance of being of a third color,
            // default: random. Set to -1 to disable it. These "spots" create structures
            // that look like eyes, mouths and noses.
        })

        return this.htmlEntities(icon.toString())
    }

    /**
     * HTML Entities
     */
    htmlEntities(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    /**
     * Hide Account List
     */
    hide() {
        $('#accountlist').hide()
    }

    /**
     * Show Account List
     */
    show() {
        $('#accountlist').show()
    }
}
