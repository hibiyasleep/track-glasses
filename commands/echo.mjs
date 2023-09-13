export default [{
  name: 'echo',
  type: 'chat',
  test: (m, { config }) =>
	 config.admin.includes(m.source?.nick)
  && /^!echo /.test(m.content),
  run(m, { chats }) {
    chats.send(`PRIVMSG ${m.params} :${m.content.slice(6)}`)
  }
}, {
  name: 'raw',
  type: 'chat',
  test: (m, { config }) =>
	 config.admin.includes(m.source?.nick)
  && /^!raw /.test(m.content),
  run(m, { chats }) {
    chats.send(m.content.slice(5))
  }
}]