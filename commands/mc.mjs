import * as util from '../lib/util.mjs'

import IRC from '../lib/irc.mjs'

const formatters = {
  channelPrefix(rcon, config, id, ...suffix) {
    if(rcon.config.channels.length < 2)
      return []

    const resolved = util.uid.resolve(id)
    if(!resolved) return [id]

    const { text, color } = config.mc.channels[resolved.login]
    return [
      {
        text,
        color,
        hoverEvent: {
          action: 'show_text',
          contents: {
            text: resolved.display_name === resolved.login?
                  resolved.login
                : `${resolved.display_name} (${resolved.login})`
          }
        }
      },
      ...suffix
    ]
  },
  userFromChat(m) {
    return [{
      text: m.tags?.display_name ?? m.source?.nick,
      color: m.tags?.color ?? '#FFFFFF',
      hoverEvent: {
        action: 'show_text',
        contents: {
          text:
            `${m.tags?.display_name} (${m.source?.nick})`
          + m.tags.badges? `\n${m.tags.badges}` : ''
          // + `${JSON.stringify(m.tags)}`
        }
      }
    }]
  },
  userFromRedeem(user) {
    return [{
      text: user?.display_name,
      color: util.uid.color(user?.id) ?? '#FFFFFF'
    }]
  },
  koreanJosa(text, filled='을', empty='를', unknown='') {
    const [, last] = /([\uac00-\ud7a3])[^\uac00-\ud7a3a-zA-Z0-9 ]*$/
      .exec(text) ?? []
    if(!last) return ''

    const code = last.charCodeAt(0) - 0xac00
    return (0 <= code && code <= (0xd7a3 - 0xac00))?
      (code % 28)? filled : empty : unknown
  }
}

export default [{
  name: 'mc-relay-msg',
  type: 'chat',
  test: (message, { config, rconmgr }) => (
     message.command === 'PRIVMSG'
  && !config.mc.ignore?.includes(message.source?.nick)
  && !/^!(cmd|reconnect)/.test(message.content)
  && rconmgr.getRoutableRCONs(message.params)
  ),
  run(m, { config, rconmgr }, rcons) {
    const text = IRC.parseEmotes(m.content, m.tags?.emotes)

    for(const rcon of rcons) {
      const payload = [
        m.isAction? '*' : '[',
        ...formatters.channelPrefix(rcon, config, m.tags.room_id, '/'),
        ...formatters.userFromChat(m),
        m.isAction? ' ' : '] ',
        ...text.map(chunk => {
          const o = { text: chunk.text }
          if(chunk.type === 'emote')
            o.color = 'gray'
          if(m.isAction)
            o.italic = true /*color: m.tags?.color*/

          return o
        })
      ].filter(_ => _)
      rcon.send(2, `tellraw @a ${JSON.stringify(payload)}`, true)
    }
  }
}, {
  name: 'mc-relay-redeem',
  type: 'pubsub',
  test: ({ type, redemption }, { rconmgr }) =>
     type === 'reward-redeemed'
  && rconmgr.getRoutableRCONs(util.uid.login(redemption.channel_id)),
  run(redemption, { log, timer, config }, rcons) {
    for(const rcon of rcons) {
      const channel = util.uid.login(redemption.channel_id)
      const { reward, user } = redemption

      const payload = {
        text: '*',
        color: 'gray',
        extra: [
          ...formatters.channelPrefix(rcon, config, reward.channel_id, '/'),
          ...formatters.userFromRedeem(user),
          '님이 ',
          {
            text: reward.title,
            color: 'white',
            hoverEvent: {
              action: 'show_text',
              contents: [
                reward.title,
                { text: ` (\u23fc${reward.cost})`, color: 'dark_gray' },
                reward.prompt? '\n' + reward.prompt : ''
              ]
            }
          },
          formatters.koreanJosa(reward.title),
          ' 받았습니다',
          {
            text: ` \u23fc${reward.cost}`,
            color: 'dark_gray'
          }
        ]
      }
      rcon.send(2, `tellraw @a ${JSON.stringify(payload)}`, true)
    }
  }
}, {
  name: 'mc-relay-admin-cmd',
  type: 'chat',
  test: (message, { config, rconmgr }) =>
    (config.admin.includes(message.source?.nick)
  || message.params?.includes(message.source?.nick))
  && /^!cmd .+$/.test(message.content)
  && rconmgr.getRoutableRCONs(message.params),
  async run(m, { chats }, rcons) {
    const hasMultipleReply = rcons.length > 1

    const request = async rcon => {
      const response = await rcon.send(2, m.content.slice(5))
      const prefix = hasMultipleReply? `[${rcon.id}] ` : ''
      chats.send(`@reply-parent-msg-id=${m.tags?.id} PRIVMSG ${m.params} :${prefix}${response}`)
    }

    rcons.forEach(async (rcon, index) => {
      try {
        setTimeout(() => request(rcon), index * 1000)
      } catch(e) {}
    })
  }
}, {
  name: 'mc-relay-admin-reconnect',
  type: 'chat',
  test: (message) =>
     message.source?.nick === 'hibiya'
  && message.content === '!reconnect',
  run(m, { rconmgr }) {
    return rconmgr.connectAll()
  }
}]