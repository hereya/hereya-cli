import {ListrLogger, ListrLogLevels} from 'listr2'

const myLogger = new ListrLogger({useIcons: false})

const logger = {
  done(message: string) {
    myLogger.log(ListrLogLevels.COMPLETED, message)
  },

  log(message: string) {
    myLogger.log(ListrLogLevels.OUTPUT, message)
  },
}

export function getLogger() {
  return logger
}
