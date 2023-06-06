import echo from './echo.mjs'
import sq from './sq.mjs'
import mc from './mc.mjs'
import glasses from './glasses.mjs'
import dmrv from './dmrv-topscore.mjs'
import reload from './reload.mjs'

const MODULES = [
  ...echo,
  ...sq,
  ...mc,  
  ...glasses,
  ...dmrv,
  ...reload
]

export default {
  registerContext(ctx) {
    this.ctx = Object.assign(this.ctx || {}, ctx)
  },
  run(type, payload, ctx = this.ctx) {
    for(const module of MODULES) {
      try {
        if(type !== module.type)
          continue
        const tested = module.test(payload, ctx)
        if(!tested)
          continue

        module.run.call(this, payload, ctx, tested)
      } catch(e) {
        console.error(e)
        if(type === 'chat' && ctx?.config.admin.includes(payload?.source?.nick)) {
          ctx.chats.send(`@reply-parent-msg-id=${payload?.tags?.id} PRIVMSG ${payload?.params} :@${config.admin[0]} uncaught ${e.name} in module ${module.name} codeiePAZIZIK`)
        }
      }
    }
  }
}