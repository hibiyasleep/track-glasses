import * as util from '../../lib/util.mjs'

export default {
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
}