import * as util from '../../lib/util.mjs'

export default {
  name: 'nightbot-when',
  type: 'chat',
  test: (message, { config, nightbot }) => {
    const matched = /^!(?:songqueue|sq|ㄴㅂ|대기열|mysongwhen|songwhen|언제나옴|ㅇㄷ) ?(.*)$/.exec(message.content)
    const found = nightbot.byMessage(message)
    return matched && found? { matched, nightbot: found } : null
  },
  async run(m, { chats }, { matched, nightbot }) {
    let message = util.getReplyHeader(m)
    const query = matched[1]?.toLowerCase() ?? ''

    const { data: { settings } } = await nightbot.hasAuth()?.request?.get('/1/song_requests') ?? { data: {} }
    const { data: { queue } } = await nightbot.request.get('/1/song_requests/queue')

    if(queue.length < 1) {
      chats.send(message + `대기열이 비어있습니다.`)
      return
    }
    
    const filter = (() => {
      const idx = Number(query)
      if(/^\d+$/.test(query) && idx < queue.length)
        return (entry, i) => i === (idx - 1)
      else if(query)
        return entry => entry.track.title.toLowerCase().includes(query)
      else
        return entry => entry.user.providerId === m.tags.user_id
    })(matched[1])

    const indexesYouHavePut = queue
      .map((entry, i) => filter(entry, i)? i : null)
      .filter(_ => _ != null)

    if(queue.length < 1)
      return chats.send(message + `큐가 비어있습니다.`)
    else if(indexesYouHavePut.length < 1)
      return chats.send(message + `신청하신 !sr이 없습니다.`)

    const queueAhead = queue.slice(0, indexesYouHavePut[0] ?? 0)

    if(indexesYouHavePut.length) {
      if(queueAhead.length)
        message += `앞에 ${queueAhead.length}곡 - ${nightbot.getQueueDuration(queueAhead)}`
      else
        message += `바로 다음`

      if(!query)
        if(settings)
          message += ` (내 곡 ${indexesYouHavePut.length}/${settings.limits.user}개)`
        else
          message += ` (내 곡 ${indexesYouHavePut.length}개)`
    }

    message += ` https://nightbot.tv/t/${m.params.slice(1)}/song_requests`

    chats.send(message)
  }
}