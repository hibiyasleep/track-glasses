import fs from 'fs'

import chalk from 'chalk'

class KnownUID {
  
  constructor() {
    this.load()
  }
  
  load() {
    try {
      const names = JSON.parse(fs.readFileSync('./known-names.json').toString())
      this.known = names
    } catch(e) {}
  }
  save() {
    fs.writeFileSync('./known-names.json', JSON.stringify(this.known, null, 2))
  }
  
  record(login, { display_name, user_id, color }) {
    if(login == null)
      return
    let resolved = this.resolve(user_id)
    if(resolved && !color && resolved.color)
      return

    this.known[user_id] = { login, display_name, color }
    this.save()
  }

  resolve(id) {
    return this.known[id]
  }
  login(id) { return this.resolve(id)?.login ?? id }
  name(id) {
    const resolved = this.resolve(id)
    return resolved?.display_name ?? resolved?.login ?? id
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