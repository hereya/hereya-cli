import { Executor } from "./interface.js";
import { LocalExecutor } from "./local.js";

export const localExecutor = new LocalExecutor()


export function getExecutor(): GetExecutorOutput {
  return {
    executor: localExecutor,
    success: true,
  }
}



export type GetExecutorOutput =
  | {
      executor: Executor
      success: true
    }
  | {
      reason: string
      success: false
    }
