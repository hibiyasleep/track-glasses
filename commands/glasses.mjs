import * as util from '../lib/util.mjs'

export default [{
  name: 'glasses',
  type: 'chat',
  test: (message, ctx) =>
     message.params === ('#' + ctx.config.redemption.channel)
  && ctx.timer.running
  && ctx.config.redemption.megane_dan.includes(message.source?.nick)
  && new RegExp(ctx.config.redemption.trigger).test(message.content),
  run(m, { chats, log, timer }) {
    if(timer.confirm())
      return

    log({
      objective: '#' + util.uid.login(timer.payload.channel_id),
      command: 'TIMER',
      params: 'confirmed'
    }, `${Math.round((timer.at - Date.now()) / 1000)}s left`)
  }
}, {
  name: 'glasses-cancel',
  type: 'chat',
  test: (message, ctx) => 
     message.params === ('#' + ctx.config.redemption.channel)
  && ctx.timer.running
  && ctx.config.redemption.megane_dan.includes(message.source?.nick)
  && /^!취소$/.test(message.content),
  run(m, { log, timer }) {
    timer.reset()
    log({
      objective: timer?.payload?.channel_id,
      command: 'TIMER',
      params: 'reset'
    }, 'upon request')
  }
}, {
  name: 'glasses-track',
  type: 'redeem',
  test: (redemption, ctx) =>
     redemption.reward.id === ctx.config.redemption.id
  && !ctx.config.redemption.megane_dan.includes(redemption.user.login),
  run(redemption, { log, timer }) {
    const against = ``
    const expiresAt = new Date(redemption.reward.cooldown_expires_at)
    const timeout = expiresAt - new Date()

    timer.setTimeout(expiresAt, redemption)

    log({
      objective: '#' + util.uid.login(timer.payload.channel_id),
      command: 'TIMER',
      verb: 'set',
      params: `${~~(timeout / 1000).toString()}s`
    }, `against redemption of ${timer.redemptionLabel}, awaiting confirmation.`)
  }
}, {
  name: 'glasses-reminder',
  type: 'timer',
  test: () => true,
  run(payload, { chats, log, timer, config }) {
    const channel = '#' + util.uid.login(payload.channel_id)

    log({
      objective: channel,
      command: 'TIMER',
      params: 'invoked'
    }, `against redemption of ${timer.redemptionLabel}!`)
    
    if(timer.confirmed) {
      chats.send(`PRIVMSG ${channel} :${config.redemption.message}`)
    }
  }
}]