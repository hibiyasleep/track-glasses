import EventEmitter from 'events'

import chalk from 'chalk'
import WebSocket from 'ws'

import * as util from './util.mjs'
import Logger from './logger.mjs'

const log = new Logger('p/s')

const summarizeRewardStatus = reward => {
  const tags = {
    enabled: +reward.is_enabled,
    paused: +reward.is_paused,
    in_stock: +reward.is_in_stock
  }
  if(reward.cooldown_expires_at) {
    tags.cd = Math.round((new Date(reward.cooldown_expires_at) - new Date()) / 1000) + 's'
  }
  return util.tagsToReadable(tags)
}

export default class TrackRedemption extends EventEmitter {

  constructor(token, uid) {
    super()
    this.token = token
    this.uids = new Set(uid? [uid] : [])
    this.listenTimer = null
    this.listenTimeout = 100
    // this.setup()
  }

  get topics() {
    return [...this.uids].flatMap(uid => [
      'community-points-channel-v1',
      // 'predictions-channel-v1'
    ].map(_ => `${_}.${uid}`))
  }

  setup() {
    if(this.ws) {
      try {
        this.ws?.close()
      } catch(e) {}
    }
    clearInterval(this.pingTimer)

    this.ws = new WebSocket('wss://pubsub-edge.twitch.tv/v1')

    this.ws.onmessage = d => this.onmessage(d.data)
    this.ws.onopen = () => this.initiate()
    this.ws.onerror = () => this.onerror()
  }

  initiate() {
    this.send('PING')
    
    clearInterval(this.pingTimer)
    this.pingTimer = setInterval(() => this.send('PING'), 10000)
  }
  
  listen() {
    if(this.listenTimer)
      clearTimeout(this.listenTimer)
    this.listenTimer = setTimeout(() => this.send('LISTEN', { topics: this.topics }), this.listenTimeout)
  }

  send(type, data) {
    const payload = { type, data }

    if(!data) {
      delete payload.data
    } else if(type === 'LISTEN' && data) {
      payload.data.auth_token = this.token.access_token 
      payload.nonce = `LISTEN for ${data.topics}`
    }

    this.ws.send(JSON.stringify(payload))
  }

  onmessage(d) {
    const now = new Date().toISOString().slice(11, 19)

    const message = JSON.parse(d)

    switch(message.type) {
      case 'PING':
        return this.send('PONG')
      case 'PONG':
        return
      case 'RESPONSE':
        return log({
          command: 'RESPONSE',
          verb: message.error
        }, message.nonce)

      case 'RECONNECT':
        log({ command: 'RECONNECT' }, 'received, reconnecting...')
        return this.setup() // TODO

      case 'MESSAGE':
        const topic = message.data.topic
        const { type, data } = JSON.parse(message.data.message)
        let payload, reward, logOptions

        switch(type) {
          case 'reward-redeemed':
            payload ||= data.redemption
            logOptions ||= {
              parentheses: '>>'
            }
            this.emit('redeemed', data.redemption)

          case 'redemption-status-update':
            payload ||= data.redemption
            logOptions ||= {
              parentheses: '<<',
              command: 'redemption-update'
            }
            
          case 'custom-reward-updated':
            reward ||= data.updated_reward
            // cooltime_expires_at, etc...
            logOptions ||= {
              user: null,
              verb: null
            }
            // this.emit('reward-updated', data)

            reward ||= payload?.reward
            
            const user = payload?.user ?? data?.user

            log({
              objective: '#' + util.uid.login(reward.channel_id),
              user: user?.display_name,
              userColor: util.uid.color(user?.id),
              command: type,
              params: reward.title,
              parentheses: '--',
              ...logOptions
            }, `(${summarizeRewardStatus(reward)})`)

            break

          // prediction-result
          // event-updated
          case 'preduction-result':
          case 'event-updated':
            log({
              command: type
            }, 'known but uninspected topic')
            console.dir(data, { depth: 1 })
            return

          default:
            log({
              command: type
            }, 'unknown topic')
            console.dir(data)
        }
        break

      default:
        log(JSON.stringify(message))
    }
  }
  
  onerror() {
    log(`${chalk.redBright('ERR')} disconnected, trying to reconnect soon...`)
    setTimeout(() => this.setup(), 1000)
  }
}