<script setup lang="ts" name="TopArticleCard">
import { computed, ref, unref } from "vue";
import { useUnrefData, usePosts, getBgColor } from "../configProvider";
import { useDesign } from "../hooks";
import HomeCard from "./HomeCard.vue";
import topArticleSvg from "../assets/svg/topArticle";
import { TkContentData } from "../post/types";
import { isFunction } from "../helper";
import { TopArticle } from "../config/types";

const { getPrefixClass, namespace } = useDesign();
const prefixClass = getPrefixClass("topArticle");

const posts = usePosts();

const { theme, frontmatter } = useUnrefData();
// 精选文章配置项
const {
  limit = 4,
  title = `${topArticleSvg}精选文章`,
  autoPage = false,
  pageSpeed = 4000,
}: TopArticle = { ...theme.topArticle, ...frontmatter.tk?.topArticle };

const topArticleList = computed(() => {
  const sortPostsByDateAndSticky: TkContentData[] = unref(posts).sortPostsByDateAndSticky;
  return sortPostsByDateAndSticky.filter(p => p.frontmatter.top)?.map((p, index) => ({ ...p, num: index + 1 }));
});

const pageNum = ref(1);

// 当前页的文章列表
const currentTopArticleList = computed(() => {
  const p = unref(pageNum);
  return unref(topArticleList).slice((p - 1) * limit, p * limit);
});

const finalTitle = computed(() => {
  if (isFunction(title)) return title(topArticleSvg);
  return title;
});

const bgColor = getBgColor();
const itemRefs = ref<HTMLLIElement[]>([]);

const getStyle = (num: number, index: number) => {
  return {
    [`--${namespace}-num-bg-color`]: bgColor[num % bgColor.length],
    top: `calc(${index} * (calc(var(--${namespace}-gap2) + ${unref(itemRefs)?.[index]?.getBoundingClientRect().height || 0}px)))`,
  };
};
</script>

<template>
  <HomeCard
    page
    v-model="pageNum"
    :pageSize="limit"
    :total="topArticleList.length"
    :title="finalTitle"
    :autoPage
    :pageSpeed
    :class="prefixClass"
  >
    <template #default="{ transitionName }">
      <TransitionGroup
        v-if="topArticleList.length"
        :name="transitionName"
        tag="ul"
        mode="out-in"
        :class="`${prefixClass}-list flx-column`"
      >
        <li
          ref="itemRefs"
          v-for="(item, index) in currentTopArticleList"
          :key="item.num"
          :class="`${prefixClass}-list__item`"
          :style="getStyle(item.num - 1, index)"
        >
          <span :class="['num', { sticky: item.frontmatter.sticky }]">{{ item.num }}</span>
          <div :class="`${prefixClass}-list__item-info`">
            <a :href="item.url" class="flx-align-center">
              <span class="title sle">{{ item.title }}</span>
            </a>
            <div class="date">{{ item.date }}</div>
          </div>
        </li>
      </TransitionGroup>

      <div v-else :class="`${prefixClass}-empty`">暂无精选内容</div>
    </template>
  </HomeCard>
</template>

<style lang="scss" scoped>
@use "../styles/components/topArticleCard.scss";
</style>
