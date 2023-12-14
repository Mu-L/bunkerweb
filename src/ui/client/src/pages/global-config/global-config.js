import { createApp } from "vue";
import GlobalConfig from "./GlobalConfig.vue";
import { createPinia } from "pinia";
import { getI18n } from "@utils/lang.js";

const pinia = createPinia();

createApp(GlobalConfig)
  .use(pinia)
  .use(getI18n(["dashboard", "api", "action", "global_conf", "inp"]))
  .mount("#app");