import * as util from '../lib/util.mjs'

export default [{
  name: 'ban-congrats',
  type: 'irc-raw',
  test: (message, { config }) =>
     message.command === 'CLEARCHAT'
  && config.ban_congrats.includes(message.params.slice(1)),
  async run(m, { chats }) {
    const duration = m.tags.ban_duration
    const name = util.uid.name(m.tags.target_user_id) ?? m.content

    chats.send(util.getReplyHeader(m) + `@${name} 님이 ${duration}초 사출당하셨습니다! 축하합니다!! `)
/*
[Object: null prototype] {
  tags: {
    ban_duration: '5',
    room_id: '560360134',
    target_user_id: '434763199',
    tmi_sent_ts: '1694426352364'
  },
  source: {
    full: 'tmi.twitch.tv',
    nick: undefined,
    user: undefined,
    host: 'tmi.twitch.tv'
  },
  command: 'CLEARCHAT',
  params: '#s2ch_',
  content: 'zeniuszerin'
}
    */
  }
}]