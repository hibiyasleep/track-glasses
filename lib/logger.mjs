
import chalk from 'chalk'

import * as util from './util.mjs'

export default function Logger(type) {

  this.logRaw = (payload) => {
    console.log(`[${util.ts()} ${type}] ${payload}`)
  }

  return ({
    objective,
    command,
    user,
    userColor,
    parentheses,
    verb,
    params
  }, payload) => {
    let line = []

    if(objective != null)
      line.push(chalk.yellow(objective))
    if(user) {
      user = userColor? chalk.hex(userColor)(user) : chalk.bold(user)

      if(parentheses)
        line.push((parentheses[0] ?? '') + user + (parentheses[1] ?? ''))
      else
        line.push(user)
    }
    if(command != null)
      line.push(chalk.blueBright(command))
    if(verb != null)
      line.push(verb)
    if(params != null)
      line.push(chalk.cyanBright(params))
    if(payload != null)
      line.push(payload)
    
    this.logRaw(line.filter(_ => _ != null).join(' '))
  }
  
}