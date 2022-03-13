const os = require('os')
const p = require('path')

const { NanoresourcePromise: Nanoresource } = require('nanoresource-promise/emitter')
const BitspaceClient = require('bitspace/client')
const bitdrive = require('@web4/bitdrive')
const applyHeuristics = require('@web4/bitdrive-network-heuristics')
const maybe = require('call-me-maybe')
const pino = require('pino')

const { loadConfig, saveConfig } = require('./lib/config')
const NetworkHandlers = require('./lib/network')

const DEFAULT_MNT = p.join(os.homedir(), 'Bitdrive')

module.exports = class BitdriveService extends Nanoresource {
  constructor (opts = {}) {
    super()
    this.mnt = opts.mnt || DEFAULT_MNT
    this.key = opts.key
    this.log = opts.log || pino({
      name: 'bitspace-fuse',
      level: opts.logLevel || 'info'
    }, pino.destination(2))

    this.remember = (opts.remember === undefined) ? true : !!opts.remember
    this.disableFuse = !!opts.disableFuse

    this._client = opts.client || new BitspaceClient(opts)
    this._store = null
    this._rootDrive = null
  }

  async _open () {
    await this._client.ready()
    this._store = this._client.corestore()
    if (this.remember) {
      const config = await loadConfig()
      if (!this.key && config.rootDriveKey) this.key = Buffer.from(config.rootDriveKey, 'hex')
      if (!this.mnt && config.mnt) this.mnt = config.mnt
    }
    if (this._fuseEnabled()) await this._mount()
  }

  async _close () {
    await this._unmount()
    await this._client.close()
  }

  _fuseEnabled () {
    if (this.disableFuse) return false
    var bitfuse = null
    try {
      bitfuse = require('bitdrive-fuse')
    } catch (err) {
      notAvailable()
      return false
    }

    return new Promise(resolve => {
      bitfuse.isConfigured((err, configured) => {
        if (err) {
          notAvailable()
          return resolve(false)
        }
        if (!configured) {
          notConfigured()
          return resolve(false)
        }
        return resolve(true)
      })
    })

    function notConfigured () {
      console.warn('FUSE is not configured. Run `bitdrive fuse-setup`.')
    }
    function notAvailable () {
      console.warn('FUSE is not available on your platform.')
    }
  }

  async _createDrive (opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = null
    }
    var drive = bitdrive(this._store, opts && opts.key, {
      ...opts,
      extension: false
    }).promises
    return maybe(cb, (async () => {
      await drive.ready()
      await applyHeuristics(drive, this._client.network)
      return drive
    })())
  }

  async _mount () {
    await this._unmount()
    const { BitdriveFuse } = require('bitdrive-fuse')
    const drive = await this._createDrive({ key: this.key })
    const fuseLogger = this.log.child({ component: 'fuse' })
    const fuse = new BitdriveFuse(drive.drive, this.mnt, {
      force: true,
      displayFolder: true,
      log: fuseLogger.trace.bind(this.log)
    })
    const handlers = fuse.getBaseHandlers()
    const networkHandlers = new NetworkHandlers(this._createDrive.bind(this), handlers, fuseLogger)
    await fuse.mount(networkHandlers.generateHandlers())
    this._rootDrive = drive
    this._rootFuse = fuse
    if (this.remember) {
      const config = {
        rootDriveKey: this.key.toString('hex'),
        mnt: this.mnt
      }
      await saveConfig(config)
    }
  }

  async _unmount () {
    if (!this._rootFuse) return
    await this._rootFuse.unmount()
    this._rootDrive = null
    this._rootFuse = null
  }
}
