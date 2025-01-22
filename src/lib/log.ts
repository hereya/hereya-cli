import cliSpinners from 'cli-spinners'
import ora, {Ora} from 'ora'

let spinner: Ora | null = null

const logger = {
  done(message: string) {
    if (!spinner) {
      spinner = ora({
        spinner: cliSpinners.aesthetic,
        text: message,
      })
    }

    spinner.succeed(message)
    spinner = null
  },

  log(message: string) {
    if (spinner) {
      spinner.text = message
      return
    }

    spinner = ora({
      spinner: cliSpinners.aesthetic,
      text: message,
    })

    spinner.start()
  },
}

export function getLogger() {
  return logger
}
