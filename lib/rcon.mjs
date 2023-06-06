import EventEmitter from 'events'
import net from 'net'

import * as util from './util.mjs'
import Logger from './logger.mjs'

const log = new Logger('mcr')

export class RCON extends EventEmitter {
  
  constructor({ id, host, port, ...config }) {
    super()
    this.id = id
    this.conn = { host, port }
    this.config = config

    this.socket = null

    this._retries = 3
    this._reqid = 0
    this._calls = {}
  }

  connect() {
    if(this.socket) {
      this.socket?.destroy()
      this.socket = null
    }
    this.socket = net.connect(this.conn, () => {
      this._retries = 3
      this.auth()
    })
    this.socket.on('data', d => {
      this.recv(d)
    })
    this.socket.on('error', e => {
      this._clear()
      log({
        objective: this.id,
        command: e.code
      }, `trying to reconnect after 1 second... (remaining retries: ${this.retries})`)
      --this.retries && setTimeout(() => this.connect(), 1000)
      if(!this.retries) {
        this.socket?.destroy()
        this.socket = null
      }
    })
  }
  
  get reqid() {
    return this._reqid++
  }
  
  get connected() { // TODO
    return (
      this.socket &&
     !this.socket.destroyed
    )
  }

  //

  _queue(reqid, resolve, reject) {
    const timer = setTimeout(() => {
      this._calls[reqid]?.reject()
      delete this._calls[reqid] 
    }, this.config.timeout ?? 6000)

    this._calls[reqid] = { timer, resolve, reject }
  }

  _resolve(reqid, payload) {
    const call = this._calls[reqid]
    if(!call)
      return

    clearTimeout(call.timer)
    call.resolve(payload)
    delete this._calls[reqid]
  }

  _clear() {
    for(let reqid in this._calls) {
      const call = this._calls[reqid]
      if(!call)
        continue
      call.reject()
      delete this._calls[reqid]
    }
  }

  //

  send(type, payload, silent=false) {
    return new Promise((resolve, reject) => {
      let reqid = this.reqid
      if(silent)
        reqid += 0x1000000

      const packet = this._pack(payload, reqid, type)
      this.socket?.write(Buffer.from(packet))

      if(silent) {
        resolve()
      } else {
        if(type === 2)
          this._queue(reqid, resolve, reject)

        log({
          objective: this.id,
          command: 'REQ',
          verb: type,
          params: '#' + reqid
        }, payload)
      }
    })
  }

  recv(d) {
    const payload = this._unpack(d)
    if(payload.reqid < 0x1000000)
      log({
        objective: this.id,
        command: 'ACK',
        verb: payload.type,
        params: '#' + payload.reqid
      }, payload.payload)
    if(payload.type === 0)
      this._resolve(payload.reqid, payload.payload)
  }

  auth() {
    this.send(3, this.config.pass)
  }
  
  //
  
  _numToIntLE(n) {
    return [0, 8, 16, 24].map(x => (n >>> x) & 0xff)
  }
  
  _strToByte(s) {
    return new Uint8Array(Buffer.from(s))
  }

  _pack(payload, id = -1, type = 2) {
    const _payload = [
      ...this._numToIntLE(id),
      ...this._numToIntLE(type),
      ...this._strToByte(payload),
      0x00,
      0x00
    ]
    
    return new Uint8Array([
      ...this._numToIntLE(_payload.length),
      ..._payload
    ])
  }
  
  _unpack(d) {
    const view = new DataView((new Uint8Array(d)).buffer)

    const length = view.getInt32(0, true)
    const reqid = view.getInt32(4, true)
    const type = view.getInt32(8, true)
    const payload = Buffer.from(view.buffer.slice(12, length + 2)).toString('utf-8')

    return { length, reqid, type, payload }
  }
  
  disconnect() {
    this.socket?.destroy()
  }
}

export default class RCONConnetcions extends EventEmitter {
  
  constructor(config) {
    super()
    this.setup(config)
  }

  setup(config) {
    if(this.connections) {
      for(const [ id, conn ] of this.connections) {
        conn.disconnect()
      }
    }

    this.connections = new Map(config.connections.map(conn => {
      const rcon = new RCON(conn)
      return [ conn.id, rcon ]
    }))
    
    this.channels = config.channels
    this.ignore = config.ignore

    this._channel_lookup = config.connections.flatMap(conn =>
      conn.channels.map(chan => [ conn.id, chan ])
    ).reduce((p, [ id, chan ]) => {
      if(p[id])
        p[chan].push(id)
      else
        p[chan] = [ id ]
      return p
    }, {})
  }
  
  reload(config) {
    this.setup(config)
    this.connectAll()
  }
  
  connect(id) {
    this.connections.get(id)?.connect()
  }
  
  connectAll() {
    for(const [id, rcon] of this.connections) {
      rcon.connect()
    }
  }
  
  //
  
  getRoutableRCONs(chan) {
    const login = chan.startsWith('#')? chan.slice(1) : chan
    const ids = this._channel_lookup[login]
    if(!ids)
      return
    
    const conns = ids
      .map(_ => this.connections.get(_))
      .filter(_ => _.connected)
    
    return conns.length? conns : null
  }
}