const $ = require('jquery')
const moment = require('moment')

module.exports = {
    formatTokenQuantity(satoshis) {
        return (parseFloat(satoshis) / parseFloat(1e8)).toString()
    },
    // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
    round(number, precision) {
        var shift = function (number, precision, reverseShift) {
            if (reverseShift) {
                precision = -precision
            }

            numArray = ('' + number).split('e')

            return + (numArray[0] + 'e' + (numArray[1] ? (+numArray[1] + precision) : precision))
        }

        return shift(Math.round(shift(number, precision, false)), precision, true)
    },
    formatHashRate(hashRate) {
        if (hashRate === null || hashRate === 0) {
            return '--'
        }

        hashRate = parseFloat(hashRate)

        if (hashRate > 1e9) {
            return (this.round(hashRate / (1e9), 2).toString() + ' Gh/s')
        } else if (hashRate > 1e6) {
            return (this.round(hashRate / (1e6), 2).toString() + ' Mh/s')
        } else if (hashRate > 1e3) {
            return (this.round(hashRate / (1e3), 2).toString() + ' Kh/s')
        } else {
            return (this.round(hashRate, 2).toString() + ' H/s')
        }
    }
}
