import EventEmitter from 'events'

import chalk from 'chalk'
import WebSocket from 'ws'

import * as util from './util.mjs'
import Logger from './logger.mjs'

const REGEXES = {
  line: /^(?:@(?<tags>(?:.+?=.*?)(?:;.+?=.*?)*) )?(?::(?<source>[^ ]+?) )?(?<command>[0-9]{3}|[a-zA-Z]+)(?: (?<params>.+?))?(?: :(?<content>.*))?$/,
  user: /^(?:(?<nick>[^\s]+?)!(?<user>[^\s]+?)@)?(?<host>[^\s]+)$/
}

const log = new Logger('irc')

export default class IRC extends EventEmitter {

  constructor(token) {
    super()
    this.token = token
    this.setup()
  }

  setup() {
    if(this.ws) {
      this.ws?.close()
    }

    this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv/')

    this.ws.onmessage = d => {
      const messages = d.data.split('\r\n')
      messages.forEach(message => this.onmessage(message))
    }
    this.ws.onopen = () => this.initate()
    this.ws.onclose = () => this.onclose()
  }

  initate() {
    this.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands')
    this.send(`PASS oauth:${this.token.access_token}`)
    this.send('NICK hibiya_bot')
    this.emit('connect')
  }

  parse(d, modify=true) {
    const { groups: match } = REGEXES.line.exec(d) ?? {}
    if(!match) return

    switch(match.command) {
      case 'PING':
        this.ws.send(`PONG ${match.params}`)
        return
      case 'PRIVMSG':
        if(match.content.startsWith('\x01ACTION') && modify) {
          match.content = match.content.slice(8, -1)
          match.isAction = true
        }
    }

    const tags = match.tags
     ?.split(/(?<!\\);/)
      .map(_ => _.split(/(?<!\\)=/))
      .map(([a, ...b]) => [
        a.replaceAll('-', '_'),
        b.join('=')
      ]) ?? []
    match.tags = tags.length? Object.fromEntries(tags) : null

    match.source = {
      full: match.source,
      ...(REGEXES.user.exec(match.source)?.groups ?? {})
    }

    return match
  }

  onmessage(payload) {
    const parsed = this.parse(payload)
    if(!parsed)
      return

    this.log(parsed)
    this.emit('message', parsed)
    this.emit(parsed.command, parsed)
  }

  send(payload) {
    this.ws.send(payload)
    const parsed = this.parse(payload, true)
    this.log(parsed, true)
  }

  log({ tags, source, command, params, content }, sent=false) {
    const now = new Date().toISOString().slice(11, 19)

    const name = tags?.display_name ?? source?.nick ?? ''
    const uid = tags?.user_id ?? util.uid.uid(source?.nick)

    const string = (() => {
      const f = {
        params: chalk.yellow(params),
        command: chalk.blueBright(command),
        name: tags?.color? chalk.hex(tags?.color)(name) : name,
        content: chalk.whiteBright(content)
      }

      if(/^[0-9]{3}$/.test(command))
        return

      switch(command) {
        case 'PRIVMSG':
          tags && !sent && util.uid.record(source.nick, tags)
          const payload = {
            objective: params,
            user: name,
            userColor: tags?.color,
            parentheses: '<>'
          }

          if(command === 'WHISPER') {
            payload.objective = name
            payload.user = '>>>'
            payload.parentheses = ''
          }
          if(sent) {
            payload.command = '<<<'
          }
          if(content.startsWith('ACTION')) {
            payload.parentheses = ' '
            f.content = chalk.hex(tags.color)(content.slice(8, -1))
          }
          return log(payload, f.content)

        case 'JOIN':
        case 'PART':
          return log({
            objective: params,
            user: util.uid.name(uid) ?? name,
            userColor: util.uid.color(uid),
            command,
            parentheses: ' '
          })

        case 'CLEARCHAT':
          return log({
            objective: params,
            user: chalk.strikethrough(util.uid.name(uid) ?? content),
            userColor: util.uid.color(uid),
            parentheses: '--',
            command,
            verb: 'for',
            params: (tags.ban_duration ?? '---') + 's'
          })

        case 'CAP':
          return log({ command, params, content })
        case 'PASS':
          return log({ command, params: params.slice(0, 7) + '*'.repeat(params.length - 7) })

        case 'GLOBALUSERSTATE':
          return log({ command }, '...')
        case 'USERSTATE':
          return
        //  return log({ objective: params, command }, '...')
        case 'ROOMSTATE':
          return log({ objective: params, command }, util.tagsToReadable(tags))

        default:
          return log({ command, params }, [
            source.full,
            content,
            tags? `(tags: ${util.tagsToReadable(tags)})` : ''
          ].join(' '), sent? false : true)
      }
    })()

    if(string)
      if(sent)
        log('<' + string)
      else
        log('>' + string)
  }

  onclose() {
    log(`${chalk.redBright('ERR')} disconnected, trying to reconnect soon...`)
    setTimeout(() => this.setup(), 1000)
  }

  static parseEmotes(text, emotes) {
    if(!emotes)
      return [
        { type: 'text', text }
      ]

    let ranges = emotes.split('/')
      .map(emote => emote.split(':'))
      .flatMap(([ id, range ]) =>
        range.split(',').map(_ =>
          [ id, ..._.split('-').map(_ => Number(_)) ]
        )
      )
      .sort((a, b) => a[1] - b[1])
      .reduce((chunks, [id, from, to], i, l) => {
        if(i === 0 && from > 0)
          chunks.push({
            type: 'text',
            text: text.slice(0, from)
          })
        chunks.push({
          type: 'emote',
          id,
          text: text.slice(from, to + 1)
        })
        chunks.push({
          type: 'text',
          text: text.slice(to + 1, l[i + 1]?.[1])
        })

        return chunks
      }, [])
      .filter(_ => _.text)

    return ranges
  }

}