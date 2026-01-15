import MainClient from "@/client/main-client";
import LoginClient from "@/client/login-client";

import { createMainStore } from "./interview-store/store";
import { createAppStore } from "./app-store"
import { loginClientURL, mainClientURL } from "./config";

const mainClient = new MainClient(mainClientURL);
const loginClient = new LoginClient(loginClientURL);

export const useAppStore = createAppStore(loginClient);
export const useMainStore = createMainStore(mainClient);
export { loginClient };
