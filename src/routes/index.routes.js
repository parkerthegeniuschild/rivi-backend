import express from 'express';
import FlightController from "../controllers/index.controller";

const router = express.Router();

// welcome
router.get('/', FlightController.welcome);

// ping for data using the hash
router.get('/flight', FlightController.getOne);

// search for flights
router.post('/flights', FlightController.search);

export default router;
