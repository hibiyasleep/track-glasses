import * as util from '../lib/util.mjs'

import * as BD from '../lib/bd.mjs'

export default [{
  name: 'sq',
  type: 'chat',
  test: m => /^!(대기열|sq|ㄴㅂ)$/.test(m.content),
  async run(m, { chats, log }) {
    const cid = m.params.slice(1)
    const header = `@reply-parent-msg-id=${m.tags?.id} PRIVMSG #${cid} :`

    const nick = m.tags?.display_name ?? m.source?.nick
    let payload = header
    
    const list = (await BD.getSongQueue(cid)).slice(1)
    if(list.length <= 1) {
      chats.send(payload + `대기열이 비어있습니다.`)
      return
    }

    const length = list.reduce((p, c) => p + c.length, 0)
    payload += `대기열 ${list.length - 1}곡, `
    payload += util.secondsToReadable(length)
  
    const theirNearestIndex = list.findIndex(i => i.requested_by === nick)
    const theirCount = list.filter(i => i.requested_by === nick).length

    if(theirNearestIndex >= 0) {
      payload += ` (내 곡 ${theirCount}개; `
      if(theirNearestIndex === 0) {
        payload += `바로 다음`
      } else {
        const subset = list.slice(1, theirNearestIndex + 1)
        const sublength = subset.reduce((p, c) => p + c.length, 0)
        payload += `앞으로 ${theirNearestIndex}곡, `
        payload += util.secondsToReadable(sublength)
      }
      payload += `)`
    }
    
    payload += ` https://bbang.unripesoft.com/song.php?streamer=${cid}`
    
    chats.send(payload)
    return
  }
}]