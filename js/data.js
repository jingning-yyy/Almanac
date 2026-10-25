/* ============================================================
 * 星历 Almanac · 数据文件
 * 想长期增加/修改分类或网址，直接编辑下面这个数组即可。
 * 外网站点带 region:"global" 标记，卡片上会显示 🌐 外网 徽标，
 * 并可被「全部 / 大陆 / 外网」筛选器过滤。
 * 页面上"添加网址"保存的内容存在浏览器本地（localStorage），
 * 与本文件互不影响，换浏览器时可用页面里的 导出/导入 迁移。
 * ============================================================ */
const NAV_DATA = [
  {
    name: "常用推荐",
    icon: "⭐",
    sites: [
      { name: "百度", url: "https://www.baidu.com", desc: "全球最大中文搜索引擎" },
      { name: "必应", url: "https://www.bing.com", desc: "微软旗下搜索引擎" },
      { name: "哔哩哔哩", url: "https://www.bilibili.com", desc: "年轻人都爱的视频社区" },
      { name: "知乎", url: "https://www.zhihu.com", desc: "高质量中文问答社区" },
      { name: "小红书", url: "https://www.xiaohongshu.com", desc: "生活方式分享社区" },
      { name: "天猫", url: "https://www.tmall.com", desc: "品牌网购正品保障" },
      { name: "微博", url: "https://weibo.com", desc: "社交媒体热点平台" },
      { name: "淘宝", url: "https://www.taobao.com", desc: "综合网购平台" },
      { name: "京东", url: "https://www.jd.com", desc: "自营电商正品低价" },
      { name: "12306", url: "https://www.12306.cn", desc: "中国铁路官方购票" },
      { name: "高德地图", url: "https://www.amap.com", desc: "在线地图与出行导航" },
      { name: "GitHub", url: "https://github.com", desc: "全球最大代码托管平台", region: "global" },
      { name: "X(推特)", url: "https://x.com", desc: "国际社交媒体平台", region: "global" },
      { name: "Facebook", url: "https://www.facebook.com", desc: "全球最大社交网络", region: "global" },
      { name: "Instagram", url: "https://www.instagram.com", desc: "图片社交平台", region: "global" },
      { name: "Reddit", url: "https://www.reddit.com", desc: "全球论坛社区", region: "global" },
      { name: "Amazon", url: "https://www.amazon.com", desc: "国际电商巨头", region: "global" },
      { name: "eBay", url: "https://www.ebay.com", desc: "国际拍卖购物平台", region: "global" },
      { name: "Yahoo", url: "https://www.yahoo.com", desc: "老牌国际门户", region: "global" },
      { name: "LinkedIn", url: "https://www.linkedin.com", desc: "国际职场社交", region: "global" },
      { name: "Telegram", url: "https://web.telegram.org", desc: "加密通讯网页版", region: "global" },
      { name: "Discord", url: "https://discord.com", desc: "社群语音聊天", region: "global" }
    ]
  },
  {
    name: "购物比价",
    icon: "🛒",
    sites: [
      { name: "拼多多", url: "https://www.pinduoduo.com/", desc: "拼团低价网购平台" },
      { name: "1688", url: "https://www.1688.com/", desc: "阿里旗下批发采购" },
      { name: "闲鱼", url: "https://www.goofish.com/", desc: "二手闲置交易平台" },
      { name: "什么值得买", url: "https://www.smzdm.com/", desc: "消费决策与好价" },
      { name: "转转", url: "https://www.zhuanzhuan.com/", desc: "二手数码交易" },
      { name: "慢慢买", url: "https://www.manmanbuy.com/", desc: "全网历史价格比较" },
      { name: "苏宁易购", url: "https://www.suning.com/", desc: "综合家电零售" },
      { name: "唯品会", url: "https://www.vip.com/", desc: "品牌特卖折扣" },
      { name: "网易严选", url: "https://you.163.com/", desc: "网易自营生活品牌" }
    ]
  },
  {
    name: "新闻资讯",
    icon: "📰",
    sites: [
      { name: "新华网", url: "https://www.news.cn", desc: "国家通讯社官方门户" },
      { name: "人民网", url: "http://www.people.com.cn", desc: "人民日报社主办门户" },
      { name: "央视网", url: "https://news.cctv.com", desc: "中央电视台官方网站" },
      { name: "澎湃新闻", url: "https://www.thepaper.cn", desc: "专注时政与思想的媒体" },
      { name: "界面新闻", url: "https://www.jiemian.com", desc: "原创商业新闻媒体" },
      { name: "腾讯新闻", url: "https://news.qq.com", desc: "事实派综合资讯平台" },
      { name: "网易新闻", url: "https://news.163.com", desc: "有态度的新闻门户" },
      { name: "环球网", url: "https://www.huanqiu.com", desc: "国际资讯权威平台" },
      { name: "参考消息", url: "https://www.cankaoxiaoxi.com", desc: "海外媒体中文精选" },
      { name: "中国日报网", url: "https://www.chinadaily.com.cn", desc: "国家英文日报官网" },
      { name: "搜狐", url: "https://www.sohu.com", desc: "综合资讯内容平台" },
      { name: "联合早报", url: "https://www.zaobao.com.sg", desc: "新加坡华文报纸", region: "global" },
      { name: "BBC中文网", url: "https://www.bbc.com/zhongwen/simp", desc: "BBC 中文国际报道", region: "global" },
      { name: "CNN", url: "https://www.cnn.com", desc: "美国有线电视新闻网", region: "global" },
      { name: "路透社", url: "https://www.reuters.com", desc: "国际通讯社", region: "global" },
      { name: "The Verge", url: "https://www.theverge.com", desc: "国际科技媒体", region: "global" }
    ]
  },
  {
    name: "视频娱乐",
    icon: "🎬",
    sites: [
      { name: "哔哩哔哩", url: "https://www.bilibili.com", desc: "弹幕视频分享社区" },
      { name: "爱奇艺", url: "https://www.iqiyi.com", desc: "正版高清视频网站" },
      { name: "腾讯视频", url: "https://v.qq.com", desc: "热播剧综在线观看" },
      { name: "优酷", url: "https://www.youku.com", desc: "优酷视频官方平台" },
      { name: "芒果TV", url: "https://www.mgtv.com", desc: "湖南卫视官方平台" },
      { name: "西瓜视频", url: "https://www.ixigua.com", desc: "字节旗下中长视频" },
      { name: "抖音", url: "https://www.douyin.com", desc: "短视频记录美好生活" },
      { name: "快手", url: "https://www.kuaishou.com", desc: "短视频直播平台" },
      { name: "豆瓣电影", url: "https://movie.douban.com", desc: "影评与片单评分参考" },
      { name: "网易云音乐", url: "https://music.163.com", desc: "音乐社区与歌单推荐" },
      { name: "QQ音乐", url: "https://y.qq.com", desc: "腾讯旗下音乐平台" },
      { name: "小宇宙", url: "https://www.xiaoyuzhoufm.com/", desc: "播客收听平台" },
      { name: "YouTube", url: "https://www.youtube.com", desc: "全球最大视频网站", region: "global" },
      { name: "Netflix", url: "https://www.netflix.com", desc: "国际流媒体平台", region: "global" },
      { name: "Spotify", url: "https://open.spotify.com", desc: "国际音乐流媒体", region: "global" },
      { name: "Twitch", url: "https://www.twitch.tv", desc: "游戏直播平台", region: "global" }
    ]
  },
  {
    name: "体育运动",
    icon: "⚽",
    sites: [
      { name: "虎扑体育", url: "https://www.hupu.com", desc: "篮球足球体育社区" },
      { name: "直播吧", url: "https://www.zhibo8.cc", desc: "体育赛事直播聚合" },
      { name: "懂球帝", url: "https://www.dongqiudi.com", desc: "足球资讯与社区" },
      { name: "新浪体育", url: "https://sports.sina.com.cn", desc: "综合体育新闻门户" },
      { name: "腾讯体育", url: "https://sports.qq.com", desc: "赛事直播与资讯" },
      { name: "央视体育", url: "https://sports.cctv.com", desc: "CCTV5 官方平台" },
      { name: "NBA官网", url: "https://china.nba.cn", desc: "NBA 中国官方网站" },
      { name: "CBA官网", url: "https://www.cbaleague.com", desc: "中国男子篮球联赛" },
      { name: "ESPN", url: "https://www.espn.com", desc: "国际体育媒体巨头", region: "global" },
      { name: "OneFootball", url: "https://onefootball.com", desc: "全球足球比分资讯", region: "global" },
      { name: "Keep", url: "https://www.gotokeep.com/", desc: "健身运动课程App" }
    ]
  },
  {
    name: "金融财经",
    icon: "💰",
    sites: [
      { name: "东方财富", url: "https://www.eastmoney.com", desc: "行情资讯一站式平台" },
      { name: "同花顺", url: "https://www.10jqka.com.cn", desc: "股票行情与交易软件" },
      { name: "雪球", url: "https://xueqiu.com", desc: "投资者社交与组合" },
      { name: "新浪财经", url: "https://finance.sina.com.cn", desc: "财经资讯与全球行情" },
      { name: "华尔街见闻", url: "https://wallstreetcn.com", desc: "全球金融市场资讯" },
      { name: "第一财经", url: "https://www.yicai.com", desc: "专业财经新闻媒体" },
      { name: "中国人民银行", url: "http://www.pbc.gov.cn", desc: "央行货币政策发布" },
      { name: "证监会", url: "http://www.csrc.gov.cn", desc: "证券监管官方机构" },
      { name: "中国银行", url: "https://www.boc.cn", desc: "网上银行服务" },
      { name: "招商银行", url: "https://www.cmbchina.com", desc: "零售银行服务" },
      { name: "英为财情", url: "https://cn.investing.com", desc: "全球投资行情数据", region: "global" },
      { name: "Bloomberg", url: "https://www.bloomberg.com", desc: "全球商业金融资讯", region: "global" }
    ]
  },
  {
    name: "学习教育",
    icon: "📚",
    sites: [
      { name: "中国大学MOOC", url: "https://www.icourse163.org", desc: "名校公开课慕课平台" },
      { name: "学堂在线", url: "https://www.xuetangx.com", desc: "清华发起慕课平台" },
      { name: "网易公开课", url: "https://open.163.com", desc: "中外名校公开课" },
      { name: "得到", url: "https://www.dedao.cn", desc: "知识服务与听书" },
      { name: "慕课网", url: "https://www.imooc.com", desc: "IT 技能在线学习" },
      { name: "力扣", url: "https://leetcode.cn", desc: "算法刷题面试准备" },
      { name: "菜鸟教程", url: "https://www.runoob.com", desc: "编程入门教程大全" },
      { name: "W3School", url: "https://www.w3school.com.cn", desc: "Web 开发中文教程" },
      { name: "学信网", url: "https://www.chsi.com.cn", desc: "学籍学历官方查询" },
      { name: "Coursera", url: "https://www.coursera.org", desc: "国际在线课程平台", region: "global" },
      { name: "edX", url: "https://www.edx.org", desc: "哈佛麻省理工慕课", region: "global" },
      { name: "可汗学院", url: "https://www.khanacademy.org", desc: "免费全学科课程", region: "global" },
      { name: "维基百科", url: "https://www.wikipedia.org", desc: "全球最大自由百科", region: "global" },
      { name: "Quora", url: "https://www.quora.com", desc: "国际问答社区", region: "global" }
    ]
  },
  {
    name: "论文文献",
    icon: "📄",
    sites: [
      { name: "中国知网", url: "https://www.cnki.net/", desc: "中文学术文献最全" },
      { name: "万方数据", url: "https://www.wanfangdata.com.cn/", desc: "期刊学位论文检索" },
      { name: "维普网", url: "https://www.cqvip.com/", desc: "中文科技期刊数据库" },
      { name: "百度学术", url: "https://xueshu.baidu.com/", desc: "免费学术搜索引擎" },
      { name: "国家社科文献中心", url: "https://www.ncpssd.org/", desc: "人文社科免费下载" },
      { name: "中国科技论文在线", url: "http://www.paper.edu.cn/", desc: "论文免费在线首发" },
      { name: "全国图书馆参考联盟", url: "http://ucdrs.superlib.net/", desc: "免费文献传递服务" },
      { name: "X-MOL", url: "https://www.x-mol.com/", desc: "科研资讯与论文平台" },
      { name: "谷歌学术", url: "https://scholar.google.com/", desc: "全球学术文献搜索",
      region: "global" },
      { name: "arXiv", url: "https://arxiv.org/", desc: "物理数学计算机预印本",
      region: "global" },
      { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/", desc: "生物医学文献检索",
      region: "global" },
      { name: "Semantic Scholar", url: "https://www.semanticscholar.org/", desc: "AI 驱动学术搜索",
      region: "global" },
      { name: "ScienceDirect", url: "https://www.sciencedirect.com/", desc: "Elsevier 期刊数据库",
      region: "global" },
      { name: "Springer Link", url: "https://link.springer.com/", desc: "Springer 期刊与图书",
      region: "global" },
      { name: "IEEE Xplore", url: "https://ieeexplore.ieee.org/", desc: "电子工程技术文献",
      region: "global" },
      { name: "CORE", url: "https://core.ac.uk/", desc: "开放获取论文聚合",
      region: "global" },
      { name: "DOAJ", url: "https://doaj.org/", desc: "开放获取期刊目录",
      region: "global" },
      { name: "ResearchGate", url: "https://www.researchgate.net/", desc: "科研人员学术社交",
      region: "global" },
      { name: "Connected Papers", url: "https://www.connectedpapers.com/", desc: "论文关系图谱",
      region: "global" },
      { name: "掌桥科研", url: "https://www.zhangqiaokeyan.com/", desc: "中文文献一站检索" }
    ]
  },
  {
    name: "开发技术",
    icon: "💻",
    sites: [
      { name: "掘金", url: "https://juejin.cn", desc: "前端技术内容社区" },
      { name: "CSDN", url: "https://www.csdn.net", desc: "中文IT技术社区" },
      { name: "博客园", url: "https://www.cnblogs.com", desc: "开发者博客平台" },
      { name: "开源中国", url: "https://www.oschina.net", desc: "开源资讯与代码托管" },
      { name: "V2EX", url: "https://v2ex.com", desc: "创意工作者社区" },
      { name: "Gitee", url: "https://gitee.com", desc: "国内代码托管平台" },
      { name: "GitHub", url: "https://github.com", desc: "代码托管与开源社区", region: "global" },
      { name: "Stack Overflow", url: "https://stackoverflow.com", desc: "程序员问答社区", region: "global" },
      { name: "MDN", url: "https://developer.mozilla.org/zh-CN/", desc: "Web 技术权威文档", region: "global" },
      { name: "npm", url: "https://www.npmjs.com", desc: "JavaScript 包管理仓库", region: "global" },
      { name: "Can I Use", url: "https://caniuse.com/", desc: "浏览器兼容性查询", region: "global" },
      { name: "Docker Hub", url: "https://hub.docker.com", desc: "容器镜像仓库", region: "global" },
      { name: "Hugging Face", url: "https://huggingface.co", desc: "AI 模型与数据集", region: "global" }
    ]
  },
  {
    name: "AI 工具",
    icon: "🤖",
    sites: [
      { name: "DeepSeek", url: "https://chat.deepseek.com", desc: "深度求索 AI 对话" },
      { name: "智谱清言", url: "https://chatglm.cn", desc: "智谱 AI 大模型助手" },
      { name: "Kimi", url: "https://kimi.moonshot.cn", desc: "长文本理解 AI 助手" },
      { name: "豆包", url: "https://www.doubao.com", desc: "字节跳动 AI 助手" },
      { name: "文心一言", url: "https://yiyan.baidu.com", desc: "百度知识增强大模型" },
      { name: "通义千问", url: "https://tongyi.aliyun.com", desc: "阿里通义大模型" },
      { name: "腾讯元宝", url: "https://yuanbao.tencent.com", desc: "腾讯混元 AI 助手" },
      { name: "即梦AI", url: "https://jimeng.jianying.com", desc: "AI 图片视频创作" },
      { name: "LiblibAI", url: "https://www.liblib.art", desc: "AI 绘画模型社区" },
      { name: "量子位", url: "https://www.qbitai.com/", desc: "AI 前沿资讯媒体" },
      { name: "机器之心", url: "https://www.jiqizhixin.com/", desc: "人工智能技术媒体" },
      { name: "秘塔AI搜索", url: "https://metaso.cn/", desc: "没有广告的AI搜索" },
      { name: "Perplexity", url: "https://www.perplexity.ai/", desc: "国际AI搜索问答", region: "global" },
      { name: "ChatGPT", url: "https://chatgpt.com", desc: "OpenAI 对话助手", region: "global" },
      { name: "Claude", url: "https://claude.ai", desc: "Anthropic AI 助手", region: "global" },
      { name: "Midjourney", url: "https://www.midjourney.com", desc: "AI 绘画创作工具", region: "global" },
      { name: "Hugging Face", url: "https://huggingface.co", desc: "开源 AI 模型社区", region: "global" }
    ]
  },
  {
    name: "实用工具",
    icon: "🧰",
    sites: [
      { name: "在线工具", url: "https://tool.lu", desc: "程序员工具箱合集" },
      { name: "菜鸟工具", url: "https://c.runoob.com", desc: "在线编译与格式化" },
      { name: "Canva 可画", url: "https://www.canva.cn", desc: "在线平面设计" },
      { name: "ProcessOn", url: "https://www.processon.com", desc: "在线流程图思维导图" },
      { name: "腾讯文档", url: "https://docs.qq.com", desc: "在线协作文档" },
      { name: "石墨文档", url: "https://shimo.im", desc: "云端协作办公" },
      { name: "幕布", url: "https://mubu.com", desc: "大纲笔记与思维导图" },
      { name: "百度翻译", url: "https://fanyi.baidu.com", desc: "多语言在线翻译" },
      { name: "中国天气网", url: "https://www.weather.com.cn", desc: "官方天气预报" },
      { name: "快递100", url: "https://www.kuaidi100.com", desc: "快递单号查询" },
      { name: "下厨房", url: "https://www.xiachufang.com", desc: "家常菜谱大全" },
      { name: "文叔叔", url: "https://www.wenshushu.cn", desc: "免费大文件传输" },
      { name: "中国传统色彩", url: "https://zhongguose.com", desc: "传统色卡在线参考" },
      { name: "TinyPNG", url: "https://tinypng.com", desc: "图片无损压缩", region: "global" },
      { name: "DeepL翻译", url: "https://www.deepl.com/translator", desc: "高精度机器翻译", region: "global" },
      { name: "飞书", url: "https://www.feishu.cn/", desc: "字节协作办公平台" },
      { name: "WPS", url: "https://www.wps.cn/", desc: "金山办公套件" },
      { name: "腾讯软件中心", url: "https://pc.qq.com/", desc: "正版软件官方下载" },
      { name: "草料二维码", url: "https://cli.im/", desc: "二维码生成解析" },
      { name: "OBS Studio", url: "https://obsproject.com/", desc: "免费开源录屏直播",
      region: "global" },
      { name: "ShareX", url: "https://getsharex.com/", desc: "开源截屏录屏工具箱",
      region: "global" },
      { name: "EV 录屏", url: "https://www.ieway.cn/evcapture.html", desc: "免费无水印录屏" },
      { name: "ScreenToGif", url: "https://www.screentogif.com/", desc: "录制转GIF动图",
      region: "global" }
    ]
  },
  {
    name: "邮箱网盘",
    icon: "📮",
    sites: [
      { name: "QQ邮箱", url: "https://mail.qq.com/", desc: "腾讯邮箱服务" },
      { name: "网易邮箱", url: "https://mail.163.com/", desc: "网易免费邮箱" },
      { name: "Gmail", url: "https://mail.google.com/", desc: "谷歌邮箱服务",
      region: "global" },
      { name: "Outlook", url: "https://outlook.live.com/", desc: "微软邮箱服务",
      region: "global" },
      { name: "阿里云盘", url: "https://www.alipan.com/", desc: "不限速云存储" },
      { name: "夸克网盘", url: "https://pan.quark.cn/", desc: "夸克云存储服务" }
    ]
  },
  {
    name: "小说文学",
    icon: "📖",
    sites: [
      { name: "起点中文网", url: "https://www.qidian.com", desc: "最大原创网络文学平台" },
      { name: "番茄小说", url: "https://fanqienovel.com", desc: "字节旗下免费小说" },
      { name: "七猫小说", url: "https://www.qimao.com", desc: "免费小说阅读平台" },
      { name: "晋江文学城", url: "https://www.jjwxc.net", desc: "女频文学门户网站" },
      { name: "纵横中文网", url: "https://www.zongheng.com", desc: "老牌网络文学平台" },
      { name: "17K小说网", url: "https://www.17k.com", desc: "老牌原创文学网站" },
      { name: "飞卢小说网", url: "https://b.faloo.com", desc: "同人脑洞小说聚集地" },
      { name: "豆瓣阅读", url: "https://read.douban.com", desc: "严肃文学与出版" },
      { name: "微信读书", url: "https://weread.qq.com", desc: "正版图书无限卡" },
      { name: "书旗小说", url: "https://www.shuqi.com", desc: "阿里旗下阅读平台" },
      { name: "Webnovel", url: "https://www.webnovel.com", desc: "起点国际英文版", region: "global" },
      { name: "Royal Road", url: "https://www.royalroad.com", desc: "英文网文连载社区", region: "global" },
      { name: "Wattpad", url: "https://www.wattpad.com", desc: "国际故事分享社区", region: "global" },
      { name: "AO3", url: "https://archiveofourown.org", desc: "同人文学作品库", region: "global" },
      { name: "FanFiction", url: "https://www.fanfiction.net", desc: "英文同人小说站", region: "global" },
      { name: "NovelUpdates", url: "https://www.novelupdates.com", desc: "轻小说翻译索引", region: "global" }
    ]
  },
  {
    name: "漫画资源",
    icon: "💥",
    sites: [
      { name: "哔哩哔哩漫画", url: "https://manga.bilibili.com/", desc: "B站正版漫画平台" },
      { name: "腾讯动漫", url: "https://ac.qq.com/", desc: "腾讯正版动漫漫画" },
      { name: "快看漫画", url: "https://www.kuaikanmanhua.com/", desc: "条漫原创社区" },
      { name: "咚漫漫画", url: "https://www.dongmanmanhua.com/", desc: "Webtoon 中文正版" },
      { name: "布卡漫画", url: "https://www.buka.cn/", desc: "手机漫画阅读" },
      { name: "动漫之家", url: "https://www.idmzj.com/", desc: "动漫漫画社区" },
      { name: "Webtoon", url: "https://www.webtoons.com/en/", desc: "全球条漫平台",
      region: "global" },
      { name: "MangaDex", url: "https://mangadex.org/", desc: "漫画在线共享图书馆",
      region: "global" },
      { name: "MangaUpdates", url: "https://www.mangaupdates.com/", desc: "漫画数据库",
      region: "global" },
      { name: "MyAnimeList", url: "https://myanimelist.net/", desc: "动漫评分数据库",
      region: "global" },
      { name: "Comic Walker", url: "https://comic-walker.com/", desc: "KADOKAWA 官方漫画",
      region: "global" },
      { name: "番组计划", url: "https://bgm.tv/", desc: "动画漫画游戏数据库",
      region: "global" }
    ]
  },
  {
    name: "壁纸美图",
    icon: "🖼️",
    sites: [
      { name: "彼岸图网", url: "https://www.netbian.com", desc: "4K 电脑壁纸" },
      { name: "回车桌面", url: "https://www.enterdesk.com", desc: "桌面壁纸素材" },
      { name: "Wallhaven", url: "https://wallhaven.cc", desc: "高质量桌面壁纸库", region: "global" },
      { name: "Unsplash", url: "https://unsplash.com", desc: "免费高清摄影图库", region: "global" },
      { name: "Pexels", url: "https://www.pexels.com", desc: "免费商用图片视频", region: "global" },
      { name: "Pixabay", url: "https://pixabay.com", desc: "免版权图片插画", region: "global" },
      { name: "WallpaperHub", url: "https://wallpaperhub.app", desc: "4K 官方高清壁纸", region: "global" },
      { name: "InterfaceLIFT", url: "https://interfacelift.com", desc: "多分辨率壁纸", region: "global" },
      { name: "500px", url: "https://500px.com", desc: "摄影师作品社区", region: "global" },
      { name: "Flickr", url: "https://www.flickr.com", desc: "国际图片分享社区", region: "global" },
      { name: "国家地理", url: "https://www.nationalgeographic.com", desc: "国家地理影像", region: "global" },
      { name: "DeviantArt", url: "https://www.deviantart.com", desc: "国际艺术作品社区", region: "global" },
      { name: "ArtStation", url: "https://www.artstation.com", desc: "数字艺术作品集", region: "global" },
      { name: "Pixiv", url: "https://www.pixiv.net", desc: "插画漫画社区", region: "global" },
      { name: "Pinterest", url: "https://www.pinterest.com", desc: "图片灵感采集", region: "global" },
      { name: "图虫", url: "https://tuchong.com/", desc: "摄影师图片社区" }
    ]
  },
  {
    name: "旅游出行",
    icon: "✈️",
    sites: [
      { name: "携程", url: "https://www.ctrip.com", desc: "酒店机票一站式预订" },
      { name: "去哪儿", url: "https://www.qunar.com", desc: "旅行比价平台" },
      { name: "飞猪", url: "https://www.fliggy.com", desc: "阿里旗下旅行平台" },
      { name: "马蜂窝", url: "https://www.mafengwo.cn", desc: "旅行攻略社区" },
      { name: "穷游网", url: "https://www.qyer.com", desc: "出境游攻略平台" },
      { name: "途牛", url: "https://www.tuniu.com", desc: "跟团度假预订" },
      { name: "同程旅行", url: "https://www.ly.com", desc: "火车票机票酒店" },
      { name: "中国国家地理", url: "https://www.dili360.com", desc: "地理景观科普" },
      { name: "故宫博物院", url: "https://www.dpm.org.cn", desc: "官网门票与展览" },
      { name: "Tripadvisor", url: "https://www.tripadvisor.com", desc: "全球景点点评", region: "global" },
      { name: "Booking", url: "https://www.booking.com", desc: "国际酒店预订", region: "global" },
      { name: "Airbnb", url: "https://www.airbnb.com", desc: "国际民宿短租", region: "global" },
      { name: "Lonely Planet", url: "https://www.lonelyplanet.com", desc: "国际旅行指南", region: "global" }
    ]
  },
  {
    name: "纪录世界",
    icon: "🎥",
    sites: [
      { name: "中国纪录片网", url: "https://www.docuchina.cn/", desc: "国家级纪录片平台" },
      { name: "央视纪录片", url: "https://doc.cctv.com/", desc: "央视网纪录片频道" },
      { name: "哔哩哔哩纪录片", url: "https://www.bilibili.com/v/documentary/", desc: "B站纪录片专区" },
      { name: "Documentary Heaven", url: "https://documentaryheaven.com/", desc: "免费纪录片网站",
      region: "global" },
      { name: "Top Documentary Films", url: "https://topdocumentaryfilms.com/", desc: "高分纪录片推荐观看",
      region: "global" },
      { name: "Documentary Area", url: "https://documentaryarea.com/", desc: "免费纪录片合集",
      region: "global" },
      { name: "PBS", url: "https://www.pbs.org/", desc: "美国公共电视免费纪录片",
      region: "global" },
      { name: "互联网档案馆", url: "https://archive.org/", desc: "海量免费影像资料",
      region: "global" },
      { name: "NASA+", url: "https://plus.nasa.gov/", desc: "NASA 官方纪录影像",
      region: "global" }
    ]
  },
  {
    name: "生活服务",
    icon: "🏠",
    sites: [
      { name: "贝壳找房", url: "https://www.ke.com/", desc: "房产租房交易平台" },
      { name: "自如", url: "https://www.ziroom.com/", desc: "长租公寓平台" },
      { name: "链家", url: "https://www.lianjia.com/", desc: "二手房中介服务" },
      { name: "懂车帝", url: "https://www.dongchedi.com/", desc: "汽车资讯与报价" },
      { name: "汽车之家", url: "https://www.autohome.com.cn/", desc: "汽车选购平台" },
      { name: "丁香医生", url: "https://dxy.com/", desc: "可信健康科普平台" },
      { name: "好大夫在线", url: "https://www.haodf.com/", desc: "在线问诊挂号" },
      { name: "国家政务服务平台", url: "https://gjzwfw.www.gov.cn/", desc: "政务服务一网通办" },
      { name: "个人所得税", url: "https://etax.chinatax.gov.cn/", desc: "个税申报与查询" },
      { name: "中国裁判文书网", url: "https://wenshu.court.gov.cn/", desc: "裁判文书公开查询" },
      { name: "国家法律法规数据库", url: "https://flk.npc.gov.cn/", desc: "法律法规官方查询" },
      { name: "美团", url: "https://www.meituan.com/", desc: "外卖到店综合平台" },
      { name: "饿了么", url: "https://www.ele.me/", desc: "外卖配送服务" }
    ]
  }
];
