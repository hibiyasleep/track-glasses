import * as util from '../../lib/util.mjs'

export default {
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
}