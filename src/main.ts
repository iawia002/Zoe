import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { clipboard, ipcMain, Notification, nativeImage } from 'electron';
import * as qiniu from 'qiniu';
import * as yaml from 'js-yaml';

const menubar = require('menubar');


interface uploadOption {
  uptoken: string;
  key: string;
  localFile: string;
}


class Upload {
  config: any;

  constructor() {
    this.loadConfig();
    this.config.icon = nativeImage.createFromPath(
      path.join(__dirname, '../static/img/infinite@450.png')
    );
  }

  loadConfig() {
    this.config = yaml.safeLoad(
      fs.readFileSync(path.join(__dirname, '../config.yml'), 'utf8')
    );
  }

  //构建上传策略函数
  uptoken(key: string) {
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
  sha1(path: string) {
    const hash = crypto.createHash('sha1');
    const buffer = fs.readFileSync(path);
    hash.update(buffer);
    return hash.digest('hex');
  }

  uploadFile(option: uploadOption) {
    const config = new qiniu.conf.Config();
    const resumeUploader = new qiniu.resume_up.ResumeUploader(config);
    const putExtra = new qiniu.resume_up.PutExtra(
      null, null, null, path.join(__dirname, 'progress.log')
    );
    resumeUploader.putFile(option.uptoken, option.key, option.localFile, putExtra, (respErr, respBody, respInfo) => {
      if (respErr) {
        // 上传失败， 处理返回代码
        const myNotification = new Notification({
          title: 'Zoe',
          body: '上传失败，请检查配置',
        });
        myNotification.show();
        console.log(respErr);
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
          console.log(respInfo);
        }
      }
    });
  }

  up(paths: string[]) {
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
        output += `![](${url})\n`;
      }
      else {
        output += `${url}\n`
      }
    }
    clipboard.writeText(output);
  }
}


const uploader = new Upload();


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
  mb.tray.on('drop-files', (event: any, files: any) => {
    uploader.up(files);
  });
});
