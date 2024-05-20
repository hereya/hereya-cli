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
* [`hereya env`](#hereya-env)
* [`hereya help [COMMAND]`](#hereya-help-command)
* [`hereya init PROJECT`](#hereya-init-project)
* [`hereya remove PACKAGE`](#hereya-remove-package)
* [`hereya run CMD`](#hereya-run-cmd)
* [`hereya workspace add PACKAGE`](#hereya-workspace-add-package)
* [`hereya workspace create NAME`](#hereya-workspace-create-name)
* [`hereya workspace env`](#hereya-workspace-env)
* [`hereya workspace remove PACKAGE`](#hereya-workspace-remove-package)

## `hereya add PACKAGE`

adds a package to the project

```
USAGE
  $ hereya add PACKAGE [--chdir <value>] [-p <value>]

ARGUMENTS
  PACKAGE  The package to add. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  -p, --parameter=<value>...  [default: ] parameter for the package, in the form of 'key=value'. Can be specified
                              multiple times.
      --chdir=<value>         directory to run command in

DESCRIPTION
  adds a package to the project

EXAMPLES
  $ hereya add cloudy/docker_postgres
```

_See code: [src/commands/add/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/add/index.ts)_

## `hereya bootstrap INFRASTRUCTURETYPE`

installs necessary resources for hereya operations in an infrastructure

```
USAGE
  $ hereya bootstrap INFRASTRUCTURETYPE [-f]

ARGUMENTS
  INFRASTRUCTURETYPE  infrastructure to bootstrap. Options are local, aws, azure, gcp

FLAGS
  -f, --force  redeploy hereya resources if already deployed

DESCRIPTION
  installs necessary resources for hereya operations in an infrastructure

EXAMPLES
  $ hereya bootstrap aws

  $ hereya bootstrap local

  $ hereya bootstrap gcp

  $ hereya bootstrap azure
```

_See
code: [src/commands/bootstrap/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/bootstrap/index.ts)_

## `hereya env`

prints project environment variables

```
USAGE
  $ hereya env [--chdir <value>] [-w <value>]

FLAGS
  -w, --workspace=<value>  name of the workspace to print the env vars for
      --chdir=<value>      project root directory

DESCRIPTION
  prints project environment variables

EXAMPLES
  $ hereya env

  $ hereya env -w dev
```

_See code: [src/commands/env/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/env/index.ts)_

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

initializes hereya in a project directory

```
USAGE
  $ hereya init PROJECT -w <value> [--chdir <value>]

ARGUMENTS
  PROJECT  project name

FLAGS
  -w, --workspace=<value>  (required) workspace to set as default
      --chdir=<value>      directory to run command in

DESCRIPTION
  initializes hereya in a project directory

EXAMPLES
  $ hereya init myProject -w=defaultWorkspace

  $ hereya init myProject -w=defaultWorkspace --chdir=./myProject
```

_See code: [src/commands/init/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/init/index.ts)_

## `hereya remove PACKAGE`

removes a package from the project

```
USAGE
  $ hereya remove PACKAGE [--chdir <value>]

ARGUMENTS
  PACKAGE  The package to remove. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  --chdir=<value>  directory to run command in

DESCRIPTION
  removes a package from the project

EXAMPLES
  $ hereya remove cloudy/docker_postgres
```

_See
code: [src/commands/remove/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/remove/index.ts)_

## `hereya run CMD`

runs a command with hereya env vars

```
USAGE
  $ hereya run CMD... [--chdir <value>] [-w <value>]

ARGUMENTS
  CMD...  command to run

FLAGS
  -w, --workspace=<value>  name of the workspace to run the command in
      --chdir=<value>      directory to run command in

DESCRIPTION
  runs a command with hereya env vars

EXAMPLES
  $ hereya run -- npm run dev

  $ hereya run -w uat -- node index.js
```

_See code: [src/commands/run/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/run/index.ts)_

## `hereya workspace add PACKAGE`

adds a package to the workspace

```
USAGE
  $ hereya workspace add PACKAGE -w <value> [-p <value>] [-f <value>]

ARGUMENTS
  PACKAGE  The package to add. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  -f, --parameter-file=<value>  path to a file containing parameters for the package
  -p, --parameter=<value>...    [default: ] parameter for the package, in the form of 'key=value'. Can be specified
                                multiple times.
  -w, --workspace=<value>       (required) name of the workspace to add the package to

DESCRIPTION
  adds a package to the workspace

EXAMPLES
  $ hereya workspace add hereya/aws-cognito
```

_See
code: [src/commands/workspace/add/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/workspace/add/index.ts)_

## `hereya workspace create NAME`

creates a new workspace if it does not exist

```
USAGE
  $ hereya workspace create NAME

ARGUMENTS
  NAME  name of the workspace to create

DESCRIPTION
  creates a new workspace if it does not exist

EXAMPLES
  $ hereya workspace create
```

_See
code: [src/commands/workspace/create/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/workspace/create/index.ts)_

## `hereya workspace env`

prints workspace env vars

```
USAGE
  $ hereya workspace env -w <value>

FLAGS
  -w, --workspace=<value>  (required) name of the workspace to print env vars for

DESCRIPTION
  prints workspace env vars

EXAMPLES
  $ hereya workspace env -w dev
```

_See
code: [src/commands/workspace/env/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/workspace/env/index.ts)_

## `hereya workspace remove PACKAGE`

removes a package from a workspace

```
USAGE
  $ hereya workspace remove PACKAGE -w <value> [-p <value>] [-f <value>]

ARGUMENTS
  PACKAGE  The package to remove. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  -f, --parameter-file=<value>  path to a file containing parameters for the package
  -p, --parameter=<value>...    [default: ] parameter for the package, in the form of 'key=value'. Can be specified
                                multiple times.
  -w, --workspace=<value>       (required) name of the workspace to remove the package from

DESCRIPTION
  removes a package from a workspace

EXAMPLES
  $ hereya workspace remove hereya/aws-cognito
```

_See
code: [src/commands/workspace/remove/index.ts](https://github.com/hereya/hereya-cli/blob/v0.0.0/src/commands/workspace/remove/index.ts)_
<!-- commandsstop -->
