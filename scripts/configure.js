#!/usr/bin/env node
const bitfuse = require('@web4/bitdrive-fuse')

bitfuse.configure(err => {
  if (err) return process.exit(1)
  return process.exit(0)
})
