/* Initialize JQuery. */
const $ = require('jquery')

/* Initialize constants. */
const TIME_UNTIL_UPDATE = 30 * 1000 // default: 30 seconds

/**
 * Account Dashboard
 */
export default class AccountDashboard {
    init(accountRenderer) {
        /* Start loop. */
        setInterval(function () {
            console.log('Updating account data...')

            /* Update renderer. */
            accountRenderer.update()
        }, TIME_UNTIL_UPDATE)

        /* Initialize account renderer. */
        accountRenderer.init()
    }
}
