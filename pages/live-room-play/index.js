// pages/live-room-play/index.js
let { ZegoClient } = require("../lib/jZego-wx-1.4.0.js");
let { getLoginToken } = require("../../utils/util.js");

let zg;
let zgPlayer;

const TAG_NAME = 'LIVE_ROOM_PLAY';

const app = getApp();
let { liveAppID, wsServerURL, logServerURL } = app.globalData;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    liveAppID: liveAppID,
    wsServerURL: wsServerURL,
    logServerURL: logServerURL,
    roomID: "",
    userID: "",
    userName: "",
    playing: false,
    beginToPlay: false,

    orientation: 'vertical',
    objectFit: 'fillCrop',
    minCache: 1,
    maxCache: 3,
    muted: false,
    debug: false,
    pictureInPictureMode: "",

    playerInfo: {
      streamID: "",
      url: ""
    }
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
    
    zg = new ZegoClient();
    zg.config({
      appid: this.data.liveAppID, // 必填，应用id，由即构提供
      idName: this.data.userID, // 必填，用户自定义id，全局唯一
      nickName: this.data.userName, // 必填，用户自定义昵称
      remoteLogLevel: 2, // 日志上传级别，建议取值不小于 logLevel
      logLevel: 0, // 日志级别，debug: 0, info: 1, warn: 2, error: 3, report: 99, disable: 100（数字越大，日志越少）
      server: this.data.wsServerURL, // 必填，服务器地址，由即构提供
      logUrl: this.data.logServerURL, // 必填，log 服务器地址，由即构提供
      audienceCreateRoom: false // false观众不允许创建房间
    });
    
    zg.setPreferPlaySourceType(1); 

    this.bindCallBack();

    zgPlayer = this.selectComponent("#zg-player");
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
    let that = this;
    zg.onStreamUrlUpdate = (streamID, url, type) => {
      console.warn(`${TAG_NAME} onStreamUrlUpdate ${streamID} ${type === 0 ? 'play' : 'publish'} ${url}`);

      if (type === 0) {
        that.data.playerInfo.streamID = streamID;
        that.data.playerInfo.url = url;

        that.setData({
          playerInfo: that.data.playerInfo
        }, () => {
          console.error(that.data.playerInfo, zgPlayer)

          zgPlayer.play();
        })
      }
    };
    zg.onStreamUpdated = (updatedType, streamList) => {
      console.log(`${TAG_NAME} onStreamUpdated ${updatedType === 0 ? 'added' : 'deleted'}`);
      console.log(streamList);

      if (updatedType === 1) {
        zg.stopPlayingStream(this.data.playInfo.streamID);
        zgPlayer.stop();
        that.setData({
          playInfo: {
            streamID: "",
            url: ""
          }
        })
      } else {
        // self.startPlayingStreamList(streamList);
        if (!that.data.playing && !that.data.beginToPlay) {
          zg.startPlayingStream(streamList[0].stream_id);
        }
      }
    };
    zg.onPlayStateUpdate = (updatedType, streamID) => {
      console.log(`${TAG_NAME} onPlayStateUpdate ${updatedType === 0 ? 'start ' : 'stop '} ${streamID}`);

      that.setData({
        playing: updatedType === 0 ? true : false,
        beginToPlay: false
      })

      if (updatedType === 1) {
        // 流播放失败, 停止拉流
        zgPlayer.stop();
        wx.showModal({
          title: '提示',
          content: '拉流失败,请重试',
          showCancel: false,
          success(res) {
            // 用户点击确定，或点击安卓蒙层关闭
            if (res.confirm || !res.cancel) {
              
            }
          }
        })
      } 

    };
  },

  onPlayClick() {
    if (this.data.beToPlay) return;
    
    this.setData({
      beToPlay: true
    })
    if (!this.data.playing) {
      getLoginToken(this.data.userID, liveAppID).then(token => {
        zg.login(this.data.roomID, 1, token, streamList => {
          console.log(TAG_NAME, 'login room succeeded', streamList);
          
          if (streamList && streamList.length) {
            zg.startPlayingStream(streamList[0].stream_id);
          }

        }, err => {
          console.error(TAG_NAME, 'login room fail', err);
        })
      })
    }
  },

  onOrientationClick: function() {
    if (this.data.orientation == "vertical") {
      this.data.orientation = "horizontal";
    } else {
      this.data.orientation = "vertical";
    }
    this.setData({
      orientation: this.data.orientation
    })
  },

  onLogClick: function() {
    this.setData({
      debug: !this.data.debug
    })
  },

  onMuteClick: function() {
    this.setData({
      muted: !this.data.muted
    })
  },

  onPlayStateChange(e) {
    console.log(
      `${TAG_NAME} onPlayStateChange, `,
      e.detail.code,
      e.detail.message
    );
    zg.updatePlayerState(e.detail.streamID, e);
  },

  onPlayNetStateChange(e) {
    zg.updatePlayerNetStatus(e.detail.streamID, e);
  },

})