import fs from 'fs'

import * as util from '../lib/util.mjs'

export default [{
  name: 'reload',
  type: 'chat',
  test: (message, { config }) =>
     config.admin.includes(message.source?.nick)
  && message.content === '!reload',
  async run(m, ctx) {
    const config = JSON.parse(fs.readFileSync('./config.json'))
    this.registerContext({ config })
    
    ctx.rconmgr.reload(ctx.config.mc)
  }
}]