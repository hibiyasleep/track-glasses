import * as util from '../../lib/util.mjs'

export default {
  name: 'nightbot-list',
  type: 'chat',
  test: (message, { config, nightbot }) => (
     /^!(sl|니)$/.test(message.content)
  && nightbot.byMessage(message)
  ),
  async run(m, { chats }, nightbot) {
    let message = util.getReplyHeader(m)

    const { data: { settings } } = await nightbot.hasAuth()?.request?.get('/1/song_requests') ?? { data: {} }
    const { data: { queue } } = await nightbot.request.get('/1/song_requests/queue')

    message += `대기열 ${queue.length}곡 - ${nightbot.getQueueDuration(queue)}`

    if(settings?.enabled)
      message += ` (${settings.limits.queue}곡까지, 인당 ${settings.limits.user}곡)`
    else if(settings)
      message += ` (신청 마감)`

    message += ` https://nightbot.tv/t/${m.params.slice(1)}/song_requests`

    chats.send(message)
  }
}