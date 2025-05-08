import { createApp } from "vue";
import App from "./App.vue";
import "ress";
import "virtual:uno.css";
import "@/plugins/dayjs";

async function bootstrap() {
  const app = createApp(App);

  app.mount("#app");
}

void bootstrap();