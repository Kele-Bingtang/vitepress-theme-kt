import { onMounted, onUnmounted, reactive, watch } from "vue";

export function useAnchorScroll() {
  // 初始化当前锚点
  const currentAnchor = reactive({
    id: "",
    top: -1,
  });

  /**
   * 定义计算当前锚点的方法
   */
  const calculateCurrentAnchor = () => {
    // 获取页面中所有的锚点元素
    const anchors = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const rect = anchor.getBoundingClientRect();
      // 如果当前锚点距离顶部最近，且距离页面顶部小于等于 150，则将其设置为当前锚点
      if (rect.top <= 150 && anchor.id !== currentAnchor.id) {
        currentAnchor.id = anchor.id;
        currentAnchor.top = rect.top;
      }
    }
  };

  /**
   * 监听 window 对象的滚动事件
   */
  const onScroll = () => {
    calculateCurrentAnchor();
  };

  /**
   * 在组件挂载时启动监听滚动事件
   */
  onMounted(() => {
    window.addEventListener("scroll", onScroll);
  });

  /**
   * 在组件卸载时移除监听滚动事件
   */
  onUnmounted(() => {
    window.removeEventListener("scroll", onScroll);
  });

  /**
   * 文档更新锚点的时候更新 url 中的 hash
   */
  const startWatch = () => {
    watch(
      () => currentAnchor.id,
      (val: string) => {
        if (val) window.history.replaceState(history.state || null, "", `#${val}`);
      }
    );
  };

  return { startWatch };
}
