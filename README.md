hereya-cli
=================

A package manager for infrastructure libraries


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/hereya-cli.svg)](https://npmjs.org/package/hereya-cli)
[![Downloads/week](https://img.shields.io/npm/dw/hereya-cli.svg)](https://npmjs.org/package/hereya-cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g hereya-cli
$ hereya COMMAND
running command...
$ hereya (--version)
hereya-cli/0.0.0 darwin-arm64 node-v20.12.2
$ hereya --help [COMMAND]
USAGE
  $ hereya COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`hereya add PACKAGE`](#hereya-add-package)
* [`hereya bootstrap INFRASTRUCTURETYPE`](#hereya-bootstrap-infrastructuretype)
* [`hereya help [COMMAND]`](#hereya-help-command)
* [`hereya init PROJECT`](#hereya-init-project)
* [`hereya plugins`](#hereya-plugins)
* [`hereya plugins add PLUGIN`](#hereya-plugins-add-plugin)
* [`hereya plugins:inspect PLUGIN...`](#hereya-pluginsinspect-plugin)
* [`hereya plugins install PLUGIN`](#hereya-plugins-install-plugin)
* [`hereya plugins link PATH`](#hereya-plugins-link-path)
* [`hereya plugins remove [PLUGIN]`](#hereya-plugins-remove-plugin)
* [`hereya plugins reset`](#hereya-plugins-reset)
* [`hereya plugins uninstall [PLUGIN]`](#hereya-plugins-uninstall-plugin)
* [`hereya plugins unlink [PLUGIN]`](#hereya-plugins-unlink-plugin)
* [`hereya plugins update`](#hereya-plugins-update)
* [`hereya remove PACKAGE`](#hereya-remove-package)
* [`hereya run CMD`](#hereya-run-cmd)

## `hereya add PACKAGE`

add a package to the project

```
USAGE
  $ hereya add PACKAGE [--chdir <value>]

ARGUMENTS
  PACKAGE  The package to add. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  --chdir=<value>  directory to run command in

DESCRIPTION
  add a package to the project

EXAMPLES
  $ hereya add cloudy/docker_postgres
```

_See code: [src/commands/add/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/add/index.ts)_

## `hereya bootstrap INFRASTRUCTURETYPE`

install necessary resources for hereya operations in an infrastructure

```
USAGE
  $ hereya bootstrap INFRASTRUCTURETYPE [-f]

ARGUMENTS
  INFRASTRUCTURETYPE  infrastructure to bootstrap. Options are local, aws, azure, gcp

FLAGS
  -f, --force  redeploy hereya resources if already deployed

DESCRIPTION
  install necessary resources for hereya operations in an infrastructure

EXAMPLES
  $ hereya bootstrap aws

  $ hereya bootstrap local

  $ hereya bootstrap gcp

  $ hereya bootstrap azure
```

_See
code: [src/commands/bootstrap/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/bootstrap/index.ts)_

## `hereya help [COMMAND]`

Display help for hereya.

```
USAGE
  $ hereya help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for hereya.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.22/src/commands/help.ts)_

## `hereya init PROJECT`

initialize hereya in a project directory

```
USAGE
  $ hereya init PROJECT -w <value> [--chdir <value>]

ARGUMENTS
  PROJECT  project name

FLAGS
  -w, --workspace=<value>  (required) workspace to set as default
      --chdir=<value>      directory to run command in

DESCRIPTION
  initialize hereya in a project directory

EXAMPLES
  $ hereya init myProject -w=defaultWorkspace

  $ hereya init myProject -w=defaultWorkspace --chdir=./myProject
```

_See code: [src/commands/init/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/init/index.ts)_

## `hereya plugins`

List installed plugins.

```
USAGE
  $ hereya plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ hereya plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/index.ts)_

## `hereya plugins add PLUGIN`

Installs a plugin into hereya.

```
USAGE
  $ hereya plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into hereya.

  Uses bundled npm executable to install plugins into /Users/jonatan/.local/share/hereya

  Installation of a user-installed plugin will override a core plugin.

  Use the HEREYA_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the HEREYA_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ hereya plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ hereya plugins add myplugin

  Install a plugin from a github url.

    $ hereya plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ hereya plugins add someuser/someplugin
```

## `hereya plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ hereya plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ hereya plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/inspect.ts)_

## `hereya plugins install PLUGIN`

Installs a plugin into hereya.

```
USAGE
  $ hereya plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into hereya.

  Uses bundled npm executable to install plugins into /Users/jonatan/.local/share/hereya

  Installation of a user-installed plugin will override a core plugin.

  Use the HEREYA_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the HEREYA_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ hereya plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ hereya plugins install myplugin

  Install a plugin from a github url.

    $ hereya plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ hereya plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/install.ts)_

## `hereya plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ hereya plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ hereya plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/link.ts)_

## `hereya plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ hereya plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ hereya plugins unlink
  $ hereya plugins remove

EXAMPLES
  $ hereya plugins remove myplugin
```

## `hereya plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ hereya plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/reset.ts)_

## `hereya plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ hereya plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ hereya plugins unlink
  $ hereya plugins remove

EXAMPLES
  $ hereya plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/uninstall.ts)_

## `hereya plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ hereya plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ hereya plugins unlink
  $ hereya plugins remove

EXAMPLES
  $ hereya plugins unlink myplugin
```

## `hereya plugins update`

Update installed plugins.

```
USAGE
  $ hereya plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/update.ts)_

## `hereya remove PACKAGE`

remove a package from the project

```
USAGE
  $ hereya remove PACKAGE [--chdir <value>]

ARGUMENTS
  PACKAGE  The package to remove. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  --chdir=<value>  directory to run command in

DESCRIPTION
  remove a package from the project

EXAMPLES
  $ hereya remove cloudy/docker_postgres
```

_See
code: [src/commands/remove/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/remove/index.ts)_

## `hereya run CMD`

run a command with hereya env vars

```
USAGE
  $ hereya run CMD... [-w <value>] [--chdir <value>]

ARGUMENTS
  CMD...  command to run

FLAGS
  -w, --workspace=<value>  name of the workspace to run the command in
      --chdir=<value>      directory to run command in

DESCRIPTION
  run a command with hereya env vars

EXAMPLES
  $ hereya run -- npm run dev

  $ hereya run -w uat -- node index.js
```

_See code: [src/commands/run/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/run/index.ts)_
<!-- commandsstop -->
