const chalk = require('chalk')
const logger = {
    info: (text) => console.log(`${chalk.black.bgWhite(' INFO: '.padEnd(10))} ${text}`),
    success: (text) => console.log(`${chalk.black.bgGreen(' SUCCESS: '.padEnd(10))} ${text}`),
    error: (text) => console.log(`${chalk.black.bgRed(' ERROR: '.padEnd(10))} ${text}`)
}
module.exports = logger;