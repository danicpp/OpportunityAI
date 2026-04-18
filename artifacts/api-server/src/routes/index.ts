import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import extractRouter from "./extract";
import opportunitiesRouter from "./opportunities";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(extractRouter);
router.use(opportunitiesRouter);
router.use(authRouter);

export default router;
