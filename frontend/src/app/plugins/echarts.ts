import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart, BarChart } from "echarts/charts";
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
} from "echarts/components";

use([CanvasRenderer, PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, TitleComponent]);
