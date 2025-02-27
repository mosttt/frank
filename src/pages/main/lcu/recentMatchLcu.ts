import {invokeLcu} from "./index";
import {englishToChinese, getPosition} from "./utils";
import {champDict} from "../resources/champList";

export class recentMatch {
  public matchSession: any
  public playerChampionSelections: any = {}
  public currentId: number = 0
  public gameType: number = 420

  // 初始化数据
  public init = async () => {
    // this.matchSession = (await request({
    //   'url': 'https://cdn.syjun.vip/frank/sessionTest.json',
    //   method: 'GET',
    // })).data

    this.matchSession = await invokeLcu('get','/lol-gameflow/v1/session')
    this.gameType = this.matchSession?.gameData?.queue?.id
    this.currentId = (await invokeLcu('get', '/lol-summoner/v1/current-summoner')).summonerId
    this.matchSession?.gameData?.playerChampionSelections.forEach((res: any) => {
      this.playerChampionSelections[(res.summonerInternalName)] = res.championId
    })
  }

  // 通过lcu接口获取数据再次进行解析
  public simplifySummonerInfo = async (summonerList: {}[]) => {
    try {
      const info: any = await summonerList.reduce(async (res: any, item: any) => {
        return (await res).concat({
          summonerId:`${item.summonerId}`,
          puuid:item.puuid,
          rankPoint: await this.queryRankPoint(item.puuid),
          summonerName: item.summonerName,
          matchHistory:[],
          index: getPosition(item.selectedPosition),
          championUrl: (this.gameType === 420 || this.gameType === 440) ? `https://game.gtimg.cn/images/lol/act/img/champion/${champDict[String(this.playerChampionSelections[(item.summonerName.toLowerCase())])].alias}.png`:
            `https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/${item.profileIconId}.png`
        })
      }, [])
      return info.sort((x: any, y: any) => {
        return x.index - y.index
      })
    }catch (e) {
      return []
    }
  }

  // 检测LCU接口数据是否正常
  public checkmatchSession = async () => {
    await this.init()
    if (this.matchSession?.gameData?.teamOne.length !== 0 ){
      return true
    }else {
      return false
    }
  }

  // 获取段位数据
  public queryRankPoint = (puuid: string) => {
    return invokeLcu('get', `/lol-ranked/v1/ranked-stats/${puuid}`).then((res: any) => {
      const rankData = res.queueMap
      return ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'].reduce((res: any, item: string) => {
        const tier = rankData[item].tier === "NONE" ? '未定级' : englishToChinese(rankData[item].tier)
        const division = rankData[item].division === 'NA' ? '' : rankData[item].division
        return res.concat([
          tier !== '未定级' ? `${tier}${division}`: '未定级'
        ])
      }, [])
    }).catch(() => {
      return null
    })
  }

  // 查询游戏日志路径
  public queryLogPath = async ():Promise<string|null> => {
    try {
      const clientPath = (await invokeLcu('get','/data-store/v1/install-dir')).replace('LeagueClient','Game')+'\\Logs\\GameLogs'
      const logDir = await cube.io.readdir(clientPath)
      const logPath = (logDir[logDir.length-1]).name
      const logPathName = await cube.io.readdir(`${clientPath}/${logPath}`)
      if (logPathName.length ===3){
        return `${clientPath}/${logPath}/${logPathName[2].name}`
      }else {
        return null
      }
    }catch (e) {
      return null
    }
  }

  // 查询本局游戏日志内容
  public queryLogContent = async () => {
    const logPath = await this.queryLogPath()
    if (logPath === null){
      return null
    }
    try {
      const file = await cube.io.readFileContents(<string>logPath)
      const code = file.split(/[\n]+/).slice(20,51)
      const playerInfos:string[] = []

      mainfor:
        for (const string of code) {
          if (string.indexOf('Champion')!==-1){
            playerInfos.push(string)
            if (playerInfos.length===10){
              break mainfor
            }
          }
        }
      return playerInfos
    }catch (e) {
      return null
    }
  }

  // 通过日志查询数据
  public fromLogQuery = async () => {
    const logContent = await this.queryLogContent()
    if (logContent ===null || logContent.length===0){
      return {friendList: <any[]>[]}
    }
    const re:RegExp = /\([^\)]+\)/g
    const friendList:{}[] = []
    const enemyList:{}[] = []
    try {
      for (const log of logContent) {
        let logList = log.split(/\s+/)
        if (logList.length===17){
          logList.splice(9,1)
        }
        const summonerName = (logList[8].match(/\'(\S*)\'/) as RegExpMatchArray)[1]
        const matchHistory:any[] = []
        const champName = (logList[10].match(re) as RegExpMatchArray)[0].replace(/\(|\)/g,'')
        const championUrl = `https://game.gtimg.cn/images/lol/act/img/champion/${champName}.png`
        const puuid = (logList[13].match(re) as RegExpMatchArray)[0].replace(/\(|\)/g,'')
        const rankPoint = await this.queryRankPoint(puuid)

        const result = {
          puuid,rankPoint,summonerName,matchHistory,championUrl
        }
        if (logList[6] === 'TeamOrder'){
          friendList.push(result)
        }else {
          enemyList.push(result)
        }
      }
    }catch (e) {
      return {friendList: []}
    }
    return {friendList, enemyList,gameType:this.gameType}
  }

  // 通过Lcu接口查询数据
  public fromLcuQuery = async () => {
    if (this.gameType===undefined){return {friendList: <any[]>[]}}
    const isTeamOne = this.matchSession.gameData.teamOne.find((i: any) => i.accountId === this.currentId) !== undefined?true:false
    const [friendList,enemyList] = await Promise.all([
      isTeamOne === true ? this.simplifySummonerInfo(this.matchSession.gameData.teamOne) : this.simplifySummonerInfo(this.matchSession.gameData.teamTwo),
      isTeamOne === true ? this.simplifySummonerInfo(this.matchSession.gameData.teamTwo) : this.simplifySummonerInfo(this.matchSession.gameData.teamOne)
    ])
    return {friendList, enemyList,gameType:this.gameType}
  }
}
