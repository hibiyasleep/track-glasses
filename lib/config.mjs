import fs from 'fs'

class Config {
  
  constructor(path='./config.json') {
    this.config = {}
    this.path = path
  }
  
  load() {
    this.config = JSON.parse(fs.readFileSync(this.path))
  }
  save() {
    fs.writeFileSync(this.path, JSON.stringify(this.config, null, 2))
  }
}


export default new Config()