import { createApp } from "vue";
import { createPinia } from "pinia";
import VChart from "vue-echarts";
import App from "@/app/App.vue";
import router from "@/app/router";
import "@/app/plugins/echarts";
import "@/style.css";
import { useThemeStore } from "@/shared/stores/theme";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.component("VChart", VChart);
useThemeStore(pinia);
app.mount("#app");
