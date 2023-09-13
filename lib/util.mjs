import fs from 'fs'

import chalk from 'chalk'

class KnownUID {
  
  constructor() {
    this.known = {}
    this._rlookup = new Map()
    this.load()
  }
  
  load() {
    try {
      const names = JSON.parse(fs.readFileSync('./known-names.json').toString())
      this.known = names
      this.buildReverseMap()
    } catch(e) {}
  }
  save() {
    fs.writeFileSync('./known-names.json', JSON.stringify(this.known, null, 2))
  }
  buildReverseMap() {
    this._rlookup = new Map(Object.entries(this.known).map(([ k, v ]) => [ v.login, k ]))
  }
  
  record(login, { display_name, user_id, color }) {
    if(login == null)
      return
    let resolved = this.resolve(user_id)
    if(resolved && !color && resolved.color)
      return

    this.known[user_id] = { login, display_name, color }
    this._rlookup.set(login, user_id)
    this.save()
  }

  uid(login) {
    return this._rlookup.get(login)
  }
  resolve(id) {
    return this.known[id]
  }
  login(id) { return this.resolve(id)?.login }
  name(id) {
    const resolved = this.resolve(id)
    return resolved?.display_name ?? resolved?.login
  }
  color(id) { return this.resolve(id)?.color }
}

export const uid = new KnownUID()



export const ts = (d = new Date()) => [
  d.getHours(),
  d.getMinutes(),
  d.getSeconds()
].map(_ => _.toFixed(0).padStart(2, '0')).join(':')

export const tagsToReadable = tags => 
  Object.entries(tags)
    .map(_ => {
      //if(_[1].length > 20)
      //  return `${_[0]}=${chalk.whiteBright(_[1].slice(0, 20))}...${_[1].length}c more`
      return _[0] + '=' + chalk.whiteBright(_[1])
    })
    .join(', ')

export const secondsToReadable = seconds => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}분 ${sec}초`
}

export const getReplyHeader = message => {
  let payload = ''
  if(message.tags?.id)
    payload += `@reply-parent-msg-id=${message.tags?.id} `

  payload += `PRIVMSG ${message.params} :`

  return payload
}