import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { ipcRenderer } from 'electron'


const config = yaml.safeLoad(
  fs.readFileSync(path.join(__dirname, '../config.yml'), 'utf8')
)

const ACCESS_KEY = <HTMLInputElement>document.getElementById('ACCESS_KEY')
const SECRET_KEY = <HTMLInputElement>document.getElementById('SECRET_KEY')
const bucket = <HTMLInputElement>document.getElementById('bucket')
const bucketUrl = <HTMLInputElement>document.getElementById('bucketUrl')
const markdown = <HTMLInputElement>document.getElementById('markdown')

ACCESS_KEY.value = config.ACCESS_KEY
SECRET_KEY.value = config.SECRET_KEY
bucket.value = config.bucket
bucketUrl.value = config.bucketUrl
markdown.checked = config.markdown

const button = document.getElementById('submit')
button.onclick = () => {
  const config = {
    'ACCESS_KEY': ACCESS_KEY.value,
    'SECRET_KEY': SECRET_KEY.value,
    'bucket': bucket.value,
    'bucketUrl': bucketUrl.value,
    'markdown': markdown.checked ? true : false,
  }
  fs.writeFileSync(path.join(__dirname, '../config.yml'), yaml.safeDump(config), 'utf8')
  ipcRenderer.send('configDone', '')
}
