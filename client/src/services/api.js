import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 30000,
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("api Error:", error.response ? error.response.data : error.message);
        return Promise.reject(error);
    }
);

export const uploadResume = (formData) => API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const searchCandidates = (query) => API.post('/upload/search', query);
export const fetchAllCandidates = () => API.get('/upload');
export const deleteCandidate = (id) => API.delete(`/upload/${id}`);

export const analyzeResume = (formData) => API.post('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export default API;