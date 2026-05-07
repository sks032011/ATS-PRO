const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }

        cb(null, true);
    }
});

const { analyzeResume } = require('../controllers/analyzeController');

// POST /api/analyze - analyze resume without saving
router.post('/', upload.single('resume'), analyzeResume);

module.exports = router;