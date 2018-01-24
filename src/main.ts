import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { clipboard, ipcMain, Notification, nativeImage, Menu, MenuItemConstructorOptions } from 'electron';
import * as qiniu from 'qiniu';
import * as yaml from 'js-yaml';
const menubar = require('menubar');

import { CONFIG_DIR, CONFIG_FILE_PATH, PROGRESS_FILE_PATH, createConfigDir } from './config';


interface uploadOption {
  uptoken: string;
  key: string;
  localFile: string;
}

const VIDEO_TYPE: Array<string> = ['mp4', 'webm', 'ogg'];
const IMAGE_TYPE: Array<string> = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];


class Upload {
  config: any;

  constructor() {
    this.loadConfig();
    this.config.icon = nativeImage.createFromPath(
      path.join(__dirname, '../static/img/infinite@450.png')
    );
  }

  loadConfig(): void {
    this.config = yaml.safeLoad(
      fs.readFileSync(CONFIG_FILE_PATH, 'utf8')
    );
  }

  //构建上传策略函数
  uptoken(key: string): string {
    const options = {
      scope: `${this.config.bucket}:${key}`,
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const mac = new qiniu.auth.digest.Mac(
      this.config.ACCESS_KEY, this.config.SECRET_KEY
    );
    return putPolicy.uploadToken(mac);
  }

  // 获取文件的 hash 值
  sha1(path: string): string {
    const hash = crypto.createHash('sha1');
    const buffer = fs.readFileSync(path);
    hash.update(buffer);
    return hash.digest('hex');
  }

  uploadFile(option: uploadOption): void {
    const config = new qiniu.conf.Config();
    const resumeUploader = new qiniu.resume_up.ResumeUploader(config);
    const putExtra = new qiniu.resume_up.PutExtra(
      null, null, null, PROGRESS_FILE_PATH
    );
    resumeUploader.putFile(option.uptoken, option.key, option.localFile, putExtra, (respErr, respBody, respInfo) => {
      if (respErr) {
        // 上传失败， 处理返回代码
        const myNotification = new Notification({
          title: 'Zoe',
          body: '上传失败，请检查配置',
        });
        myNotification.show();
      } else {
        // 上传成功， 处理返回值
        if (respInfo.statusCode == 200) {
          const myNotification = new Notification({
            title: 'Zoe',
            body: '上传成功',
          });
          myNotification.show();
        } else {
          const myNotification = new Notification({
            title: 'Zoe',
            body: '上传失败，请检查配置',
          });
          myNotification.show();
        }
      }
    });
  }

  up(paths: string[]): void {
    let output: string = '';
    this.loadConfig();
    for (const filePath of paths) {
      const fileType = filePath.split('.').pop();
      const key = `${this.sha1(filePath)}.${fileType}`;
      const token = this.uptoken(key);
      this.uploadFile({
        uptoken: token,
        key,
        localFile: filePath,
      });
      const url = `${this.config.bucketUrl}${key}`;
      if (this.config.markdown){
        if (VIDEO_TYPE.includes(fileType)) {
          output += `<video controls style="width: 100%;"><source src="${url}" type="video/${fileType}"></video>\n`;
        } else if (IMAGE_TYPE.includes(fileType)){
          output += `![](${url})\n`;
        } else {
          output += `[${key}](${url})\n`;
        }
      }
      else {
        output += `${url}\n`;
      }
    }
    clipboard.writeText(output);
  }
}

createConfigDir();

const mb = menubar({
  // 'alwaysOnTop': true,
  dir: path.join(__dirname, '../static'),
  icon: path.join(__dirname, '../static/img/infinite.png'),
  preloadWindow: true,
  width: 350,
  height: 350,
});

ipcMain.on('configDone', (event: any, arg: any) => {
  mb.hideWindow();
});

mb.on('ready', () => {
  const uploader = new Upload();

  const name = mb.app.getName();
  const template: MenuItemConstructorOptions[] = [{
    label: name,
    submenu: [
      {role: 'about'},
      {type: 'separator'},
      {role: 'services', submenu: []},
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideothers'},
      {role: 'unhide'},
      {type: 'separator'},
      {role: 'quit'}
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'},
      {role: 'pasteandmatchstyle'},
      {role: 'delete'},
      {role: 'selectall'},
      {type: 'separator'},
      {
        label: 'Speech',
        submenu: [
          {role: 'startspeaking'},
          {role: 'stopspeaking'},
        ]
      },
    ]
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forcereload'},
      {role: 'toggledevtools'},
      {type: 'separator'},
      {role: 'resetzoom'},
      {role: 'zoomin'},
      {role: 'zoomout'},
      {type: 'separator'},
      {role: 'togglefullscreen'}
    ]
  },
  {
    role: 'window',
    submenu: [
      {role: 'close'},
      {role: 'minimize'},
      {role: 'zoom'},
      {type: 'separator'},
      {role: 'front'},
    ]
  }];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mb.tray.on('drop-files', (event: any, files: any) => {
    uploader.up(files);
  });
});
