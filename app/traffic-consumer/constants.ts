/**
 * 预设下载资源列表
 * 用于流量消耗器页面
 */
export interface DownloadResource {
  key: string;
  label: string;
  url: string;
}

export const PRESET_DOWNLOADS: DownloadResource[] = [
  {
    "key": "default",
    "label": "默认 [如需其他请下拉选择节点或直接输入资源链接]",
    "url": "https://cachefly.cachefly.net/50mb.test"
  },
  {
    "key":"wechat",
    "label": "微信客户端",
    "url": "https://dldir1v6.qq.com/weixin/Universal/Windows/WeChatWin.exe"
  },
  {
    "key": "miguyinyue",
    "label": "咪咕音乐",
    "url": "https://d.musicapp.migu.cn/upload/fbpt_rsync_apps/local/signed/MobileMusic7411/MobileMusic7411_014000D.apk"
  },
  {
    "key": "hecaiyun1",
    "label": "和彩云1",
    "url": "https://img.mcloud.139.com/material_prod/material_media/20221128/1669626861087.png"
  },
  {
    "key": "migukuaiyou1",
    "label": "咪咕快游1",
    "url": "https://plaza.cmgame.com:8443/resource/upload/records/tvapk/apk/6.9.1.0_0_5132_2021-12-29_10011000000_xw_sec_signed_signed_signed.apk"
  },
  {
    "key": "migukuaiyou2",
    "label": "咪咕快游2",
    "url": "https://pc-dl.migufun.com:8443/channelpackage/mgame-2djSBy.exe"
  },
  {
    "key": "migukuaiyou3",
    "label": "咪咕快游3",
    "url": "https://freeserver.migufun.com/resource/beta/video/system/20210924112351666.mp4"
  },
  {
    "key": "migukuaiyou4",
    "label": "咪咕快游4",
    "url": "https://freeserver.migufun.com/resource/beta/apk/20231114094513/MiguPlay-V3.69.1.1_miguzsj.apk"
  },
  {
    "key": "tianyiyun1",
    "label": "天翼云1",
    "url": "https://desk.ctyun.cn/desktop/software/clientsoftware/download/5961fa22ee369eba433da6b0247eb11f"
  },
  {
    "key": "tianyiyun2",
    "label": "天翼云2",
    "url": "https://desk.ctyun.cn:8999/desktop-prod/software/android_client/20/64/102010101/clouddesktoc_phone_2.1.1_452_prod_102010101_2.1.1_signed.apk"
  },
  {
    "key": "tianyiyun3",
    "label": "天翼云3-翼加密客户端",
    "url": "https://desk.ctyun.cn/desktop/software/clientsoftware/download/50218cd4d2286623049e374061cffd0e"
  },
  {
    "key": "tianyiyunmarket",
    "label": "天翼云应用市场",
    "url": "https://desk.ctyun.cn/desktop/software/clientsoftware/download/ff3e71dcc21152307f54700c62e5aef6"
  },
  {
    "key": "liantongtv",
    "label": "联通电视",
    "url": "https://listen.10155.com/listener/womusic-bucket/90115000/mv_vod/volte_mp4/20230215/1625752132487675906.mp4"
  },
  {
    "key": "liantongstatic1",
    "label": "联通官网静态资源1",
    "url": "https://m1.ad.10010.com/small_video/uploadImg/1669798519261.png"
  },
  {
    "key": "aiqiyi",
    "label": "爱奇艺",
    "url": "https://bdcdncnc.inter.71edge.com/cdn/pca/20231130/10.9.1.7348/channel/1701328986348/IQIYIsetup_z43.exe"
  },
  {
    "key": "baiduobjectstorage",
    "label": "百度对象存储资源",
    "url": "https://fanyi-cdn.cdn.bcebos.com/static/api-ssr/static/js/2.1c6a3a74.chunk.js"
  },
  {
    "key": "alicituimg",
    "label": "阿里图片CDN域名加速",
    "url": "https://img.alicdn.com/imgextra/i1/O1CN01xA4P9S1JsW2WEg0e1_!!6000000001084-2-tps-2880-560.png"
  },
  {
    "key": "alipaytool",
    "label": "支付宝开放平台1",
    "url": "https://mdn.alipayobjects.com/ind_developertool/afts/file/A*fSAmSbgxLosAAAAAAAAAAAAADlx-AQ?af_fileName=AlipayKeyTool-2.0.3.dmg"
  },
  {
    "key": "alipayumi",
    "label": "支付宝开放平台2",
    "url": "https://gw.alipayobjects.com/render/p/yuyan/180020010001210191/umi.9f3e4149.js"
  },
  {
    "key": "alicdnGw",
    "label": "阿里系Gw",
    "url": "https://gw.alicdn.com/tfscom/TB1fASCxhjaK1RjSZKzXXXVwXXa.jpg"
  },
  {
    "key": "tencentgame",
    "label": "腾讯游戏-静态资源加速1",
    "url": "https://game.gtimg.cn/images/nz/web202106/index/bc_part1.gif?0.3190485611376561"
  },
  {
    "key": "wegame",
    "label": "Wegame-静态资源加速",
    "url": "https://wegame.gtimg.com/g.55555-r.c4663/wegame-home/sc02-03.514d7db8.png"
  },
  {
    "key": "jingdongimg",
    "label": "京东商城图片CDN服务",
    "url": "https://img10.360buyimg.com/live/jfs/t1/128947/12/26918/1361527/6260e71bE0ee85af5/ecaa17ea8dd3dddb.jpg"
  },
  {
    "key": "nshstatic",
    "label": "逆水寒官网静态资源",
    "url": "https://n.v.netease.com/2022/1206/de4b6add85f1537da839bdb5a501253d.mp4"
  },
  {
    "key": "nshclient",
    "label": "逆水寒客户端",
    "url": "https://nsh.gdl.netease.com/NGP/NGP_NSH_2.0.81143.exe"
  },
  {
    "key": "mcclientnetease",
    "label": "MCLauncher网易版(阿里CDN)",
    "url": "https://x19.gdl.netease.com/MCLauncher_1.10.0.15222.exe"
  },
  {
    "key": "neteasepubliclesson",
    "label": "网易公开课(白云山CDN)",
    "url": "https://mov.bn.netease.com/open-movie/nos/mp4/2015/11/26/SB8ECV1ST_sd.mp4"
  },
  {
    "key": "wangyiyunyouxi",
    "label": "网易云游戏",
    "url": "https://nsh.gdl.netease.com/cloudgame_macos/NSH_cloud_game_for_mac_1.4.6_2023_06-02-11.dmg"
  },
  {
    "key": "vivostatic",
    "label": "VIVO官网静态资源",
    "url": "https://wwwstatic.vivo.com.cn/vivoportal/files/resource/funtouch/1651200648928/images/os2-jude-video.mp4"
  },
  {
    "key": "oppomalljs",
    "label": "OPPP商城静态资源",
    "url": "https://dsfs.oppo.com/oppo/shop-pc-v2/main/js/9fb472f.js"
  },
  {
    "key": "vivoappstore",
    "label": "VIVO应用商店",
    "url": "https://imgwsdl.vivo.com.cn/appstore/developer/soft/20210125/202101251051528awqa.apk"
  },
  {
    "key": "bytecdn1",
    "label": "字节CDN资源",
    "url": "https://lf9-cdn-tos.bytecdntp.com/cdn/yuntu-index/1.0.4/case/maiteng/detailbg.png"
  },
  {
    "key": "bytecdn2",
    "label": "字节CDN资源2",
    "url": "https://lf9-apk.ugapk.cn/package/apk/bgame/1593_112/bgame_operation_update_2508_v1593_112_63aa_1693882489.apk?v=1693882509"
  },
  {
    "key": "douyindownloader",
    "label": "抖音Win客户端",
    "url": "https://www.douyin.com/download/pc/obj/douyin-pc-client/7044145585217083655/releases/11259813/3.0.1/win32-ia32/douyin-downloader-v3.0.1-win32-ia32-douyinDownload1.exe"
  },
  {
    "key": "toutiaoandroid",
    "label": "今日头条安卓客户端",
    "url": "https://lf9-apk.ugapk.cn/package/apk/news_article/1001_9660/news_article_tt_wtt_qrcod_v1001_9660_4cd4_1706007871.apk?v=1706007877"
  },
  {
    "key": "feishumac",
    "label": "飞书Mac客户端",
    "url": "https://sf3-cn.feishucdn.com/obj/ee-appcenter/9323162e/Feishu-darwin_x64-7.4.9-signed.dmg"
  },
  {
    "key": "shanghailingyang1",
    "label": "上海灵羊1",
    "url": "https://activity.hdslb.com/blackboard/static/20210604/4d40bc4f98f94fbc71c235832ce3efd4/hJEhL6jGOY.zip"
  },
  {
    "key": "huaweip60pro",
    "label": "华为P60-pro素材",
    "url": "https://consumer-img.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/p60-pro/images/camera/huawei-p60-pro-camera-ui.mp4"
  },
  {
    "key": "smartisanos",
    "label": "Smartisan OS 官网公共资源",
    "url": "https://static.smartisanos.cn/common/video/production/ocean/os-1-1710.mp4"
  },
  {
    "key": "pinduoduoimgsmall",
    "label": "拼多多H5官网静态资源-图像小文件",
    "url": "https://funimg.pddpic.com/c3affbeb-9b31-4546-b2df-95b62de81639.png.slim.png"
  },
  {
    "key": "pinduoduoimgcdn",
    "label": "拼多多IMG/CDN资源文件",
    "url": "https://t00img.yangkeduo.com/chat/images/2022-12-12/79e0a4684de85c7b59f797819260be98.jpeg"
  },
  {
    "key": "cctv",
    "label": "CCTV",
    "url": "https://dh5.cntv.myhwcdn.cn/asp/h5e/hls/1200/0303000a/3/default/ec48b9f8c76e49af842d4942914ad663/1.ts"
  },
  {
    "key": "acfun",
    "label": "AcFun",
    "url": "https://cdn.aixifan.com/downloads/AcFun-acfunh5-release-6.62.0.1238_x64_60b608.apk"
  },
  {
    "key": "douyucdn",
    "label": "斗鱼CDN-小文件",
    "url": "https://shark2.douyucdn.cn/front-publish/live-master/lib/vendor-room_4e3a873.js"
  },
  {
    "key": "qiniuyun",
    "label": "七牛云",
    "url": "https://dn-mars-assets.qbox.me/qiniulog/img-slogan-white-en.png"
  },
  {
    "key": "xianniu",
    "label": "鲜牛加速器(华为云CDN)",
    "url": "https://picture.xianniu.com/pc/download/4.6.9.3/xianniusetup.4.6.9.3.exe"
  },
  {
    "key": "githubcfcdn",
    "label": "GitHub文件加速(cloudflare CDN)",
    "url": "https://gh.con.sh/https://github.com/AaronFeng753/Waifu2x-Extension-GUI/releases/download/v2.21.12/Waifu2x-Extension-GUI-v2.21.12-Portable.7z"
  },
  {
    "key": "cachefly100",
    "label": "Cachefly 100MB",
    "url": "https://cachefly.cachefly.net/100mb.test"
  },
  {
    "key": "cloudflare",
    "label": "cloudflare",
    "url": "https://speed.cloudflare.com/__down?bytes=25000000"
  },
  {
    "key": "vultr1Gsgp",
    "label": "Vultr 1G(新加坡)",
    "url": "https://sgp-ping.vultr.com/vultr.com.1000MB.bin"
  },
  {
    "key": "vultr1Gny",
    "label": "Vultr 1G(纽约)",
    "url": "https://nj-us-ping.vultr.com/vultr.com.1000MB.bin"
  },
  {
    "key": "linode100Mtokyo",
    "label": "Linode 100MB(日本省东京市)",
    "url": "https://speedtest.tokyo2.linode.com/100MB-tokyo2.bin"
  },
  {
    "key": "bbctokyo",
    "label": "BBC中文网",
    "url": "https://emp.bbci.co.uk/emp/dashjs/3.2.0-8/dash.all.min.js"
  }
];