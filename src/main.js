import "./style.css";
import Alpine from "alpinejs";
import { scorecardApp } from "./app.js";

Alpine.data("scorecardApp", scorecardApp);
window.Alpine = Alpine;
Alpine.start();
