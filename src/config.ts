import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { copySync } from 'fs-extra';


const HOME_DIR: string = homedir();
export const CONFIG_DIR: string = path.join(HOME_DIR, '.zoe');
export const CONFIG_FILE_PATH: string = path.join(CONFIG_DIR, 'config.yml');
export const PROGRESS_FILE_PATH: string = path.join(CONFIG_DIR, 'progress.log');

export function createConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR);
    copySync(path.join(__dirname, '../config.yml'), CONFIG_FILE_PATH);
  }
}
