const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    resumeText: { type: String, required: true },
    pineconeId: { type: String, required: true },
    
    pdfData: { type: Buffer }, 
    contentType: { type: String },
    
    // structured data from ai
    structuredData: {
        skills: [String],
        education: [String],
        experience: [String],
        summary: String,
        extractionFailed: { type: Boolean, default: false }
    },
    
    groqAnalysis: {
        matchScore: { type: Number, default: 0 },
        reason: { type: String, default: "Pending result.." }
    },
    
    status: { 
        type: String, 
        enum: ['New', 'Interviewed', 'Hired', 'Rejected'],
        default: 'New' 
    },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Candidate", CandidateSchema);