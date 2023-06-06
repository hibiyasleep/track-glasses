import { JSDOM } from 'jsdom'
import axios from 'axios'

export const getSongQueue = async (login) => {
  const url = `https://bbang.unripesoft.com/song.php?streamer=${login}`
  const body = (await axios.get(url)).data
  const { document } = new JSDOM(body).window
  return [...document.body.querySelectorAll('tbody tr')]
    .map(_ => [..._.querySelectorAll('td')]
      .map(_ => _.textContent)
    )
    .map(l => ({
      title: l[1],
      requested_by: l[2],
      length: (() => {
        const [m, s] = l[4].split(':')
        return Number(m) * 60 + Number(s)
      })()
    }))
}