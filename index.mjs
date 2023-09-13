import fs from 'fs'
import EventEmitter from 'events'

import chalk from 'chalk'

import * as util from './lib/util.mjs'
import Logger from './lib/logger.mjs'

import TrackRedemptions from './lib/track-redemptions.mjs'
import IRC from './lib/irc.mjs'
import ConfirmedTimer from './lib/confirmed-timer.mjs'
import RCONManager from './lib/rcon.mjs'
import NightbotClient from './lib/nightbot.mjs'

import commands from './commands/index.mjs'

//

const log = new Logger('tmr')

const config = JSON.parse(fs.readFileSync('./config.json'))

const TOKENS = JSON.parse(fs.readFileSync('./.tokens.json'))
const TOKEN = { ...TOKENS.twitch.app, ...TOKENS.twitch.hibiya_bot }

//

const redeems = new TrackRedemptions(TOKEN) // , TARGET.uid)
const chats = new IRC(TOKEN)
// const timer = new ConfirmedTimer(payload => commands.run('timer', payload))
const rconmgr = new RCONManager(config.mc)
const nightbot = new NightbotClient(config.nightbot, TOKENS.nightbot)

redeems.on('message', payload => {
  commands.run('pubsub', payload)
})

chats.on('connect', () => {
  for(const channel of config.channels) {
    chats.send(`JOIN #${channel}`)
  }
})

chats.on('message', m => { commands.run('irc-raw', m) })

chats.on('PRIVMSG', async m => { commands.run('chat', m) })

chats.on('ROOMSTATE', m => {
  // util.uid.record(m.params.slice(1), { user_id: m.tags.room_id })
  redeems.uids.add(m.tags.room_id)
  redeems.listen()
})

commands.registerContext({ chats, redeems, log, config, rconmgr, nightbot })
redeems.setup()
rconmgr.connectAll()