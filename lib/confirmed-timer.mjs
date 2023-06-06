import chalk from 'chalk'

export default class ConfirmedTimer {

  constructor(callback) {
    this.callback = callback
    this.reset()
  }
  
  reset() {
    clearTimeout(this.payload)
    this.timer = null
    this.at = null
    this.timeout = null
    this.confirmed = false
    this.payload = null
  }
  
  get running() {
    return !!this.timer
  }
  get redemptionLabel() {
    if(this.payload)
      return `${chalk.bold(this.payload.user.display_name)}` // (${this.payload.id})`
    else
      return '---'
  }

  setTimeout(at, payload) {
    this.reset()

    this.at = at
    const duration = at - Date.now() - 2000

    this.payload = payload    
    this.timer = setTimeout(() => {
      this.callback(this.payload, this.confirmed)
      this.reset()
    }, duration)
    
    return duration
  }
  
  confirm() {
    if(this.confirmed)
      return true
    
    this.confirmed = true
  }  
}