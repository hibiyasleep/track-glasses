import * as util from '../../lib/util.mjs'

export default {
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
}