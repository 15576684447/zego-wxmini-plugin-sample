// pages/live-room-push/index.js

let { ZegoClient } = require("../lib/jZego-wx-1.4.0.js");
let { getLoginToken } = require("../../utils/util.js");

let zg;
let zgPusher;

const TAG_NAME = 'LIVE_ROOM_PUSH';

const app = getApp();
let { appID, server, logUrl } = app.globalData;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    appID: appID,
    server: server,
    logUrl: logUrl,
    roomID: "",
    userID: "",
    userName: "",
    pusherInfo: {
      streamID: "",
      url: ""
    },
    beginToPush: false,
    publishing: false,

    mode: 'SD',
    waitingImage:'https://mc.qcloudimg.com/static/img/daeed8616ac5df256c0591c22a65c4d3/pause_publish.jpg',
    enableCamera:true,
    orientation: "vertical",
    objectFit: "contain",
    beauty:4,
    whiteness:4,

    minCache: 1,
    maxCache: 3,
    muted: false,
    debug: false,
    autoFocus: true,
    aspect:'9:16',
    minBitrate: 200,
    maxBitrate: 1000,
    zoom: false,
    devicePosition:'front',  //初始化摄像头为前置还是后置，只能初始化的时候设置，动态调整用switchCamera
    frontCamera: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const { roomID } = options;
    console.log(roomID);
    this.setData({
      roomID
    })
    wx.setNavigationBarTitle({ title: roomID })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    let timestamp = new Date().getTime();
    this.data.userID = 'u' + timestamp;
    this.data.userName = 'nick' + timestamp;
    this.data.pusherInfo.streamID = 's' + timestamp;
    zg = new ZegoClient();
    zg.config({
      appid: this.data.appID, // 必填，应用id，由即构提供
      idName: this.data.userID, // 必填，用户自定义id，全局唯一
      nickName: this.data.userName, // 必填，用户自定义昵称
      remoteLogLevel: 2, // 日志上传级别，建议取值不小于 logLevel
      logLevel: 0, // 日志级别，debug: 0, info: 1, warn: 2, error: 3, report: 99, disable: 100（数字越大，日志越少）
      server: this.data.server, // 必填，服务器地址，由即构提供
      logUrl: this.data.logUrl, // 必填，log 服务器地址，由即构提供
      audienceCreateRoom: false // false观众不允许创建房间
    });
    this.bindCallBack();

    zgPusher = this.selectComponent("#zg-pusher");
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  bindCallBack() {
    zg.onStreamUrlUpdate = (streamID, url, type) => {
      console.log(TAG_NAME, 'onStrteamUrlUpdate', streamID, url, type === 0 ? 'play' : 'push');
      if (type == 1) {
        this.data.pusherInfo = {
          streamID,
          url
        }
        this.setData({
          pusherInfo: this.data.pusherInfo
        }, () => {
          zgPusher.start();
        })
      }
    }
    zg.onDisConnect = () => {
      console.warn(TAG_NAME, 'onDisConnect');
    }
    zg.onPublishStateUpdate = (type, streamID, error) => {
      console.warn(TAG_NAME, 'onPublishStateUpdate', type, streamID, error);
      this.setData({
        publishing: type === 0 ? true : false,
        beginToPush: false
      })
      if (type === 1) {
        zgPusher.stop();
        wx.showModal({
          title: '提示',
          content: '推流失败,请重试',
          showCancel: false,
          success(res) {
            // 用户点击确定，或点击安卓蒙层关闭
            if (res.confirm || !res.cancel) {
              
            }
          }
        })
      } 
    }
  },

  onPushClick() {
    if (this.data.beginToPush) return;

    this.setData({
      beginToPush: true
    })
    if (!this.data.publishing) {
      getLoginToken(this.data.userID, appID).then(token => {
        zg.login(this.data.roomID, 1, token, streamList => {
          console.log(TAG_NAME, 'login room succeeded', streamList);
          zg.setPreferPublishSourceType(1);
          zg.startPublishingStream(this.data.pusherInfo.streamID);
        }, err => {
          console.error(TAG_NAME, 'login room fail', err);
        })
      })
    } else {
      zg.stopPublishingStream(this.data.pusherInfo.streamID);
      zgPusher.stop();
      this.data.pusherInfo = { streamID: '', url: '' }
      this.setData({
        publishing: false,
        beginToPush: false,
        pusherInfo: this.data.pusherInfo
      })
    }

  },

  onSwitchCameraClick: function () {
    this.data.frontCamera = !this.data.frontCamera;
    this.setData({
      frontCamera: this.data.frontCamera
    })
    zgPusher.switchCamera();
  },
  onBeautyClick: function () {
    if (this.data.beauty != 0) {
      this.data.beauty = 0;
      this.data.whiteness = 0;
    } else {
      this.data.beauty = 6.3;
      this.data.whiteness = 3.0;
    }

    this.setData({
      beauty: this.data.beauty,
      whiteness: this.data.whiteness
    })
  },
  onSwitchMode: function () {
    var showTips = !this.data.showHDTips;
    this.setData({
      showHDTips: showTips
    })
  },
  onModeClick: function (event) {
    var mode = "SD";
    switch (event.target.dataset.mode) {
      case "SD":
        mode = "SD";
        break;
      case "HD":
        mode = "HD";
        break;
      case "FHD":
        mode = "FHD";
        break;
    }

    this.setData({
      mode: mode,
      showHDTips: false
    })
  },
  onMuteClick: function () {
    this.setData({
      muted: !this.data.muted
    })
  },
  onEnableCameraClick: function () {
    this.setData({
      enableCamera: !this.data.enableCamera
    }, () => {
      // if (this.data.playing) {
        zgPusher.stop();
        setTimeout(() => {
          zgPusher.start();
        }, 100)
      // }
    })
    
  },
  onOrientationClick: function () {
    if (!this.data.enableCamera) {
      wx.showToast({
        icon: 'none',
        title: '请先开启摄像头'
      })
      return;
    }
    if (this.data.orientation == "vertical") {
      this.data.orientation = "horizontal";
    } else {
      this.data.orientation = "vertical";
    }
    this.setData({
      orientation: this.data.orientation
    })
  },
  onLogClick: function () {
    this.setData({
      debug: !this.data.debug,
    })
  },
  onSnapshotClick: function () {
    zgPusher.snapshot({
      success: function (res){
        wx.saveImageToPhotosAlbum({
          filePath: res.tempImagePath
        })
        console.log(res)
      },
      fail:function(res) {
        console.log(res)
      }
    });
  },
  onPushStateChange(e) {
    console.log(
      `${TAG_NAME} onPushStateChange `, 
      e.detail.code ,
      e.detail.message
    );
    zg.updatePlayerState(this.data.pusherInfo.streamID, e);
  },
  onPushNetStateChange(e) {
    zg.updatePlayerNetStatus(this.data.pusherInfo.streamID, e);
  },
  
})