# bitdrive-cli
A companion service for Bitspace that provides FUSE/CLI access to Bitdrives.

This service creates a "root drive" for you, which is a single, private Bitdrive that's mounted at `~/Bitdrive`. You can think of this root drive as a replacement for your normal home directory (where you might have Documents, Videos, and Pictures folders, for example).

The CLI gives you commands for interacting with Bitdrives, both inside and outside of FUSE. Here are some of the included commands:
* The `mount` and `unmount` commands allow you to attach/detach other other Bitdrives to/from your root drive.
* The `seed` and `unseed` commands let you decide whether you'd like to advertise a drive on the Bitswarm DHT.
* The `import` and `export` commands are for users who don't want to use FUSE, but still want to move data in and out of Bitdrives.

### Installation
Before installing the Bitdrive service, you'll want to first install [`bitspace`](https://github.com/bitwebs/bitspace). Once Bitspace is installed, run:
```
npm i bitdrive-cli -g
```

After the NPM installation, you should have access to the `bitdrive` CLI tool.

### Getting Started
In another terminal, spin up Bitspace by running `bitspace` (no other flags needed).

If you're planning on using FUSE, you have to perform a one-time setup step to do the FUSE installation. This will prompt you for `sudo` access:
```
$ bitdrive fuse-setup
```

Once FUSE has been configured, you're ready to start the Bitdrive service:
```
$ bitdrive start
```

### API
`bitdrive-cli` exposes an API for programmatically interacting with your root drive. To create a client:
```js
const BitdriveServiceClient = require('bitdrive-cli/client')
const client = new BitdriveServiceClient()
```

#### `const client = new BitdriveServiceClient(opts = {})`
Create a new client for interacting with the Bitdrive service.

If you don't provide any options, options will be loaded from a configuration file inside of the `~/.bitspace` directory and a Bitspace client will be created automatically.

Options include:
```js
{
  mnt: string, // The FUSE mountpoint
  key: Buffer, // Your root drive key.
  client: BitspaceClient // A bitspace client.
}
```

#### `await client.mount(path, opts = {})`
Mounts a Bitdrive inside of your root drive. `path` must be contained within your root drive's mountpoint (typically `~/Bitdrive`).

Options include all options to Bitdrive's mount method, such as:
```js
{
  key: Buffer, // The key of the drive you're mounting.
  version: number, // The drive version (if you're creating a static mount)
}
```

#### `await client.unmount(path)`
Unmount the drive mounted at `path`. `path` must be contained within your root drive's mountpoint (typically `~/Bitdrive`).

#### `await client.seed(path, opts = {})`
Start announcing a mounted drive on the Bitswarm DHT.

Options include:
```js
{
  remember: boolean, // true if this network configuration should be persisted across restarts.
}
```

#### `await client.unseed(path, opts = {})`
Stop announcing a mounted drive on the Bitswarm DHT.

Options include:
```js
{
  remember: boolean, // true if this network configuration should be persisted across restarts.
}
```

#### `await client.info(path)`
Returns info about the drive mounted at `path`.

The info takes the form:
```
{
  key: Buffer, The drive's key
  discoveryKey: Buffer, // The drive's discovery key.
  writable: boolean, // true if the drive is writable.
  mountPath: string, // The path of the enclosing mountpoint.
  announce: boolean, // true if the drive is currently being announced on the DHT.
  lookup: boolean    // true if the drive is currently being looked up on the DHT.
}
```

#### `await client.stats(path)`
Return drive storage/networking statistics.

The stats take the form:
```js
{
   storage, // Storage info about each mountpoint in the drive.
   network, // Networking info about each mountpoint in the drive.
}
```

where `storage` has the same structure as that returned by [`Bitdrive.stats`](https://github.com/bitwebs/bitdrive)
and `network` has the form:
```
{
  '/': {
    metadata: {
      key,
      discoveryKey,
      length: number, // The Unichain's length,
      byteLength: number // The Unichain's byteLength
      peers: [Peer] // An Array of Unichain Peer objects.
    },
    content: {
      // Same as above
      ...
     }
  },
  '/mountpoint1': {
     // Same as above
     ...
  }
}
```

#### `const { progress, drive } = client.import(key, dir, opts = {})`
Imports a Bitdrive into Bitspace.

If you're using FUSE, you probably don't need to explictly `import`/`export`, because you can replicate this functionality using the filesystem alone.

`progress` is an instance of [`mirror-folder`](https://github.com/mafintosh/mirror-folder).
`drive` is the Bitdrive that you're importing into.

Options include:
```js
{
  watch: false // Watch for changes.
}
```

_Note: This imported drive will not appear inside your root drive unless you explicitly mount it with `bitdrive mount (mount path) (imported drive key)`_

#### `const { progress, drive } = client.export(key, dir, opts = {})`
Exports a Bitdrive into a local directory.

If you're using FUSE, you probably don't need to explictly `import`/`export`, because you can replicate this functionality using the filesystem alone.

Options include:
```js
  watch: false // Watch for changes.
```

### CLI Commands
The `bitdrive` CLI tool includes a handful of subcommands that wrap the API methods described above. Running `bitdrive help` will give more complete usage info:
```
$ ./bin/run/run help
A Bitspace service that for managing Bitdrives over FUSE.

VERSION
  bitdrive-cli/1.0.0 linux-x64 node-v12.9.1

USAGE
  $ bitdrive [COMMAND]

COMMANDS
  autocomplete   display autocomplete installation instructions
  create         Create a new drive mounted at the specified path
  export         Export a Bitdrive into a directory.
  force-unmount  Forcibly unmount the root filesystem (useful if it was not cleanly unmounted).
  fuse-setup     Perform a one-time configuration step for FUSE.
  help           display help for bitdrive
  import         Import a directory into a Bitdrive.
  info           Display information about the drive mounted at the given mountpoint.
  mount          Mount a drive at the specified mountpoint.
  seed           Seed a Bitdrive on the network.
  start          Start the Bitdrive service.
  stats          Get the networking stats for the drive mounted at a path.
  unmount        Unmount a drive. The root drive will be unmounted if a mountpoint is not specified.
  unseed         Stop seeding a Bitdrive on the network.
```

### License
MIT
