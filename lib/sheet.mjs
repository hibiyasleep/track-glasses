import { JSDOM } from 'jsdom'
import axios from 'axios'

const SHEET_URL = 
const SHEET_MAPPING = {
  '4': '0',
  '5': '1602629531',
  '6': '87242412',
  '8': '1815765540'
}

export default class GoogleSheet {
  //
  constructor(id) {
    this.url = `https://docs.google.com/spreadsheets/d/${id}/htmlview`
    this.cached = null
    this.cachedTime = -1
  }