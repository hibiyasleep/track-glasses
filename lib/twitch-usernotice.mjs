import * as util from './util.mjs'

const toUsername = (display_name, login) => {
  if(display_name === login) return display_name
  else return `${display_name} (${login})`
}

const tierToReadable = tier => Math.floor(tier / 1000) // FIXME

const nthGift = n => 
    n < 1?
    `!`
  : n === 1?
    `. 채널의 첫 번째 정기구독권 선물입니다!`
  : `. 채널에서 총 ${n}개를 선물하셨습니다!`

export default {
  resub: tags =>
    `${toUsername(tags.display_name, tags.login)}님이 `
  + `티어 ${tierToReadable(tags.msg_param_sub_plan)}을 `
  + `정기구독 중입니다. `
  + `${tags.msg_param_cumulative_months}개월 동안 구독 중입니다!`
  subgift: tags =>
    `${toUsername(tags.display_name, tags.login)}님이 `
  + `${toUsername(tags.msg_param_recipient_display_name,
                  tags.msg_param_recipient_user_name)}님에게 `
  + `티어 ${tierToReadable(tags.msg_param_sub_plan)} 정기구독권`
  + `을 선물했습니다`
  + nthGift(tags.msg_param_sender_count),
  submysterygift: tags =>
    `${toUsername(tags.display_name, tags.login)}님이 `
  + `${util.uid.login(tags.room_id)}의 커뮤니티에 `
  + `티어 ${tierToReadable(tags.msg_param_sub_plan)} 정기구독권 `
  + `${tags.msg_param_mass_gift_count}개를 선물했습니다`
  + nthGift(tags.msg_param_sender_count),
  communitypayforward: tags =>
    `${toUsername(tags.display_name, tags.login)}님이 `
  + `${toUsername(tags.msg_param_prior_gifter_display_name,
                  tags.msg_param_prior_gifter_user_name)}님에게 `
  + `받은 선물을 커뮤니티에 선행 나누기로 드립니다!`,
  raid: tags =>
    `${toUsername(tags.display_name, tags.login)}님이 `
  + `${tags.msg_param_viewerCount}명과 함께 레이드 중입니다.`
}