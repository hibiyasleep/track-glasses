import axios from 'axios'
import * as util from '../lib/util.mjs'

class NightbotClient {

  constructor(account, config, token) {
    this.account = account
    this.config = config
    this.token = token?.access_token

    this.headers = {
      'Content-Type': 'application/json'
    }

    if(config.id)
      this.headers['Nightbot-Channel'] = config.id
    if(this.token)
      this.headers.Authorization = 'bearer ' + this.token

    this.request = axios.create({
      baseURL: 'https://api.nightbot.tv/',
      headers: this.headers
    })
  }

  hasAuth() {
    if(this.token) {
      return this
    }
  }

  songEntryToString(entry) {
    return `"${entry.track.title}" by ${entry.track.artist}`
  }
  getQueueDuration(queue) {
    return util.secondsToReadable(queue.reduce((p, c) => p + c.track.duration, 0))
  }
}

export default class NightbotClientWrapper {

  accounts = {}

  constructor(config, tokens) {
    for(const account in config) {
      this.accounts[account] = new NightbotClient(account, config[account], tokens[account])
    }
  }

  as(channel) {
    return this.accounts[channel] ?? {}
  }

  byMessage(message) {
    const found = this.accounts[message.params.slice(1)]
    if(found) {
      return found
    }
  }
  byRedemption(redemption) {
    const login = util.uid.login(redemption.channel_id)
    const found = this.accounts[login]
    if(redemption.reward.id === found?.config?.promoteReward) {
      return found
    }
  }
}