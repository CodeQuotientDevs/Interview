import { Router } from "express";

import v1 from "./v1";

export const api = Router();
api.get("/test", (req, res) => {
    return res.send("TEST");
});
api.use("/v1", v1);

export default api;