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
// import all fns 
const { 
    handleResumeUpload, 
    searchCandidates, 
    getAllCandidates,   
    deleteCandidate,    
    getCandidatePdf     
} = require('../controllers/uploadController');

//  the Map
router.post('/', upload.single('resume'), handleResumeUpload); // Upload
router.post('/search', searchCandidates);                      // Search
router.get('/', getAllCandidates);                             // Get All (For Pool)
router.delete('/:id', deleteCandidate);                        // Delete
router.get('/:id/pdf', getCandidatePdf);                       // View PDF

module.exports = router;