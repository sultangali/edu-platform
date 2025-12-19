import express from 'express';
import {
  getCertificates,
  getCertificate,
  generateCertificate,
  verifyCertificate,
} from '../controllers/certificateController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/verify/:id', verifyCertificate);
router.use(protect);
router.get('/', getCertificates);
router.get('/:id', getCertificate);
router.post('/', generateCertificate);

export default router;

