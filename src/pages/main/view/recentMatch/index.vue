<template>
  <div class="mainDiv" v-if="!isPageNull">
    <dashboard/>
    <div class="matchs">
      <match :matchList="friendList" :win-count="friendTeamList" :game-type="gameType"></match>
      <match :matchList="enemyList"
             :win-count="enemyTeamTwoList"
             :game-type="gameType"
             :blackList="blackList"
             @openDrawer="openDrawer"
      ></match>
    </div>
    <div class="winStat">
      <span class="winCount">友方胜利次数 {{ friendTeamList[0] }}/{{ friendTeamList[1] }} 次</span>
      <span class="winCount">敌方胜利次数 {{ enemyTeamTwoList[0] }}/{{ enemyTeamTwoList[1] }} 次</span>
    </div>

    <n-drawer v-model:show="blacklistActice"
              :width="336" :placement="'right'">
      <n-drawer-content>
        <div v-for="detialsJson in detialsJsonList" style="margin-bottom: 20px">
          <n-space justify="space-between" style="width: 100%;">
            <n-tag size="large"
                   :bordered="false"
                   type="error" >{{detialsNickname}}</n-tag>
            <n-tag type="info" :bordered="false"
                   size="large">{{formatDate(detialsJson.UpdatedAt)}}</n-tag>

          </n-space>
          <div class="draContent">
            {{detialsJson.content}}
          </div>
          <n-space style="width: 100%;" justify="space-between">
            <n-tag type="error" :bordered="false">{{detialsJson.tag}}
            </n-tag>
            <n-popover trigger="hover" :show-arrow="false" placement="left">
              <template #trigger>
                <n-tag  :bordered="false"
                        type="info">{{detialsJson.playerSumName}}</n-tag>
              </template>
              <p>当前数据由此用户提供</p>
            </n-popover>

          </n-space>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
  <div v-else>
    <null-page/>
  </div>

</template>

<script setup lang="ts">
import {NSpace,NPopover,NTag,NDrawer,NDrawerContent} from 'naive-ui'
import Dashboard from "./dashboard.vue"
import Match from "./match.vue"
import NullPage from "../components/nullPage.vue"
import {recentMatch} from "../../lcu/recentMatchLcu"
import {onMounted,ref} from "vue"
import {blacklistServe} from "../../utils/request";

const friendList = ref([])
const enemyList = ref([])
const isPageNull = ref(true)
const friendTeamList = ref([0,0])
const enemyTeamTwoList = ref([0,0])
const blacklistActice = ref(false)
const blacklistDict:any = ref({})
const blackList:any = ref([])
const detialsNickname =ref('')
const detialsJsonList:any = ref([])
const gameType = ref(420)

onMounted(async () => {
  const RecentMatch = new recentMatch()
  const isSession = await RecentMatch.checkmatchSession()
  if (isSession){
    RecentMatch.fromLcuQuery().then((matchList) => {
      init(matchList)
    })
  }else {
    setTimeout(() => {
      RecentMatch.fromLogQuery().then((matchList) => {
        init(matchList)
      })
    },3000)
  }
})

const init = (matchList:any) => {
  if (matchList.friendList.length !== 0){
    isPageNull.value = false
  }else {
    return
  }
  checkBlacklist(matchList.enemyList)
  gameType.value = <number>matchList.gameType
  friendList.value = matchList.friendList
  enemyList.value = matchList.enemyList
}

const checkBlacklist = async (enemyList:[]) => {
  const config = JSON.parse(<string>(localStorage.getItem('config')))
  if (!config.isSwitchBlacklist){
    return
  }
  const areaSetting = config.currentArea
  const enemySummonerList = enemyList.reduce((res:any,item:any) => {
    return res.concat([
      item.summonerId
    ])
  },[])

  const res = await  blacklistServe({
    url:'/hater/findHaterBySumId',
    data:{'sumIdList':enemySummonerList,'area':areaSetting},
    method:'POST'
  })
  if (res.data.code !== 0){
    return
  }else {
    let init = true
    for (const re of res.data.data) {
      blacklistDict.value[re.sumId] = []
      for (const reElement of re.blacklist) {
        if (reElement.isShow){
          blackList.value.push(re.sumId)
          blacklistDict.value[re.sumId].push(reElement)
          if (init){
            blacklistActice.value = true
            detialsJsonList.value = blacklistDict.value[re.sumId]
            detialsNickname.value = re.nickName
            init=false
          }
        }
      }
    }
  }
}

const openDrawer = (summonerId:string,summonerName:string) => {
  detialsNickname.value = summonerName
  blacklistActice.value=true
  detialsJsonList.value = blacklistDict.value[summonerId]
}
const formatDate = (dateStr:string) => {
  return dateStr.split('T')[0]
}
</script>

<style scoped>
.matchs {
  width: calc(100% - 24px);
  display: flex;
  justify-content: space-between;
  margin: 0px 12px 12px 12px;
  position: relative;
}
.winStat {
  display: flex;
  position: absolute;
  right: 30px;
  top: 21px;
}
.winCount {
  display: flex;
  color: #666666;
  height: 22px;
  background-color: #e3e3e3;
  font-size: 13px;
  padding: 0px 5px 0px 5px;
  border-radius: 2px;
  align-items: center;
  margin-right: 15px;
}
.draContent {
  margin: 15px 0px;
  color: #9AA4AF;
  font-size: 13px;
}
</style>
