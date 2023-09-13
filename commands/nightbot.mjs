import * as util from '../lib/util.mjs'

const getQueueDuration = queue => util.secondsToReadable(queue.reduce((p, c) => p + c.track.duration, 0))
const EMPTY_RESPONSE = { data: {} }

export default [{
  name: 'nightbot-wrongsong',
  type: 'chat',
  test: (message, { config, nightbot }) => (
     /^!(wrongsong|우롱송)$/.test(message.content)
  && nightbot.byMessage(message)?.hasAuth()
  ),
  async run(m, { chats, log }, nightbot) {
    const header = util.getReplyHeader(m)

    const { data: { queue } } = await nightbot.request.get('/1/song_requests/queue')
    const found = queue.findLast(entry => m.tags.user_id === entry.user.providerId)

    if(!found) {
      chats.send(header + '우롱할 송이 없습니다.')
      return
    }

    try {
      await nightbot.request.delete('/1/song_requests/queue/' + found._id)
    } catch(e) {
      chats.send(header + e.message)
      return
    }
    chats.send(header + `→ ${nightbot.songEntryToString(found)}를 ${found._position}번 순서에서 지웠습니다. ${found.track.url}`)
  }
}, {
  name: 'nightbot-list',
  type: 'chat',
  test: (message, { config, nightbot }) => (
     /^!(sl|니)$/.test(message.content)
  && nightbot.byMessage(message)
  ),
  async run(m, { chats }, nightbot) {
    let message = util.getReplyHeader(m)

    const { data: { settings } } = await nightbot.hasAuth()?.request?.get('/1/song_requests') ?? EMPTY_RESPONSE
    const { data: { queue } } = await nightbot.request.get('/1/song_requests/queue')

    message += `대기열 ${queue.length}곡 - ${getQueueDuration(queue)}`

    if(settings?.enabled)
      message += ` (${settings.limits.queue}곡까지, 인당 ${settings.limits.user}곡)`
    else if(settings)
      message += ` (신청 마감)`

    message += ` https://nightbot.tv/t/${m.params.slice(1)}/song_requests`

    chats.send(message)
  }
}, {
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

    const { data: { settings } } = await nightbot.hasAuth()?.request?.get('/1/song_requests') ?? EMPTY_RESPONSE
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
    // message += `대기열 ${queue.length}곡 - ${getQueueDuration(queue)}`

    if(indexesYouHavePut.length) {

      if(queueAhead.length)
        message += `앞에 ${queueAhead.length}곡 - ${getQueueDuration(queueAhead)}`
      else
        message += `바로 다음`

      if(!query)
        if(settings)
          message += ` (내 곡 ${indexesYouHavePut.length}/${settings.limits.user}개)`
        else
          message += ` (내 곡 ${indexesYouHavePut.length}개)`
    }

    message += ` https://nightbot.tv/t/${nightbot.channel}/song_requests`

    chats.send(message)
  }
}, {
  name: 'nightbot-skip',
  type: 'chat',
  test: (message, { config, nightbot }) => (
     /^!(skip|스킵)$/.test(message.content)
  && nightbot.byMessage(message)
  ),
  async run(m, { chats }, nightbot) {
    let message = util.getReplyHeader(m)
    
    const { data: { _currentSong: entry } } = await nightbot.request.get('/1/song_requests/queue')

    if(m.tags.user_id === entry.user.providerId) {
      await nightbot.request.post('/1/song_requests/queue/skip')
      message += `${nightbot.songEntryToString(entry)}를 스킵합니다.`
    } else {
      message += `자신이 넣은 !sr이 재생 중일 때만 스킵할 수 있습니다.`
    }
    
    chats.send(message)
  }
}, {
  name: 'nightbot-promote',
  type: 'pubsub',
  test: ({ type, redemption }, { config, nightbot }) => (
     type === 'reward-redeemed'
  && nightbot.byRedemption(redemption)?.hasAuth()
  ),
  async run({ redemption }, { chats, timer }, nightbot) {
    const login = redemption.user.login
    let message = `PRIVMSG #${util.uid.login(redemption.channel_id)} :@${login} `

    const { data: { queue } } = await nightbot.request.get('/1/song_requests/queue')

    const found = queue.findLast(entry => login === entry.user.name)

    if(!found) {
      message += `저런! 돈을 먹었네요! [넣은 !sr이 없음]`
    } else if(found._position === 1) {
      message += `저런! 돈을 먹었네요! [끌어올릴 !sr이 이미 1번임]`
    } else {
      try {
        await nightbot.request.post(`/1/song_requests/queue/${found._id}/promote`)
        message += `→ ${nightbot.songEntryToString(found)}를 ${found._position}번째 순서에서 맨 위로 옮겼습니다.`
      } catch(e) {
        message += `어라라. [${e.message}]`
      }
    }

    chats.send(message)
  }
}]