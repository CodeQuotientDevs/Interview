import path from "path";
import { config } from "@root/libs/dynamic-env";

const envFilePath = path.join(import.meta.dirname, "../.env");
config(envFilePath);

const bootstrapModule = await import("./bootstrap");

export const listener = bootstrapModule.listener;
