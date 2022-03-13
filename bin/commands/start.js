const p = require('path')
const { Command, flags } = require('@oclif/command')

const BitdriveService = require('../..')
const BitdriveServiceCommand = require('../../lib/cli')

class StartCommand extends Command {
  static usage = 'start'
  static description = 'Start the Bitdrive service.'
  static flags = {
    'disable-fuse': flags.boolean({
      description: 'Disable FUSE mounting.',
      default: false
    }),
    host: flags.string({
      description: 'The Bitspace service host.',
      required: false
    }),
    key: BitdriveServiceCommand.keyFlag({
      description: 'The root drive key.',
      required: false
    }),
    mnt: flags.string({
      description: 'The root drive mountpoint.',
      required: false
    })
  }

  async run () {
    const { flags } = this.parse(StartCommand)
    flags.disableFuse = flags['disable-fuse']
    if (flags.mnt) flags.mnt = p.resolve(flags.mnt)
    const service = new BitdriveService({
      ...flags
    })
    process.on('SIGINT', () => {
      service.close()
    })
    process.on('SIGTERM', () => {
      service.close()
    })
    try {
      await service.open()
      console.log('Bitdrive service is running (Ctrl+c to stop)...')
    } catch (err) {
      console.error('Could not start the Bitdrive service. Is Bitspace running?')
      console.error('Error:', err)
    }
  }
}

module.exports = StartCommand
