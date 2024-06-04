hereya-cli
=================

Use infrastructure components as simple software packages.


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
hereya-cli/0.5.6 linux-x64 node-v18.20.3
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
* [`hereya deploy`](#hereya-deploy)
* [`hereya down`](#hereya-down)
* [`hereya env`](#hereya-env)
* [`hereya help [COMMAND]`](#hereya-help-command)
* [`hereya init PROJECT`](#hereya-init-project)
* [`hereya remote exec [PKGPATH]`](#hereya-remote-exec-pkgpath)
* [`hereya remove PACKAGE`](#hereya-remove-package)
* [`hereya run CMD`](#hereya-run-cmd)
* [`hereya undeploy`](#hereya-undeploy)
* [`hereya up`](#hereya-up)
* [`hereya workspace create NAME`](#hereya-workspace-create-name)
* [`hereya workspace delete NAME`](#hereya-workspace-delete-name)
* [`hereya workspace env`](#hereya-workspace-env)
* [`hereya workspace install PACKAGE`](#hereya-workspace-install-package)
* [`hereya workspace uninstall PACKAGE`](#hereya-workspace-uninstall-package)

## `hereya add PACKAGE`

Add a package to the project.

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
  Add a package to the project.

EXAMPLES
  $ hereya add cloudy/docker_postgres
```

_See code: [src/commands/add/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/add/index.ts)_

## `hereya bootstrap INFRASTRUCTURETYPE`

Install necessary resources for hereya operations in an infrastructure.

```
USAGE
  $ hereya bootstrap INFRASTRUCTURETYPE [-f]

ARGUMENTS
  INFRASTRUCTURETYPE  infrastructure to bootstrap. Options are local, aws, azure, gcp

FLAGS
  -f, --force  redeploy hereya resources if already deployed

DESCRIPTION
  Install necessary resources for hereya operations in an infrastructure.

EXAMPLES
  $ hereya bootstrap aws

  $ hereya bootstrap local
```

_See code: [src/commands/bootstrap/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/bootstrap/index.ts)_

## `hereya deploy`

Deploy a hereya project using the project deployment package

```
USAGE
  $ hereya deploy -w <value> [--chdir <value>]

FLAGS
  -w, --workspace=<value>  (required) name of the workspace to deploy the packages for
      --chdir=<value>      directory to run command in

DESCRIPTION
  Deploy a hereya project using the project deployment package

EXAMPLES
  $ hereya deploy
```

_See code: [src/commands/deploy/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/deploy/index.ts)_

## `hereya down`

Destroy all packages in the project.

```
USAGE
  $ hereya down [--chdir <value>] [--deploy] [-w <value>]

FLAGS
  -w, --workspace=<value>  name of the workspace to install the packages for
      --chdir=<value>      directory to run command in
      --deploy             destroy deployment companion packages

DESCRIPTION
  Destroy all packages in the project.

EXAMPLES
  $ hereya down
```

_See code: [src/commands/down/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/down/index.ts)_

## `hereya env`

Print project environment variables.

```
USAGE
  $ hereya env [--chdir <value>] [-w <value>]

FLAGS
  -w, --workspace=<value>  name of the workspace to print the env vars for
      --chdir=<value>      project root directory

DESCRIPTION
  Print project environment variables.

EXAMPLES
  $ hereya env

  $ hereya env -w dev
```

_See code: [src/commands/env/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/env/index.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.1.0/src/commands/help.ts)_

## `hereya init PROJECT`

Initialize hereya in a project directory.

```
USAGE
  $ hereya init PROJECT -w <value> [--chdir <value>]

ARGUMENTS
  PROJECT  project name

FLAGS
  -w, --workspace=<value>  (required) workspace to set as default
      --chdir=<value>      directory to run command in

DESCRIPTION
  Initialize hereya in a project directory.

EXAMPLES
  $ hereya init myProject -w=defaultWorkspace

  $ hereya init myProject -w=defaultWorkspace --chdir=./myProject
```

_See code: [src/commands/init/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/init/index.ts)_

## `hereya remote exec [PKGPATH]`

remotely provision or destroy a package

```
USAGE
  $ hereya remote exec [PKGPATH] [-o <value>] [-s <value>]

ARGUMENTS
  PKGPATH  The path to the package to provision or destroy

FLAGS
  -o, --output=<value>  The path to store the output env in
  -s, --source=<value>  The source of the project to provision or destroy the package for

DESCRIPTION
  remotely provision or destroy a package

EXAMPLES
  $ hereya remote exec
```

_See code: [src/commands/remote/exec/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/remote/exec/index.ts)_

## `hereya remove PACKAGE`

Remove a package from the project.

```
USAGE
  $ hereya remove PACKAGE [--chdir <value>]

ARGUMENTS
  PACKAGE  The package to remove. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  --chdir=<value>  directory to run command in

DESCRIPTION
  Remove a package from the project.

EXAMPLES
  $ hereya remove cloudy/docker_postgres
```

_See code: [src/commands/remove/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/remove/index.ts)_

## `hereya run CMD`

Run a command with hereya env vars.

```
USAGE
  $ hereya run CMD... [--chdir <value>] [-w <value>]

ARGUMENTS
  CMD...  command to run

FLAGS
  -w, --workspace=<value>  name of the workspace to run the command in
      --chdir=<value>      directory to run command in

DESCRIPTION
  Run a command with hereya env vars.

EXAMPLES
  $ hereya run -- npm run dev

  $ hereya run -w uat -- node index.js
```

_See code: [src/commands/run/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/run/index.ts)_

## `hereya undeploy`

Undeploy a hereya project by removing all resources.

```
USAGE
  $ hereya undeploy -w <value> [--chdir <value>]

FLAGS
  -w, --workspace=<value>  (required) name of the workspace to undeploy the packages for
      --chdir=<value>      directory to run command in

DESCRIPTION
  Undeploy a hereya project by removing all resources.

EXAMPLES
  $ hereya undeploy
```

_See code: [src/commands/undeploy/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/undeploy/index.ts)_

## `hereya up`

Provision all packages in the project.

```
USAGE
  $ hereya up [--chdir <value>] [--deploy] [-w <value>]

FLAGS
  -w, --workspace=<value>  name of the workspace to install the packages for
      --chdir=<value>      directory to run command in
      --deploy             provision deployment companion packages

DESCRIPTION
  Provision all packages in the project.

EXAMPLES
  $ hereya up
```

_See code: [src/commands/up/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/up/index.ts)_

## `hereya workspace create NAME`

Create a new workspace if it does not exist.

```
USAGE
  $ hereya workspace create NAME

ARGUMENTS
  NAME  name of the workspace to create

DESCRIPTION
  Create a new workspace if it does not exist.

EXAMPLES
  $ hereya workspace create dev
```

_See code: [src/commands/workspace/create/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/workspace/create/index.ts)_

## `hereya workspace delete NAME`

Delete a workspace if it exists.

```
USAGE
  $ hereya workspace delete NAME

ARGUMENTS
  NAME  name of the workspace to delete

DESCRIPTION
  Delete a workspace if it exists.

EXAMPLES
  $ hereya workspace delete dev
```

_See code: [src/commands/workspace/delete/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/workspace/delete/index.ts)_

## `hereya workspace env`

Print workspace env vars.

```
USAGE
  $ hereya workspace env -w <value>

FLAGS
  -w, --workspace=<value>  (required) name of the workspace to print env vars for

DESCRIPTION
  Print workspace env vars.

EXAMPLES
  $ hereya workspace env -w dev
```

_See code: [src/commands/workspace/env/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/workspace/env/index.ts)_

## `hereya workspace install PACKAGE`

Add a package to the workspace.

```
USAGE
  $ hereya workspace install PACKAGE -w <value> [-p <value>] [-f <value>]

ARGUMENTS
  PACKAGE  The package to add. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  -f, --parameter-file=<value>  path to a file containing parameters for the package
  -p, --parameter=<value>...    [default: ] parameter for the package, in the form of 'key=value'. Can be specified
                                multiple times.
  -w, --workspace=<value>       (required) name of the workspace to add the package to

DESCRIPTION
  Add a package to the workspace.

EXAMPLES
  $ hereya workspace install hereya/aws-cognito
```

_See code: [src/commands/workspace/install/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/workspace/install/index.ts)_

## `hereya workspace uninstall PACKAGE`

Remove a package from a workspace.

```
USAGE
  $ hereya workspace uninstall PACKAGE -w <value> [-p <value>] [-f <value>]

ARGUMENTS
  PACKAGE  The package to remove. Packages are gitHub repositories. Use the format owner/repository

FLAGS
  -f, --parameter-file=<value>  path to a file containing parameters for the package
  -p, --parameter=<value>...    [default: ] parameter for the package, in the form of 'key=value'. Can be specified
                                multiple times.
  -w, --workspace=<value>       (required) name of the workspace to remove the package from

DESCRIPTION
  Remove a package from a workspace.

EXAMPLES
  $ hereya workspace uninstall hereya/aws-cognito
```

_See code: [src/commands/workspace/uninstall/index.ts](https://github.com/hereya/hereya-cli/blob/0.5.6/src/commands/workspace/uninstall/index.ts)_
<!-- commandsstop -->
