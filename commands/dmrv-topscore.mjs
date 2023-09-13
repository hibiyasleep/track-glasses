import { JSDOM } from 'jsdom'
import axios from 'axios'

import ALIASES from './dmrv-aliases.mjs'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/16Lece3Rbov14mb6Jf7C8iCrDDr6lyXkn-pra8QJPcaw/htmlview'
const SHEET_MAPPING = {
  '4': '0',
  '5': '1602629531',
  '6': '87242412',
  '8': '1815765540'
}

let cache = null
let lastCached = -1

const parseCommand = message => {
  let match, title, button, pattern

  ;[match, title, button, pattern] = /^!(?:전일|wjsdlf) (.+?) ?([4568])[bk ]?(mx|sc)?$/i.exec(message) || []
  if(match) {
    title = ALIASES[title] || title
    return [ title.toLowerCase(), button, pattern?.toUpperCase() ?? '' ]
  }
  
  ;[match, button, title] = /^!(?:전일|wjsdlf) ([4568])(.+?)$/i.exec(message) || []
  if(match) {
    title = ALIASES[title] || title
    return [ title.toLowerCase(), button, '' ]
  }

  return []
}

export default [{
  name: 'drmv-topscore',
  type: 'chat',
  cooldown: 2000,
  test: m => /^!(전일|wjsdlf) /i.test(m.content),
  async run(m, { chats }) {
    
    const [title, button, pattern] = parseCommand(m.content)
    if(!title)
      return

    if(!cache || (Date.now() - lastCached > 10 * 60 * 1000)) {
      cache = (await axios.get(SHEET_URL)).data
      lastCached = Date.now()
    }
    const { document } = new JSDOM(cache).window

    const found = [
      ...document.querySelectorAll(`[id="${SHEET_MAPPING[button]}"] tbody > tr`)
    ].sort((a, b) =>
      a.childNodes[2].textContent.length - b.childNodes[2].textContent.length
    ).find(_ =>
       _.childNodes[2].textContent.toLowerCase().includes(title)
    && _.childNodes[4].textContent.includes(pattern)
    )
    if(!found)
      return

    const foundTitle = found.childNodes[2].textContent
    const foundPattern = found.childNodes[4].textContent
    const foundScore = found.childNodes[5].textContent
    const foundPercent = found.childNodes[6].textContent
    const foundPlayer = found.childNodes[7].textContent

    chats.send(
      `@reply-parent-msg-id=${m.tags?.id} PRIVMSG ${m.params} :`
    + `${foundTitle} ${button}B ${foundPattern}: ${foundPercent} ${foundScore} (${foundPlayer})`
    )
  }
}]