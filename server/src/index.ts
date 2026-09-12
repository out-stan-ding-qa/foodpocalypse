import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();
app.listen(config.port, () => {
  console.log(`Foodpocalypse (${config.appEnv}) http://127.0.0.1:${config.port}`);
});
