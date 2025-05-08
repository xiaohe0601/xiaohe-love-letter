<template>
  <AppPage class="souvenir-wrapper">
    <div class="souvenir-mask" :class="maskClasses" @click="handleMaskClick()">
      <span class="souvenir-mask__text">任意点击即可进入</span>
    </div>

    <div class="souvenir-moments">
      <span>
        现在是
        <a
          class="moment-value is-link"
          href="https://github.com/xiaohe0601"
          target="_blank">小何</a>
        和
        <span class="moment-value">小周</span>
        在一起的
      </span>

      <span class="mt-2">
        第
        <span class="moment-value">{{ souvenir.days }}</span>
        天
        <span class="moment-value">{{ souvenir.hours }}</span>
        时
        <span class="moment-value">{{ souvenir.minutes }}</span>
        分
        <span class="moment-value">{{ souvenir.seconds }}</span>
        秒
      </span>
    </div>

    <audio
      ref="player"
      class="hidden"
      src="/assets/music/background.mp3"
      preload="auto"
      :loop="true"></audio>
  </AppPage>
</template>

<script lang="ts" setup>
import dayjs from "dayjs";

const playerEl = useTemplateRef("player");

const now = useNow({
  interval: 1000
});

const souvenir = computed(() => {
  const diff = dayjs(now.value.valueOf())
    .diff(dayjs(import.meta.env.VITE_TOGETHER_TIME, "YYYY-MM-DD HH:mm:ss"), "second");

  const days = Math.floor(diff / (60 * 60 * 24));
  const hours = Math.floor((diff - days * 60 * 60 * 24) / (60 * 60));
  const minutes = Math.floor((diff - days * 60 * 60 * 24 - hours * 60 * 60) / 60);
  const seconds = diff - days * 60 * 60 * 24 - hours * 60 * 60 - minutes * 60;

  return {
    days,
    hours,
    minutes,
    seconds
  };
});

const maskVisible = ref(true);

const maskClasses = computed(() => {
  return {
    "is-visible": maskVisible.value
  };
});

function handleMaskClick() {
  maskVisible.value = false;

  playerEl.value!.play();
}
</script>

<style>
body {
  background-color: #ff5555;
}
</style>

<style scoped>
.souvenir-wrapper {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  padding: 1.5rem;
  font-size: 1rem;
  color: #ffffff;
  pointer-events: none;
}

.souvenir-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 0;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
  background-color: #ff5555;
  transition: height ease-out 300ms;
}

.souvenir-mask.is-visible {
  height: 100%;
}

.souvenir-mask__text {
  font-size: 2.25rem;
}

.souvenir-moments {
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  user-select: none;
}

.moment-value {
  margin-right: 0.25rem;
  margin-left: 0.25rem;
  font-size: 1.75rem;
}

.moment-value.is-link {
  color: #ffffff;
  text-decoration: none;
}
</style>