<template>
  <div v-if="runeDataListFor.length !==0">
    <n-card class="boxShadow" size="small">
      <n-space justify="space-between">
        <n-badge :value="isAutoRune" color="#ff6666">
          <n-avatar
            round
            :bordered="false"
            :size="50"
            :src="currentChampImgUrl"
            fallback-src="https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/usericon/4027.png"
            style="display: block"
            @click="restraintActive = true"
          />
        </n-badge>

        <n-select @update:value="changeRuneType($event)" style="width: 100px"
                  v-model:value="runeValue" :options="runeOptions" />

        <div class="buttonSwitch">
          <n-space >
            <n-button text style="font-size: 2em" @click="pageBack">
              <n-icon>
                <arrow-big-left-line></arrow-big-left-line>
              </n-icon>
            </n-button>
            <n-button text style="font-size: 2em" @click="pageNext">
              <n-icon>
                <arrow-big-right-line></arrow-big-right-line>
              </n-icon>
            </n-button>
          </n-space>
        </div>
      </n-space>
    </n-card>
    <n-grid :cols="2" >
      <n-gi v-for="rune in runeDataListFor">
        <n-card class="boxShadow runeCard" size="small">
          <n-space :size=[-5,0] align="stretch" justify="space-between">
            <n-space vertical  :size=[1,-5]>
              <img :src="getImaUrl(rune.selectedPerkIds[0])" alt="" class="runImg">
              <img :src="getImaUrl(rune.selectedPerkIds[1])" alt="" class="runImg">
              <img :src="getImaUrl(rune.selectedPerkIds[2])" alt="" class="runImg">
              <img :src="getImaUrl(rune.selectedPerkIds[3])" alt="" class="runImg">
              <n-tag :bordered="false" type="error" size="medium" style="margin-top: 6px">
                {{ getPosition(rune.position) }}
              </n-tag>

            </n-space>
            <n-space vertical :size=[1,-5]>
              <img :src="getImaUrl(rune.selectedPerkIds[4])" alt="" class="runImg">
              <img :src="getImaUrl(rune.selectedPerkIds[5])" alt="" class="runImg">
              <div class="runSondary">
                <img :src="getImaUrl(rune.selectedPerkIds[6])" alt="" class="runImgseSondary">
                <img :src="getImaUrl(rune.selectedPerkIds[7])" alt="" class="runImgseSondary">
                <img :src="getImaUrl(rune.selectedPerkIds[8])" alt="" class="runImgseSondary">
              </div>
              <div style="margin-top: 12px">
                <n-tag :bordered="false" type="success" style="cursor:pointer"
                       size="medium" @click="applyRune(rune)">
                  应用
                </n-tag>
              </div>
            </n-space>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>
    <n-card class="boxShadow bottomTip" size="small">
      <n-space :size="[44,0]">
        <div class="skillDiv slide-in-bottom" v-for="skills in skillsAndItems[0]">
          <img class="itemImg" :src="skills[0]">
          <strong class="skillText">{{ skills[1] }}</strong>
        </div>
        <div class="skillDiv slide-in-bottom" v-for="items in skillsAndItems[itemCount]">
          <img :src="items" class="itemImg">
        </div>
      </n-space>
      <div class="itemsTotal slide-in-bottom" v-if="skillsAndItems.length !=0">
        <n-space>
          <n-button size="tiny" text text-color="#9aa4af" @click="changeItemsImg">
            切换装备
          </n-button>

          <div style="width: 32px;">
            <span>{{ itemCount }}</span>
            <span>/</span>
            <span>{{ skillsAndItems.length - 1 }}</span>
          </div>
        </n-space>
      </div>
      <div class="runesTotal slide-in-bottom" v-if="skillsAndItems.length !=0">
        <n-space>
          <n-button size="tiny" text text-color="#9aa4af">
            符文数量
            <p style="font-size: 14px;margin-left: 8px">{{runeDataCount}}</p>
          </n-button>
        </n-space>
      </div>
    </n-card>

    <n-drawer :auto-focus="false" v-model:show="restraintActive"
              style="border-top-left-radius: 12px;border-top-right-radius: 12px"
              :height="546" placement="bottom">
      <n-drawer-content >
        <restraint :champ="currentChamp" @autoRune="autoRune"></restraint>
      </n-drawer-content>
    </n-drawer>
  </div>

  <div v-else>
    <n-card class="boxShadow" size="small">
      <n-space justify="center" vertical>
        <p style="color: #9aa4af;">符文来源 OP.GG or 101.QQ.com</p>
        <p style="color: #9aa4af;">英雄选择完毕才可以使用符文配置功能</p>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import {
  NCard, NAvatar, NSpace, NTag, NGrid, NGi, NIcon,
  NBadge, NButton, useMessage,NDrawer, NDrawerContent,NSelect
} from 'naive-ui'
import Restraint from "./restraint.vue";
import {Ref, ref} from "vue";
import {champDict, mapNameFromUrl} from '../../resources/champList'
import {ArrowBigRightLine, ArrowBigLeftLine} from '@vicons/tabler'
import {request} from "../../utils/request"
import {applyRunePage} from "../../lcu/runeLcu";
import {get101Runes} from "../../utils/rune/get101Runes";
import {isStoreageHas} from "../../lcu/utils";
import {invokeLcu} from "../../lcu";
import {OnlineRunes, Block} from "../../interface/runeTypes";

const currentChamp:Ref<number> = ref(0)
const currentChampImgUrl = ref('')
const currentChampAlias = ref('')
let runeDataList:any[] = []
const runeDataCount = ref(0)
const runeDataListFor:Ref<any> = ref([])
let pageStart = 0
let pageEnd = 0
const isAutoRune = ref('')
const skillsAndItems:Ref<any> = ref([])
const itemCount = ref(1)
let currentGameMode:any = ""
const restraintActive = ref(false)
const config = JSON.parse(<string>(localStorage.getItem('config')))
const runeValue =  ref(config.runeType)
const runeOptions =  [
  {
    label: '国服数据',
    value: '国服数据'
  },
  {
    label: "韩服数据",
    value: '韩服数据',
  }]
const emits = defineEmits(['changePage'])
const message = useMessage()

cube.windows.message.on('received',async (id, content) => {
  if (id==='champion'){
    const champ = JSON.parse(content.value)
    let gameMode

    if (champ.data === 0) {
      currentChamp.value = 0
      currentGameMode = ''
      runeDataListFor.value.length = 0
      emits('changePage',false)
      return
    }
    if (champ.data !== currentChamp.value) {
      emits('changePage',true)
      gameMode = await getGameMode()
      runeDataList = []
      skillsAndItems.value = []
      itemCount.value = 1
      isAutoRune.value = isStoreageHas('autoRunes',String(champ.data)) == true ? 'auto' : ''
      currentChamp.value = champ.data
      mapChamp(champ.data)
      getRuneData(gameMode)
    }
    // 设置当前游戏模式
    if (currentGameMode === ''){currentGameMode = gameMode}
  }
})


// 判断当前游戏模式
const getGameMode = async () => {
  const session = await invokeLcu('get','/lol-lobby/v1/parties/gamemode')
  if (session?.queueId === 450){
    return 'aram'
  }else {
    return 'other'
  }
}

// 获取英雄数据
const getChampInfo = async (gameMode:string):Promise<OnlineRunes[]> => {
  if (gameMode === 'aram' && currentGameMode === 'aram') {
    return (await request({
      url: `https://frank-1304009809.cos.ap-chongqing.myqcloud.com/op.gg-aram/${currentChampAlias.value}.json`,
      method: 'GET',
    })).data
  } else {
    return (await request({
      url: `https://frank-1304009809.cos.ap-chongqing.myqcloud.com/op.gg/${currentChampAlias.value}.json `,
      method: 'GET',
    })).data
  }
}


// 获取符文数据
// https://lol.ps/api/champ/34/versus.json?region=0&version=64&tier=2&lane=2
const getRuneData = async (gameMode:string) => {
  // 判断当前英雄是否配置看自动符文
  if (isStoreageHas('autoRunes',String(currentChamp.value))){
    const runeData = JSON.parse(String(localStorage.getItem('autoRunes')))[String(currentChamp.value)]
    applyRunePage(runeData)
  }

  try {
    const champInfo:OnlineRunes[] = await getChampInfo(gameMode)
    // 技能
    getSkillsImgUrl(champInfo[0].skillsImg, champInfo[0].skills)
    // 自动写入装备
    if (await autoWriteBlock(JSON.parse(JSON.stringify(champInfo)))){
      message.success('自动写入装备成功')
    }

    for (const champ of champInfo) {
      // 符文
      for (const rune of champ.runes) {
        if (gameMode == 'aram' && currentGameMode === 'aram') {
          rune.position = 'aram'
        }
        runeDataList.push(rune)
      }
      // 装备
      getItemImgUrl(champ.itemBuilds[0].blocks)
    }
    if (runeValue.value ==='国服数据' && gameMode !== 'aram'){
      runeDataList = await get101Runes(currentChamp.value)
    }
    runeDataCount.value = runeDataList.length
    pageStart = 0
    pageEnd = runeDataList.length > 4 ? 4 : runeDataList.length
    runeDataListFor.value = runeDataList.slice(pageStart, pageEnd)

    if (isStoreageHas('autoRunes',String(currentChamp.value))) {
      message.success('自动配置符文成功')
    }

  } catch (e) {
    console.log(e)
  }

}

// 自动写入装备
const autoWriteBlock = async (champInfo:OnlineRunes[]):Promise<boolean> => {
  if (localStorage.getItem('locale')!=='zh_CN'){return false}
  if (!config.autoWriteBlock){return false}
  const blockPath = (await invokeLcu('get','/data-store/v1/install-dir')).
    replace('LeagueClient','Game')+"/Config/Global/Recommended/frank.json"

  let blocksList:any[] = []
  // 合并不同路的出装
  for (const champ of champInfo) {
    const position = getPosition(champ.position)
    const itemBuilds = champ.itemBuilds[0]
    blocksList = blocksList.concat(handleBlocks(itemBuilds.blocks,position as string))
  }

  const buildItems = champInfo[0].itemBuilds[0]
  const name = mapNameFromUrl[champInfo[0].name].label +'-' +mapNameFromUrl[champInfo[0].name].name
  buildItems.title = name + ' 推荐出装 ' + 'lolfrank.cn'
  buildItems.blocks = blocksList

  return await cube.io
          .writeFileContents(blockPath, JSON.stringify(buildItems))
          .then((res) => true)
          .catch((err) => false)
}

// 处理出装字段
const handleBlocks = (blocks:Block[],position:string) => {
  let startItemCount = 0
  let coreItemCount = 0
  const blocksResult:Block[] = []
  for (const block of blocks) {
    if (block.type.indexOf('Starter') !== -1 && startItemCount< 2){
      block.type = position+' '+ block.type.replace('Starter Items,','出门装:').
        replace('Pick','选择次数').
        replace('Win Rate','胜率')
      startItemCount+=1
      blocksResult.push(block)
    }else if (block.type.indexOf('Core') !== -1 && coreItemCount< 3) {
      block.type =  position+' '+ block.type.replace('Core Items,','核心装备:').
      replace('Pick','选择次数').
      replace('Win Rate,','胜率')
      coreItemCount+=1
      blocksResult.push(block)
    }
  }
  return blocksResult
}

// const test = () => {
//   currentChampAlias.value = 'Viktor'
//   currentChamp.value = 112
//   currentChampImgUrl.value = `https://game.gtimg.cn/images/lol/act/img/champion/Viktor.png`
//   getRuneData('')
// }
// test()

// 切换不同服务器的符文数据
const changeRuneType = (type:string) => {
  if (type==='国服数据'){
    runeValue.value ='国服数据'
    config.runeType = '国服数据'
    localStorage.setItem('config',JSON.stringify(config))
  }else {
    runeValue.value ='韩服数据'
    config.runeType = '韩服数据'
    localStorage.setItem('config',JSON.stringify(config))
  }
  runeDataList =[]
  runeDataListFor.value = []
  skillsAndItems.value = []
  itemCount.value = 1
  getRuneData(currentGameMode)
}



// 切换不同的装备进行显示
const changeItemsImg = () => {
  if (itemCount.value < skillsAndItems.value.length - 1) {
    itemCount.value += 1
  } else {
    itemCount.value = 1
  }
}

// 获取装备图片链接数组
const getItemImgUrl = (blocks:any[]) => {
  for (const blocksElement of blocks) {
    if (blocksElement.type.indexOf('Core')!==-1) {
      var currentItemList = []
      if (blocksElement.items.length > 3){blocksElement.items = blocksElement.items.slice(1)}
      for (const items of blocksElement.items) {
        const itemImgUrl = `https://game.gtimg.cn/images/lol/act/img/item/${items.id}.png`
        currentItemList.push(itemImgUrl)
      }
      skillsAndItems.value.push(currentItemList)
    }
  }

}
// 获取技能图片链接数组
const getSkillsImgUrl = (skillsImg:any, skills:any) => {
  let skillsList = []

  for (let i = 0; i < skillsImg.length; i++) {
    const skillImgUrl = `https://game.gtimg.cn/images/lol/act/img/spell/${skillsImg[i]}`
    skillsList.push([skillImgUrl, skills[i]])
  }
  skillsAndItems.value.push(skillsList)
}

// 获取图片地址
const getImaUrl = (imgId:any) => {
  return  new URL(`/src/assets/runes/${imgId}.png`, import.meta.url).href
}
// 获取位置信息
const getPosition = (pos:string) => {
  switch (pos) {
    case 'middle':
      return '中单';
    case 'top':
      return '上单';
    case 'support':
      return '辅助';
    case 'jungle':
      return '打野';
    case 'bottom':
      return '射手';
    case 'aram':
      return '极地';
    case 'mid':
      return '中单';
  }
}
// 通过英雄ID获取部分信息
const mapChamp = (champId:any) => {
  currentChampImgUrl.value = `https://game.gtimg.cn/images/lol/act/img/champion/${champDict[champId].alias}.png`
  currentChampAlias.value = champDict[champId].alias
}
// 应用符文
const applyRune = async (data:{}) => {
  let tempData = JSON.parse(JSON.stringify(data))
  // @ts-ignore
  tempData.name = mapNameFromUrl[data.alias].name + " By Frank"
  const isApplySuccess = await applyRunePage(tempData)

  if (isApplySuccess){
    message.success('符文配置成功')
  }else {
    message.error('符文配置失败')
  }
}

// 上一页
const pageBack = () => {
  if (pageStart != 0 && pageEnd != runeDataList.length) {
    pageStart = pageStart - 4
    pageEnd = pageEnd - 4
    runeDataListFor.value = runeDataList.slice(pageStart, pageEnd)
  } else if (pageEnd == runeDataList.length && pageStart!==0) {
    pageEnd = pageStart
    pageStart = pageStart - 4
    runeDataListFor.value = runeDataList.slice(pageStart, pageEnd)
  } else {
    message.warning('当前是首页哦!')
  }

}
// 下一页
const pageNext = () => {
  const dataListLen = runeDataList.length
  if (pageEnd + 4 < dataListLen) {
    pageStart = pageEnd
    pageEnd = pageEnd + 4
    runeDataListFor.value = runeDataList.slice(pageStart, pageEnd)
  } else if (pageEnd < dataListLen) {
    pageStart = pageEnd
    pageEnd = dataListLen
    runeDataListFor.value = runeDataList.slice(pageStart, pageEnd)
  } else {
    message.warning('已经是最后一页咯!')
  }
}

const autoRune = (e:boolean) => {
  if (e){
    isAutoRune.value='auto'
  }else {
    isAutoRune.value=''
  }
}
</script>

<style scoped>
.n-card {
  margin: 15px;
  border-radius: 10px;
  width: auto;
}

.n-space {
  align-items: center;
}

.runImgPrimary {
  width: 50px;
  height: 50px;
}

.runImg {
  width: 30px;
  height: 30px;
}

.runImgseSondary {
  width: 25px;
  height: 25px;
  margin-bottom: -3px;
}

.n-card > .n-card__content > .runeCard {
  padding: 0 !important;
}

.buttonSwitch {
  margin-top: 10px;
}
.runeSelect {
  width: 95px;
  position: absolute;
  bottom: -25px;
  right: -10px;
}
.bottomTip {
  height: 70px;
  padding-top: 0px;
  padding-left: 1px;
  margin-top: -1px;
}

.itemImg {
  width: 35px;
  height: 35px;
  border-radius: 4px;
  position: absolute;
}

.skillDiv {
  position: relative;
}

.skillText {
  width: 16px;
  height: 16px;
  position: absolute;
  top: 19px;
  left: 19px;
  background: rgba(32, 45, 55, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  white-space: nowrap;
  color: rgb(0, 215, 176) !important;
  font-size: 11px !important;
}

.itemsTotal {
  position: absolute;
  right: 4px;
  bottom: -2px;
  color: #9aa4af
}
.runesTotal {
  position: absolute;
  left: 18px;
  bottom: -2px;
  color: #9aa4af
}

.slide-in-bottom {
  -webkit-animation: slide-in-bottom 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
  animation: slide-in-bottom 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
}

@keyframes slide-in-bottom {
  0% {
    -webkit-transform: translateY(1000px);
    transform: translateY(1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
}
.runSondary {
  display: flex;
  flex-direction: column;
  margin-bottom: 2.8px;
}

</style>
