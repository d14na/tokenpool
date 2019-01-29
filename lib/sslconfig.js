/* Set Let's Encrypt (Linux) folder. */
const LETS_ENCRYPT_DIR = '/etc/letsencrypt/live/minado.network/'

/* Set key. */
const key = LETS_ENCRYPT_DIR + 'privkey.pem'

/* Set certificate. */
const cert = LETS_ENCRYPT_DIR + 'cert.pem'

/* Set ssl package. */
const ssl = { key, cert }

/* Export ssl. */
exports.ssl = ssl
